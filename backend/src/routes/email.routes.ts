import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { schedulerService } from '../services/scheduler.service';
import { searchService } from '../services/search.service';
import { prisma } from '../config/db';
import { emailQueue } from '../queue/emailQueue';
import { rateLimiterService } from '../services/rateLimiter.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * POST /api/emails/schedule
 * Schedule a single email
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { recipient, senderEmail, subject, body, scheduledAt, delaySeconds, hourlyLimit, userId } = req.body;

    if (!recipient || !senderEmail || !subject || !body || !scheduledAt) {
      return res.status(400).json({ error: 'Missing required scheduling fields' });
    }

    const job = await schedulerService.scheduleEmail({
      recipient,
      senderEmail,
      subject,
      body,
      scheduledAt,
      delaySeconds: delaySeconds ? parseInt(delaySeconds, 10) : 2,
      hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 50,
      userId,
    });

    return res.status(201).json({ success: true, job });
  } catch (err: any) {
    console.error('[API] /schedule error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/schedule-batch
 * Batch schedule emails (e.g. from uploaded leads)
 */
router.post('/schedule-batch', async (req: Request, res: Response) => {
  try {
    const { recipients, senderEmail, subject, body, startTime, delayBetweenEmailsSeconds, hourlyLimit, userId } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients must be a non-empty array' });
    }

    if (!senderEmail || !subject || !body || !startTime) {
      return res.status(400).json({ error: 'Missing required campaign fields' });
    }

    const result = await schedulerService.scheduleBatch({
      recipients,
      senderEmail,
      subject,
      body,
      startTime,
      delayBetweenEmailsSeconds: delayBetweenEmailsSeconds ? parseInt(delayBetweenEmailsSeconds, 10) : 2,
      hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 50,
      userId,
    });

    return res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API] /schedule-batch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/upload-csv
 * Parse CSV or text file and extract email leads
 */
router.post('/upload-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf-8');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex) || [];

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));

    return res.json({
      success: true,
      filename: req.file.originalname,
      count: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (err: any) {
    console.error('[API] /upload-csv error:', err.message);
    return res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

/**
 * GET /api/emails/scheduled
 * Retrieve all currently scheduled emails
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const { userId, limit = '100', offset = '0' } = req.query;

    const where: any = {
      status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING'] },
    };
    if (userId) where.userId = String(userId);

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: parseInt(String(offset), 10),
        take: parseInt(String(limit), 10),
      }),
    ]);

    return res.json({ emails, total });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/sent
 * Retrieve all sent or failed emails
 */
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const { userId, limit = '100', offset = '0' } = req.query;

    const where: any = {
      status: { in: ['SENT', 'FAILED'] },
    };
    if (userId) where.userId = String(userId);

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: parseInt(String(offset), 10),
        take: parseInt(String(limit), 10),
      }),
    ]);

    return res.json({ emails, total });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/search
 * Full-text search powered by Elasticsearch
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q = '', status, userId, limit = '50', offset = '0' } = req.query;

    const result = await searchService.searchEmails({
      query: String(q),
      status: status ? String(status) : undefined,
      userId: userId ? String(userId) : undefined,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/emails/:id
 * Cancel / delete scheduled email
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await schedulerService.cancelEmail(id);
    return res.json({ success: true, message: 'Email job cancelled successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/emails/stats
 * Dashboard overview metrics & BullMQ queue statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [scheduledCount, sentCount, failedCount, rateLimitedCount] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'RATE_LIMITED' } }),
    ]);

    const queueCounts = await emailQueue.getJobCounts('delayed', 'waiting', 'active', 'completed', 'failed');

    return res.json({
      database: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rateLimited: rateLimitedCount,
        total: scheduledCount + sentCount + failedCount + rateLimitedCount,
      },
      queue: queueCounts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/reset-rate-limit
 * Reset rate limit counter for a sender (developer / reviewer utility)
 */
router.post('/reset-rate-limit', async (req: Request, res: Response) => {
  try {
    const { senderEmail } = req.body;
    if (!senderEmail) {
      return res.status(400).json({ error: 'senderEmail is required' });
    }

    await rateLimiterService.resetLimit(senderEmail);
    return res.json({ success: true, message: `Rate limit reset for ${senderEmail}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
