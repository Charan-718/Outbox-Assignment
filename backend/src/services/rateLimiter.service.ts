import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { slackService } from './slack.service';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  nextAvailableTime?: Date;
  nextHourDelayMs?: number;
}

export class RateLimiterService {
  /**
   * Generates the current hour window key suffix, e.g. "2026-10-07T22"
   */
  getHourWindow(date: Date = new Date()): string {
    return date.toISOString().substring(0, 13);
  }

  /**
   * Calculate next hour start time and delay in milliseconds
   */
  calculateNextHourDelay(date: Date = new Date()): { nextHour: Date; delayMs: number } {
    const nextHour = new Date(date);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const delayMs = Math.max(1000, nextHour.getTime() - date.getTime());
    return { nextHour, delayMs };
  }

  /**
   * Atomically checks if the sender has exceeded their hourly limit.
   * If within limit, increments counter and returns allowed: true.
   * If limit reached, returns allowed: false and next hour delay, and dispatches Slack alert.
   */
  async checkAndIncrement(senderEmail: string, hourlyLimit: number, userId?: string): Promise<RateLimitCheckResult> {
    const now = new Date();
    const hourWindow = this.getHourWindow(now);
    const countKey = `ratelimit:count:${senderEmail}:${hourWindow}`;

    // Read current count
    const currentVal = await redisClient.get(countKey);
    const currentCount = currentVal ? parseInt(currentVal, 10) : 0;

    if (currentCount >= hourlyLimit) {
      const { nextHour, delayMs } = this.calculateNextHourDelay(now);

      // Check if Slack notification was already dispatched for this sender & hour window
      const notifiedKey = `ratelimit:notified:${senderEmail}:${hourWindow}`;
      const alreadyNotified = await redisClient.get(notifiedKey);

      if (!alreadyNotified) {
        // Mark as notified for this window (expires in 2 hours)
        await redisClient.set(notifiedKey, '1', 'EX', 7200);

        // Record RateLimitEvent in PostgreSQL
        try {
          await prisma.rateLimitEvent.create({
            data: {
              senderEmail,
              hourWindow,
              limitValue: hourlyLimit,
              slackNotified: true,
              rescheduledJobs: 1,
            },
          });
        } catch (dbErr: any) {
          console.error('[RateLimiter] Error logging rate limit event to DB:', dbErr.message);
        }

        // Dispatch live Slack alert (OAuth or Webhook)
        console.log(`[RateLimiter] [Alert] Sender ${senderEmail} reached limit of ${hourlyLimit}/hr. Triggering Slack notification.`);
        slackService.notifyRateLimitHit({
          senderEmail,
          hourlyLimit,
          currentCount,
          nextAvailableTime: nextHour,
          userId,
        }).catch((err) => {
          console.error('[RateLimiter] Slack notification failed:', err.message);
        });
      } else {
        // Increment rescheduled counter in DB if event exists
        prisma.rateLimitEvent.updateMany({
          where: { senderEmail, hourWindow },
          data: { rescheduledJobs: { increment: 1 } },
        }).catch(() => {});
      }

      return {
        allowed: false,
        currentCount,
        hourlyLimit,
        nextAvailableTime: nextHour,
        nextHourDelayMs: delayMs,
      };
    }

    // Within limit -> atomically increment
    const newCount = await redisClient.incr(countKey);
    if (newCount === 1) {
      // Set TTL to 2 hours (7200 seconds)
      await redisClient.expire(countKey, 7200);
    }

    return {
      allowed: true,
      currentCount: newCount,
      hourlyLimit,
    };
  }

  /**
   * Get current usage metrics for a sender in the current hour window
   */
  async getUsage(senderEmail: string, hourlyLimit: number): Promise<{ count: number; limit: number; remaining: number }> {
    const hourWindow = this.getHourWindow();
    const countKey = `ratelimit:count:${senderEmail}:${hourWindow}`;
    const val = await redisClient.get(countKey);
    const count = val ? parseInt(val, 10) : 0;
    return {
      count,
      limit: hourlyLimit,
      remaining: Math.max(0, hourlyLimit - count),
    };
  }

  /**
   * Reset rate limit counter for a sender (useful for testing and demoing)
   */
  async resetLimit(senderEmail: string): Promise<void> {
    const hourWindow = this.getHourWindow();
    await redisClient.del(`ratelimit:count:${senderEmail}:${hourWindow}`);
    await redisClient.del(`ratelimit:notified:${senderEmail}:${hourWindow}`);
    console.log(`[RateLimiter] Manually reset rate limit for ${senderEmail}`);
  }
}

export const rateLimiterService = new RateLimiterService();
