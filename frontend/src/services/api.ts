import axios from 'axios';
import { EmailJob, Sender, SystemStats, SlackStatus, User } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  loginWithGoogle: async (credential: string): Promise<User> => {
    const res = await api.post('/auth/google', { credential });
    return res.data.user;
  },
  loginDemo: async (): Promise<User> => {
    const res = await api.post('/auth/demo');
    return res.data.user;
  },
};

export const emailApi = {
  schedule: async (data: {
    recipient: string;
    senderEmail: string;
    subject: string;
    body: string;
    scheduledAt: string;
    delaySeconds?: number;
    hourlyLimit?: number;
    userId?: string;
  }): Promise<EmailJob> => {
    const res = await api.post('/emails/schedule', data);
    return res.data.job;
  },

  scheduleBatch: async (data: {
    recipients: string[];
    senderEmail: string;
    subject: string;
    body: string;
    startTime: string;
    delayBetweenEmailsSeconds?: number;
    hourlyLimit?: number;
    userId?: string;
  }): Promise<{ scheduledCount: number; jobs: EmailJob[] }> => {
    const res = await api.post('/emails/schedule-batch', data);
    return res.data;
  },

  uploadCsv: async (file: File): Promise<{ count: number; emails: string[]; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/emails/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getScheduled: async (userId?: string): Promise<{ emails: EmailJob[]; total: number }> => {
    const res = await api.get('/emails/scheduled', { params: { userId } });
    return res.data;
  },

  getSent: async (userId?: string): Promise<{ emails: EmailJob[]; total: number }> => {
    const res = await api.get('/emails/sent', { params: { userId } });
    return res.data;
  },

  search: async (params: { q?: string; status?: string; userId?: string }): Promise<{ emails: EmailJob[]; total: number; source: 'elasticsearch' | 'database' }> => {
    const res = await api.get('/emails/search', { params });
    return res.data;
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/emails/${id}`);
  },

  getStats: async (): Promise<SystemStats> => {
    const res = await api.get('/emails/stats');
    return res.data;
  },

  resetRateLimit: async (senderEmail: string): Promise<void> => {
    await api.post('/emails/reset-rate-limit', { senderEmail });
  },
};

export const senderApi = {
  getAll: async (): Promise<Sender[]> => {
    const res = await api.get('/senders');
    return res.data.senders;
  },
  create: async (data: { email: string; name?: string; hourlyLimit?: number }): Promise<Sender> => {
    const res = await api.post('/senders', data);
    return res.data.sender;
  },
};

export const slackApi = {
  getStatus: async (userId?: string): Promise<SlackStatus> => {
    const res = await api.get('/slack/status', { params: { userId } });
    return res.data;
  },
  connectWebhook: async (webhookUrl: string, userId?: string, channel?: string) => {
    const res = await api.post('/slack/connect', { webhookUrl, userId, channel });
    return res.data;
  },
  disconnect: async (userId?: string) => {
    const res = await api.post('/slack/disconnect', { userId });
    return res.data;
  },
  sendTestAlert: async (senderEmail: string, userId?: string) => {
    const res = await api.post('/slack/test', { senderEmail, userId });
    return res.data;
  },
};

export default api;
