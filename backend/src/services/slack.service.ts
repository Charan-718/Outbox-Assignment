import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config/env';

export class SlackService {
  /**
   * Save or update Slack integration for a user/tenant
   */
  async saveIntegration(userId: string, data: { webhookUrl?: string; accessToken?: string; channel?: string; teamName?: string }) {
    return prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        ...data,
        isConnected: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        webhookUrl: data.webhookUrl,
        accessToken: data.accessToken,
        channel: data.channel,
        teamName: data.teamName,
        isConnected: true,
      },
    });
  }

  /**
   * Disconnect Slack for a user/tenant
   */
  async disconnect(userId: string) {
    return prisma.slackIntegration.updateMany({
      where: { userId },
      data: { isConnected: false },
    });
  }

  /**
   * Get integration status for a user
   */
  async getIntegration(userId: string) {
    return prisma.slackIntegration.findUnique({
      where: { userId },
    });
  }

  /**
   * Notify Slack when a sender hits the hourly rate limit.
   * If Slack is not connected, gracefully logs and returns without crashing.
   */
  async notifyRateLimitHit(params: {
    senderEmail: string;
    hourlyLimit: number;
    currentCount: number;
    nextAvailableTime: Date;
    userId?: string;
  }): Promise<boolean> {
    try {
      // Find connected Slack integration
      // If userId provided, check that; otherwise find any active integration or global webhook
      let integration = params.userId
        ? await prisma.slackIntegration.findFirst({ where: { userId: params.userId, isConnected: true } })
        : await prisma.slackIntegration.findFirst({ where: { isConnected: true } });

      if (!integration || (!integration.webhookUrl && !integration.accessToken)) {
        console.log(`[Slack] No connected Slack integration found for sender ${params.senderEmail}. Skipping notification.`);
        return false;
      }

      const formattedNextTime = params.nextAvailableTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const slackPayload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Email Scheduler: Hourly Rate Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n\`${params.senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n*${params.hourlyLimit} emails/hr*`,
              },
              {
                type: 'mrkdwn',
                text: `*Emails Sent This Hour:*\n*${params.currentCount}*`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Sending Window:*\n*${formattedNextTime}*`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🛡️ *Automatic Throttling Active*: Excess jobs have been safely rescheduled into the next hour window preserving queue order. No emails were dropped.',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⚡ ReachInbox Production Scheduler | Triggered at ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      };

      if (integration.webhookUrl) {
        console.log(`[Slack] Sending rate limit alert to webhook for sender ${params.senderEmail}...`);
        await axios.post(integration.webhookUrl, slackPayload, { timeout: 8000 });
        console.log(`[Slack] Live rate limit notification sent successfully!`);
        return true;
      }

      if (integration.accessToken && integration.channel) {
        console.log(`[Slack] Sending rate limit alert via Web API to channel ${integration.channel}...`);
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: integration.channel,
            ...slackPayload,
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          }
        );
        console.log(`[Slack] Live rate limit notification sent successfully via Web API!`);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error(`[Slack] Error sending rate limit notification:`, err?.response?.data || err.message);
      return false;
    }
  }
}

export const slackService = new SlackService();
