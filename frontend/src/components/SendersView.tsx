import React, { useState } from 'react';
import { Sender } from '../types';
import { senderApi, emailApi } from '../services/api';
import { RotateCcw, Plus, Check, Mail, Shield, UserCheck } from 'lucide-react';

interface SendersViewProps {
  senders: Sender[];
  onRefresh: () => void;
}

export const SendersView: React.FC<SendersViewProps> = ({ senders, onRefresh }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) return;

    setLoading(true);
    try {
      await senderApi.create({
        email: newEmail.trim(),
        name: newName.trim() || undefined,
        hourlyLimit: newLimit,
      });
      setNewEmail('');
      setNewName('');
      setNewLimit(50);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetLimit = async (email: string) => {
    try {
      await emailApi.resetRateLimit(email);
      setResetMessage(`Reset hourly rate limit counter for ${email}`);
      setTimeout(() => setResetMessage(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      {resetMessage && (
        <div className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border text-slate-200 text-xs flex items-center space-x-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Senders List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {senders.map((sender) => {
          const usageCount = sender.usage?.count || 0;
          const limit = sender.usage?.limit || sender.hourlyLimit || 50;
          const percent = Math.min(100, Math.round((usageCount / limit) * 100));
          const isNearLimit = percent >= 80;

          return (
            <div
              key={sender.id}
              className="rounded-xl border border-surface-border bg-surface p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-slate-200 text-xs">{sender.name || 'Mailbox'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-slate-400 font-mono border border-surface-border">
                    {limit}/hr
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mb-4 truncate">{sender.email}</p>

                {/* Meter */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Usage (current hr):</span>
                    <span className="font-mono text-slate-200">
                      {usageCount} / {limit}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-surface-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isNearLimit ? 'bg-amber-400' : 'bg-slate-300'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  {sender.usage?.remaining ?? limit} remaining
                </span>
                <button
                  onClick={() => handleResetLimit(sender.email)}
                  className="px-2 py-1 rounded bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-surface-border text-[11px] font-medium transition-colors flex items-center space-x-1"
                  title="Reset counter in Redis"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Sender Form */}
      <div className="rounded-xl border border-surface-border bg-surface p-4">
        <h3 className="text-xs font-semibold text-slate-200 mb-3 flex items-center space-x-2">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          <span>Add Sending Mailbox</span>
        </h3>
        <form onSubmit={handleCreateSender} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="mailbox@domain.com"
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
            required
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Account Label"
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
          <input
            type="number"
            min={1}
            max={500}
            value={newLimit}
            onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 50)}
            placeholder="Hourly Limit"
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-3.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium transition-colors flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Mailbox</span>
          </button>
        </form>
      </div>
    </div>
  );
};
