import { prisma } from '../config/db';
import { emailQueue, EmailJobData } from '../queue/emailQueue';
import { searchService } from './search.service';
import { config } from '../config/env';

export interface ScheduleEmailInput {
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date | string;
  delaySeconds?: number;
  hourlyLimit?: number;
  userId?: string;
}

export interface BatchScheduleInput {
  recipients: string[];
  senderEmail: string;
  subject: string;
  body: string;
  startTime: Date | string;
  delayBetweenEmailsSeconds?: number;
  hourlyLimit?: number;
  userId?: string;
}

export class SchedulerService {
  /**
   * Schedule a single email with a specific scheduledAt timestamp using BullMQ delayed jobs
   */
  async scheduleEmail(input: ScheduleEmailInput) {
    const scheduledDate = new Date(input.scheduledAt);
    const delaySeconds = input.delaySeconds || 2;
    const hourlyLimit = input.hourlyLimit || config.worker.defaultHourlyLimit;

    // 1. Create DB record
    const emailJob = await prisma.emailJob.create({
      data: {
        recipient: input.recipient.trim(),
        senderEmail: input.senderEmail.trim(),
        subject: input.subject,
        body: input.body,
        scheduledAt: scheduledDate,
        status: 'SCHEDULED',
        delaySeconds,
        hourlyLimit,
        userId: input.userId,
      },
    });

    // 2. Calculate initial BullMQ delay in ms
    const initialDelayMs = Math.max(0, scheduledDate.getTime() - Date.now());
    const bullJobId = `email-job-${emailJob.id}`;

    // 3. Add to BullMQ delayed queue (No cron!)
    await emailQueue.add(
      'send-email',
      {
        emailJobId: emailJob.id,
        recipient: emailJob.recipient,
        senderEmail: emailJob.senderEmail,
        subject: emailJob.subject,
        body: emailJob.body,
        hourlyLimit: emailJob.hourlyLimit,
        delaySeconds: emailJob.delaySeconds,
        userId: emailJob.userId || undefined,
      },
      {
        delay: initialDelayMs,
        jobId: bullJobId,
      }
    );

    // Update DB with bullJobId
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId },
    });

    // 4. Index in Elasticsearch
    await searchService.indexEmail(updatedJob);

    return updatedJob;
  }

  /**
   * Batch schedule multiple leads (from CSV / bulk list), staging their delays safely
   */
  async scheduleBatch(input: BatchScheduleInput) {
    const baseStartTime = new Date(input.startTime).getTime();
    const delaySec = input.delayBetweenEmailsSeconds || 2;
    const hourlyLimit = input.hourlyLimit || config.worker.defaultHourlyLimit;
    const senderEmail = input.senderEmail.trim();

    // Deduplicate & clean emails
    const uniqueRecipients = Array.from(
      new Set(
        input.recipients
          .map((r) => r.trim().toLowerCase())
          .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))
      )
    );

    if (uniqueRecipients.length === 0) {
      throw new Error('No valid recipient email addresses found');
    }

    const createdJobs: any[] = [];
    const bullJobsPayload: any[] = [];

    // Create DB records in transaction or chunks
    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      // Stagger each email's scheduled start time by delaySec
      const scheduledTimeMs = Math.max(Date.now(), baseStartTime + i * delaySec * 1000);
      const scheduledAt = new Date(scheduledTimeMs);

      const dbJob = await prisma.emailJob.create({
        data: {
          recipient,
          senderEmail,
          subject: input.subject,
          body: input.body,
          scheduledAt,
          status: 'SCHEDULED',
          delaySeconds: delaySec,
          hourlyLimit,
          userId: input.userId,
        },
      });

      const bullJobId = `email-job-${dbJob.id}`;
      createdJobs.push({ ...dbJob, bullJobId });

      const delayMs = Math.max(0, scheduledTimeMs - Date.now());
      bullJobsPayload.push({
        name: 'send-email',
        data: {
          emailJobId: dbJob.id,
          recipient: dbJob.recipient,
          senderEmail: dbJob.senderEmail,
          subject: dbJob.subject,
          body: dbJob.body,
          hourlyLimit: dbJob.hourlyLimit,
          delaySeconds: dbJob.delaySeconds,
          userId: dbJob.userId || undefined,
        },
        opts: {
          delay: delayMs,
          jobId: bullJobId,
        },
      });
    }

    // Add in bulk to BullMQ
    await emailQueue.addBulk(bullJobsPayload);

    // Bulk index to Elasticsearch
    await searchService.bulkIndexEmails(createdJobs);

    return {
      scheduledCount: createdJobs.length,
      jobs: createdJobs,
    };
  }

  /**
   * Cancel / delete a scheduled email
   */
  async cancelEmail(id: string) {
    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) throw new Error('Job not found');

    if (job.status === 'SENT') {
      throw new Error('Cannot cancel an already sent email');
    }

    // Remove from BullMQ if present
    if (job.bullJobId) {
      const bullJob = await emailQueue.getJob(job.bullJobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }

    // Delete or mark cancelled
    await prisma.emailJob.delete({ where: { id } });
    await searchService.deleteIndexedEmail(id);

    return { success: true };
  }

  /**
   * Server Restart Reconciliation Service:
   * Runs on server boot. Inspects PostgreSQL for any SCHEDULED or RATE_LIMITED jobs.
   * If a job is not found in BullMQ, re-enqueues it with the proper remaining delay.
   * Preserves strict idempotency - never touches SENT jobs.
   */
  async reconcileOnStartup(): Promise<void> {
    console.log('[Reconciliation] Checking for pending scheduled jobs after server restart...');

    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    console.log(`[Reconciliation] Found ${pendingJobs.length} pending jobs in database.`);

    let reconciledCount = 0;

    for (const job of pendingJobs) {
      const expectedBullId = job.bullJobId || `email-job-${job.id}`;
      const existingBullJob = await emailQueue.getJob(expectedBullId);

      if (!existingBullJob) {
        // Calculate remaining delay from current time
        const remainingDelayMs = Math.max(0, new Date(job.scheduledAt).getTime() - Date.now());

        await emailQueue.add(
          'send-email',
          {
            emailJobId: job.id,
            recipient: job.recipient,
            senderEmail: job.senderEmail,
            subject: job.subject,
            body: job.body,
            hourlyLimit: job.hourlyLimit,
            delaySeconds: job.delaySeconds,
            userId: job.userId || undefined,
          },
          {
            delay: remainingDelayMs,
            jobId: expectedBullId,
          }
        );

        reconciledCount++;
      }
    }

    console.log(`[Reconciliation] Successfully reconciled ${reconciledCount} jobs back into BullMQ delayed queue.`);
  }
}

export const schedulerService = new SchedulerService();
