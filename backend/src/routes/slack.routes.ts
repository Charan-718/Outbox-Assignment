import { Router, Request, Response } from 'express';
import axios from 'axios';
import { slackService } from '../services/slack.service';
import { config } from '../config/env';

const router = Router();

/**
 * POST /api/slack/connect
 * Connect via Incoming Webhook URL or stored configuration
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { userId = 'default-user', webhookUrl, channel, accessToken, teamName } = req.body;

    if (!webhookUrl && !accessToken) {
      return res.status(400).json({ error: 'Either webhookUrl or accessToken is required' });
    }

    const integration = await slackService.saveIntegration(userId, {
      webhookUrl,
      channel,
      accessToken,
      teamName,
    });

    return res.json({ success: true, integration });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/slack/oauth/callback
 * Real OAuth 2.0 flow with Slack App
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    if (!config.slack.clientId || !config.slack.clientSecret) {
      return res.status(400).send('Slack client ID or secret not configured in .env');
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      null,
      {
        params: {
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code: String(code),
          redirect_uri: config.slack.redirectUri,
        },
      }
    );

    const data = tokenResponse.data;

    if (!data.ok) {
      return res.status(400).json({ error: 'Slack OAuth failed: ' + data.error });
    }

    const userId = (state ? String(state) : 'default-user');

    await slackService.saveIntegration(userId, {
      accessToken: data.access_token,
      channel: data.incoming_webhook?.channel || data.authed_user?.id,
      webhookUrl: data.incoming_webhook?.url,
      teamName: data.team?.name,
    });

    // Redirect to frontend
    return res.redirect(`${config.clientUrl}/?slack=connected`);
  } catch (err: any) {
    console.error('[Slack OAuth] Callback error:', err.message);
    return res.redirect(`${config.clientUrl}/?slack=error&message=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/slack/status
 * Check Slack integration status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default-user';
    const integration = await slackService.getIntegration(userId);

    return res.json({
      isConnected: !!(integration && integration.isConnected),
      channel: integration?.channel || null,
      teamName: integration?.teamName || null,
      hasWebhook: !!integration?.webhookUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnect Slack integration
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || 'default-user';
    await slackService.disconnect(userId);
    return res.json({ success: true, message: 'Slack disconnected' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/slack/test
 * Send a verifiable test alert to user's Slack
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { userId = 'default-user', senderEmail = 'test-sender@reachinbox.ai' } = req.body;
    const sent = await slackService.notifyRateLimitHit({
      senderEmail,
      hourlyLimit: 50,
      currentCount: 50,
      nextAvailableTime: new Date(Date.now() + 3600000),
      userId,
    });

    if (!sent) {
      return res.status(400).json({
        success: false,
        error: 'Slack is not connected or failed to receive notification. Connect via Webhook or OAuth first.',
      });
    }

    return res.json({ success: true, message: 'Live rate limit notification sent to Slack!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
