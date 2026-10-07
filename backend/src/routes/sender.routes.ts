import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { rateLimiterService } from '../services/rateLimiter.service';
import { config } from '../config/env';

const router = Router();

/**
 * GET /api/senders
 * List available senders and their current hourly rate limit usage
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let senders = await prisma.sender.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Seed default senders if none exist
    if (senders.length === 0) {
      senders = await prisma.$transaction([
        prisma.sender.create({
          data: {
            email: 'sales@reachinbox.ai',
            name: 'Growth & Outreach',
            hourlyLimit: config.worker.defaultHourlyLimit,
          },
        }),
        prisma.sender.create({
          data: {
            email: 'partnerships@reachinbox.ai',
            name: 'Enterprise Partnerships',
            hourlyLimit: 100,
          },
        }),
        prisma.sender.create({
          data: {
            email: 'founder@reachinbox.ai',
            name: 'Founder Office',
            hourlyLimit: 20,
          },
        }),
      ]);
    }

    // Attach real-time Redis hourly usage metrics
    const sendersWithUsage = await Promise.all(
      senders.map(async (sender) => {
        const usage = await rateLimiterService.getUsage(sender.email, sender.hourlyLimit);
        return {
          ...sender,
          usage,
        };
      })
    );

    return res.json({ senders: sendersWithUsage });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/senders
 * Add a new sender
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, hourlyLimit } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const sender = await prisma.sender.upsert({
      where: { email },
      update: {
        name,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : config.worker.defaultHourlyLimit,
      },
      create: {
        email,
        name,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : config.worker.defaultHourlyLimit,
      },
    });

    return res.status(201).json({ success: true, sender });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
