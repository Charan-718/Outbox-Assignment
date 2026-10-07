import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { sendEmail } from '../services/smtp.service';
import { rateLimiterService } from '../services/rateLimiter.service';
import { searchService } from '../services/search.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId, recipient, senderEmail, subject, body, hourlyLimit, delaySeconds, userId } = job.data;

      console.log(`[Worker] [Job ${job.id}] Processing email for ${recipient} from ${senderEmail}...`);

      // 1. Idempotency Check in Database
      const existingRecord = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
      });

      if (!existingRecord) {
        console.warn(`[Worker] [Job ${job.id}] Record ${emailJobId} not found in database. Skipping.`);
        return { status: 'skipped', reason: 'not_found' };
      }

      if (existingRecord.status === 'SENT') {
        console.log(`[Worker] [Job ${job.id}] Record ${emailJobId} is already marked as SENT. Idempotency preserved.`);
        return { status: 'skipped', reason: 'already_sent' };
      }

      // 2. Minimum Delay Between Each Email Send (mimic provider throttling)
      const minimumThrottleDelay = Math.max(
        config.worker.minDelayBetweenEmailsMs,
        (delaySeconds || 2) * 1000
      );
      if (minimumThrottleDelay > 0) {
        await sleep(minimumThrottleDelay);
      }

      // 3. Hourly Rate Limit Check (per-sender Redis-backed sliding window counter)
      const effectiveHourlyLimit = hourlyLimit || config.worker.defaultHourlyLimit;
      const rateLimitCheck = await rateLimiterService.checkAndIncrement(
        senderEmail,
        effectiveHourlyLimit,
        userId
      );

      if (!rateLimitCheck.allowed) {
        console.warn(
          `[Worker] [Job ${job.id}] Rate limit exceeded for sender "${senderEmail}" (${rateLimitCheck.currentCount}/${effectiveHourlyLimit} sent this hour).`
        );

        const rescheduleDelayMs = rateLimitCheck.nextHourDelayMs || 3600000;
        const newScheduledAt = rateLimitCheck.nextAvailableTime || new Date(Date.now() + rescheduleDelayMs);

        // Update DB status to RATE_LIMITED / rescheduled
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: newScheduledAt,
            errorMessage: `Hourly rate limit of ${effectiveHourlyLimit} reached. Rescheduled to next hour window.`,
          },
        });

        // Update Elasticsearch
        await searchService.indexEmail(updatedJob);

        // Reschedule job in BullMQ for next available hour window
        await emailQueue.add(
          'send-email',
          { ...job.data },
          {
            delay: rescheduleDelayMs,
            jobId: `email-job-${emailJobId}-retry-${Date.now()}`,
          }
        );

        console.log(
          `[Worker] [Job ${job.id}] Rescheduled email ${emailJobId} for ${newScheduledAt.toISOString()} (in ${Math.round(
            rescheduleDelayMs / 1000
          )}s).`
        );

        return {
          status: 'rate_limited_rescheduled',
          rescheduledTo: newScheduledAt,
        };
      }

      // 4. Send Email via Ethereal Fake SMTP
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'PROCESSING' },
      });

      try {
        const { messageId, previewUrl } = await sendEmail({
          from: senderEmail,
          to: recipient,
          subject,
          html: body,
        });

        // 5. Update Database as SENT
        const sentRecord = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealMessageId: messageId,
            etherealPreviewUrl: previewUrl || null,
            errorMessage: null,
          },
        });

        // 6. Update Elasticsearch index
        await searchService.indexEmail(sentRecord);

        console.log(`[Worker] [Job ${job.id}] Successfully sent email to ${recipient}! Ethereal preview: ${previewUrl}`);

        return {
          status: 'sent',
          messageId,
          previewUrl,
        };
      } catch (sendError: any) {
        console.error(`[Worker] [Job ${job.id}] Failed to send email to ${recipient}:`, sendError.message);

        const failedRecord = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message,
            retryCount: { increment: 1 },
          },
        });

        await searchService.indexEmail(failedRecord);
        throw sendError;
      }
    },
    {
      connection: redisClient,
      concurrency: config.worker.concurrency,
      limiter: {
        max: 50,
        duration: 1000, // safety BullMQ limiter
      },
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err: Error) => {
    console.error(`[Worker] Worker error: ${err.message}`);
  });

  return worker;
}
