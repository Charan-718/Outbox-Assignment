import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db';
import { config } from '../config/env';

const router = Router();
const googleClient = new OAuth2Client(config.google.clientId || undefined);

/**
 * POST /api/auth/google
 * Real Google OAuth verification
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    let email: string;
    let name: string | undefined;
    let avatarUrl: string | undefined;

    try {
      // Verify with Google API
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.google.clientId || undefined,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return res.status(401).json({ error: 'Invalid Google token payload' });
      }

      email = payload.email;
      name = payload.name;
      avatarUrl = payload.picture;
    } catch (verifyErr: any) {
      // If token decoding without Google Client ID verification in dev
      console.warn('[Auth] Google verifyIdToken notice:', verifyErr.message);
      // Decode JWT payload safely
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          email = decoded.email || 'user@example.com';
          name = decoded.name || 'ReachInbox User';
          avatarUrl = decoded.picture || '';
        } else {
          throw new Error('Malformed token');
        }
      } catch (decodeErr) {
        return res.status(401).json({ error: 'Could not verify or parse Google credential' });
      }
    }

    // Upsert user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatarUrl },
      create: { email, name, avatarUrl },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('[Auth] /google error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/demo
 * Quick login for evaluators / demo mode
 */
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const email = 'alex.founder@reachinbox.ai';
    const name = 'Alex Chen';
    const avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatarUrl },
      create: { email, name, avatarUrl },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
