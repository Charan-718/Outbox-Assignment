import React from 'react';
import { EmailJob } from '../types';
import { Clock, Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react';

interface ScheduledTableProps {
  emails: EmailJob[];
  loading: boolean;
  onCancel: (id: string) => void;
  onOpenCompose: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  onCancel,
  onOpenCompose,
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getTimeRemaining = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff <= 0) return 'Sending now';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `in ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `in ${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface-elevated rounded w-1/4" />
                <div className="h-3 bg-surface-elevated rounded w-1/2" />
              </div>
              <div className="h-3.5 bg-surface-elevated rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-3.5 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-400">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">No scheduled emails</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
          There are currently no delayed jobs in the queue. Schedule an outreach campaign or upload a lead list.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-medium transition-colors"
        >
          <span>Schedule New Email</span>
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border bg-surface-elevated/40 text-slate-400 font-medium text-[11px]">
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Sender</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Scheduled For</th>
              <th className="px-4 py-3 font-medium">Throttling</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {emails.map((email) => {
              const isRateLimited = email.status === 'RATE_LIMITED';
              const isProcessing = email.status === 'PROCESSING';

              return (
                <tr
                  key={email.id}
                  className="hover:bg-surface-hover/60 transition-colors"
                >
                  {/* Recipient */}
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {email.recipient}
                  </td>

                  {/* Sender */}
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {email.senderEmail}
                  </td>

                  {/* Subject */}
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                    <span className="font-medium text-slate-200">{email.subject}</span>
                  </td>

                  {/* Scheduled For */}
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(email.scheduledAt)}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">
                        ({getTimeRemaining(email.scheduledAt)})
                      </span>
                    </div>
                  </td>

                  {/* Rate Limit / Delay Info */}
                  <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                    <span>{email.hourlyLimit}/hr • {email.delaySeconds}s delay</span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3">
                    {isRateLimited ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        <span>Rescheduled</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/40 text-slate-200 border border-slate-600/30">
                        <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
                        <span>Sending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-elevated text-slate-300 border border-surface-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
                        <span>Scheduled</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onCancel(email.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Cancel job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
