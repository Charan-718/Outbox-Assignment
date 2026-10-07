import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';

export interface EmailJobData {
  emailJobId: string;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delaySeconds: number;
  userId?: string;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 2000,
      age: 24 * 3600, // keep 24 hours
    },
    removeOnFail: {
      count: 2000,
      age: 48 * 3600, // keep 48 hours
    },
  },
});

console.log(`[BullMQ] Queue "${EMAIL_QUEUE_NAME}" initialized`);
