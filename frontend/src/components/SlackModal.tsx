import React, { useState } from 'react';
import { SlackStatus } from '../types';
import { slackApi } from '../services/api';
import { X, MessageSquare, CheckCircle2, AlertCircle, Send, ExternalLink, Trash2, Loader2 } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus;
  onStatusChange: () => void;
  userId?: string;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusChange,
  userId,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleConnectWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://hooks.slack.com')) {
      setMessage({ text: 'Please enter a valid Slack Incoming Webhook URL', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await slackApi.connectWebhook(webhookUrl.trim(), userId, channel);
      setMessage({ text: 'Slack webhook connected. Rate limit events will notify your channel.', type: 'success' });
      onStatusChange();
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.error || err.message || 'Failed to connect Slack', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    setMessage(null);

    try {
      const res = await slackApi.sendTestAlert('sales@reachinbox.ai', userId);
      setMessage({ text: res.message || 'Live test alert sent to Slack successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.error || err.message || 'Failed to send test alert', type: 'error' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await slackApi.disconnect(userId);
      setMessage({ text: 'Slack disconnected. Rate limit alerts safely skipped.', type: 'success' });
      setWebhookUrl('');
      onStatusChange();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-lg rounded-xl bg-surface-card border border-surface-border shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3.5 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-300">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Slack Notifications</h2>
              <p className="text-[11px] text-slate-400">Automated alerts on hourly sender rate limit breach</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-lg border mb-4 flex items-center justify-between text-xs ${
          status.isConnected
            ? 'bg-surface-elevated border-surface-border text-slate-200'
            : 'bg-surface border-surface-border text-slate-400'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <div>
              <p className="font-medium text-slate-200">
                {status.isConnected ? 'Slack Connected' : 'Not Connected'}
              </p>
              <p className="text-[11px] text-slate-400">
                {status.isConnected
                  ? `Active for channel ${status.channel || 'configured channel'}`
                  : 'Rate-limit hits will safely skip notification without errors.'}
              </p>
            </div>
          </div>

          {status.isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-2 py-1 rounded bg-surface hover:bg-surface-hover text-rose-400 border border-surface-border text-[11px] transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-4 p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Webhook Connection Form */}
        <form onSubmit={handleConnectWebhook} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Slack Incoming Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 font-mono text-[11px]"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Alert Channel
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#email-alerts"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save & Connect'}
            </button>

            {status.isConnected && (
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testLoading}
                className="py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-surface-border font-medium transition-colors flex items-center space-x-1.5"
                title="Send test alert to Slack"
              >
                {testLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-slate-400" />}
                <span>Test Alert</span>
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-slate-500">
          <span>Live verifiable alert flow</span>
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
          >
            <span>Slack App Settings</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
