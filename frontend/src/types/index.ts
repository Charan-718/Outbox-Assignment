export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface EmailJob {
  id: string;
  userId?: string | null;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  bullJobId?: string | null;
  sentAt?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  etherealMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  email: string;
  name?: string;
  hourlyLimit: number;
  isActive: boolean;
  usage?: {
    count: number;
    limit: number;
    remaining: number;
  };
}

export interface SystemStats {
  database: {
    scheduled: number;
    sent: number;
    failed: number;
    rateLimited: number;
    total: number;
  };
  queue: {
    delayed: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface SlackStatus {
  isConnected: boolean;
  channel?: string | null;
  teamName?: string | null;
  hasWebhook?: boolean;
}
