import React from 'react';
import { SystemStats } from '../types';
import { Clock, Send, ShieldAlert, Cpu } from 'lucide-react';

interface StatsCardsProps {
  stats: SystemStats | null;
  onRefresh?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const db = stats?.database || { scheduled: 0, sent: 0, failed: 0, rateLimited: 0, total: 0 };
  const queue = stats?.queue || { delayed: 0, waiting: 0, active: 0, completed: 0, failed: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Scheduled Card */}
      <div className="relative overflow-hidden rounded-xl bg-dark-850/70 border border-dark-700/80 p-4 hover:border-blue-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Scheduled Emails</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-100">{db.scheduled}</span>
          <span className="text-xs text-blue-400 font-medium">
            {queue.delayed} delayed in BullMQ
          </span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-slate-500">
          <span>Persistent in PostgreSQL & Redis</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0" />
      </div>

      {/* Sent Card */}
      <div className="relative overflow-hidden rounded-xl bg-dark-850/70 border border-dark-700/80 p-4 hover:border-emerald-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Successfully Sent</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-100">{db.sent}</span>
          <span className="text-xs text-emerald-400 font-medium">
            via Ethereal Fake SMTP
          </span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-slate-500">
          <span>Searchable in Elasticsearch</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
      </div>

      {/* Rate-Limited / Throttled Card */}
      <div className="relative overflow-hidden rounded-xl bg-dark-850/70 border border-dark-700/80 p-4 hover:border-amber-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Rate-Limited & Rescheduled</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-100">{db.rateLimited}</span>
          <span className="text-xs text-amber-400 font-medium">
            0 dropped
          </span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-slate-500">
          <span>Preserves order & triggers Slack</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0" />
      </div>

      {/* Worker Specs Card */}
      <div className="relative overflow-hidden rounded-xl bg-dark-850/70 border border-dark-700/80 p-4 hover:border-purple-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">BullMQ Worker Engine</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-bold text-slate-100">Concurrency: 5</span>
          <span className="text-xs text-purple-400 font-medium">
            Min 2s delay
          </span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-slate-500">
          <span>Active jobs: {queue.active} | Completed: {queue.completed}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/40 to-purple-500/0" />
      </div>
    </div>
  );
};
