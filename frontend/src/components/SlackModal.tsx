import React, { useState } from 'react';
import { SlackStatus } from '../types';
import { slackApi } from '../services/api';
import { X, MessageSquare, CheckCircle2, AlertCircle, Send, Link, Trash2 } from 'lucide-react';

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
      setMessage({ text: 'Please enter a valid Slack Incoming Webhook URL (starts with https://hooks.slack.com)', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await slackApi.connectWebhook(webhookUrl.trim(), userId, channel);
      setMessage({ text: 'Slack connected successfully! Rate limit events will now alert your channel.', type: 'success' });
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
      setMessage({ text: res.message || 'Live test alert sent to Slack successfully! Check your channel.', type: 'success' });
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
      setMessage({ text: 'Slack disconnected. Rate limit alerts will safely skip without errors.', type: 'success' });
      setWebhookUrl('');
      onStatusChange();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#4A154B]/30 text-[#E01E5A] border border-[#E01E5A]/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Slack Rate Limit Alerts</h2>
              <p className="text-xs text-slate-400">Live notification when sender hourly threshold triggers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-750 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-3.5 rounded-xl border mb-4 flex items-center justify-between text-xs ${
          status.isConnected
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            : 'bg-dark-800 border-dark-750 text-slate-300'
        }`}>
          <div className="flex items-center space-x-2">
            {status.isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {status.isConnected ? 'Slack Integration Active' : 'Slack Not Connected'}
              </p>
              <p className="text-[11px] opacity-80">
                {status.isConnected
                  ? `Live alerts active for ${status.channel || 'designated channel'}`
                  : 'Rate-limit hits will safely skip notifications without crashing.'}
              </p>
            </div>
          </div>

          {status.isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Webhook Connection Form */}
        <form onSubmit={handleConnectWebhook} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Slack Incoming Webhook URL *
            </label>
            <div className="relative">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                className="w-full px-3.5 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Paste a Slack Webhook URL from your Slack App / Workflow builder.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Alert Channel / Tag
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#email-scheduler-alerts"
              className="w-full px-3.5 py-2 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Saving Integration...' : 'Save & Connect Slack'}
            </button>

            {status.isConnected && (
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testLoading}
                className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                title="Send immediate verifiable test alert"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Sending...' : 'Test Alert'}</span>
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-dark-700 flex items-center justify-between text-[11px] text-slate-400">
          <span>Live verifiable demo call as required</span>
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>Slack App Settings</span>
            <Link className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
