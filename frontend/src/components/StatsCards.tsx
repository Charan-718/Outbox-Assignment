import React from 'react';
import { SystemStats } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

interface StatsCardsProps {
  stats: SystemStats | null;
  onRefresh?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const db = stats?.database || { scheduled: 0, sent: 0, failed: 0, rateLimited: 0, total: 0 };
  const queue = stats?.queue || { delayed: 0, waiting: 0, active: 0, completed: 0, failed: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* Scheduled Card */}
      <div className="rounded-xl bg-surface border border-surface-border p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">Scheduled Queue</span>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-slate-100">{db.scheduled}</span>
          <span className="text-xs text-slate-400 font-mono">
            ({queue.delayed} delayed)
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          BullMQ & PostgreSQL state
        </p>
      </div>

      {/* Sent Card */}
      <div className="rounded-xl bg-surface border border-surface-border p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">Delivered</span>
          <CheckCircle2 className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-slate-100">{db.sent}</span>
          <span className="text-xs text-slate-400 font-mono">
            emails
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Indexed in Elasticsearch
        </p>
      </div>

      {/* Rate-Limited / Throttled Card */}
      <div className="rounded-xl bg-surface border border-surface-border p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">Throttled & Rescheduled</span>
          <AlertTriangle className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-slate-100">{db.rateLimited}</span>
          <span className="text-xs text-slate-400 font-mono">
            rescheduled
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Zero dropped jobs
        </p>
      </div>

      {/* Worker Specs Card */}
      <div className="rounded-xl bg-surface border border-surface-border p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">Worker Status</span>
          <Cpu className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-bold tracking-tight text-slate-100">5 Workers</span>
          <span className="text-xs text-slate-400 font-mono">
            2s delay
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Active: {queue.active} | Completed: {queue.completed}
        </p>
      </div>
    </div>
  );
};
