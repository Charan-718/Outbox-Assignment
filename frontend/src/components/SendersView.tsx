import React, { useState } from 'react';
import { Sender } from '../types';
import { senderApi, emailApi } from '../services/api';
import { Shield, RotateCcw, Plus, Check, Mail, UserCheck } from 'lucide-react';

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
    <div className="space-y-6">
      {resetMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Senders List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {senders.map((sender) => {
          const usageCount = sender.usage?.count || 0;
          const limit = sender.usage?.limit || sender.hourlyLimit || 50;
          const percent = Math.min(100, Math.round((usageCount / limit) * 100));
          const isNearLimit = percent >= 80;

          return (
            <div
              key={sender.id}
              className="rounded-xl border border-dark-700 bg-dark-850/60 p-4 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-100 text-xs">{sender.name || 'Sender Account'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-750 text-slate-400 font-mono">
                    Limit: {limit}/hr
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mb-4">{sender.email}</p>

                {/* Meter */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Current Hour Sends:</span>
                    <span className={isNearLimit ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                      {usageCount} / {limit}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-dark-750 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  {sender.usage?.remaining ?? limit} remaining this hr
                </span>
                <button
                  onClick={() => handleResetLimit(sender.email)}
                  className="px-2.5 py-1 rounded bg-dark-750 hover:bg-dark-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center space-x-1"
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
      <div className="rounded-xl border border-dark-700 bg-dark-850/40 p-5">
        <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-blue-400" />
          <span>Add Custom Sending Mailbox</span>
        </h3>
        <form onSubmit={handleCreateSender} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="sender@domain.com"
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Account Label (e.g. Inbound)"
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            min={1}
            max={500}
            value={newLimit}
            onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 50)}
            placeholder="Hourly Limit"
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center justify-center space-x-1 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sender</span>
          </button>
        </form>
      </div>
    </div>
  );
};
