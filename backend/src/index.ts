import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { connectDB } from './config/db';
import { initElasticsearch } from './config/elasticsearch';
import { getTransporter } from './services/smtp.service';
import { createEmailWorker } from './queue/emailWorker';
import { serverAdapter } from './queue/bullBoard';
import { schedulerService } from './services/scheduler.service';
import { redisClient } from './config/redis';

import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import authRoutes from './routes/auth.routes';
import senderRoutes from './routes/sender.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Bull Board UI for live queue visibility
app.use('/admin/queues', serverAdapter.getRouter());

// Application API routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-email-scheduler',
    workerConcurrency: config.worker.concurrency,
    minDelayMs: config.worker.minDelayBetweenEmailsMs,
  });
});

let worker: any = null;

async function bootstrap() {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 Starting ReachInbox Production Email Scheduler...');
    console.log('----------------------------------------------------');

    // 1. Connect to PostgreSQL
    await connectDB();

    // 2. Initialize Elasticsearch index
    await initElasticsearch();

    // 3. Initialize fake SMTP with Ethereal Email
    await getTransporter();

    // 4. Start BullMQ Email Worker
    worker = createEmailWorker();
    console.log(`[Worker] Started with concurrency = ${config.worker.concurrency}`);

    // 5. Run Server Restart Reconciliation (Survives restarts without losing or duplicating jobs)
    await schedulerService.reconcileOnStartup();

    // 6. Start HTTP Server
    const server = app.listen(config.port, () => {
      console.log(`----------------------------------------------------`);
      console.log(`✅ Server running on http://localhost:${config.port}`);
      console.log(`📊 BullMQ Live Dashboard: http://localhost:${config.port}/admin/queues`);
      console.log(`🔎 Elasticsearch search & indexing ready`);
      console.log(`----------------------------------------------------`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        if (worker) {
          console.log('[Worker] Closing worker...');
          await worker.close();
        }
        await redisClient.quit();
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
