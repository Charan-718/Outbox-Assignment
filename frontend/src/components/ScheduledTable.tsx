import React from 'react';
import { EmailJob } from '../types';
import { Clock, Trash2, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';

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
    if (diff <= 0) return 'Sending now...';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `in ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `in ${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-dark-700 bg-dark-850/50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-dark-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-700 rounded w-1/4" />
                <div className="h-3 bg-dark-800 rounded w-1/2" />
              </div>
              <div className="h-4 bg-dark-700 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border border-dark-700 bg-dark-850/40 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">No scheduled emails</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
          There are currently no emails pending in the BullMQ queue. Schedule a new one or upload a lead list.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <span>Schedule New Email</span>
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-850/60 shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dark-700/80 bg-dark-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="px-5 py-3.5">Recipient</th>
              <th className="px-5 py-3.5">Sender</th>
              <th className="px-5 py-3.5">Subject</th>
              <th className="px-5 py-3.5">Scheduled For</th>
              <th className="px-5 py-3.5">Rate Limit / Delay</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/50">
            {emails.map((email) => {
              const isRateLimited = email.status === 'RATE_LIMITED';
              const isProcessing = email.status === 'PROCESSING';

              return (
                <tr
                  key={email.id}
                  className="hover:bg-dark-800/40 transition-colors group"
                >
                  {/* Recipient */}
                  <td className="px-5 py-3.5 font-medium text-slate-200">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-300">{email.recipient}</span>
                    </div>
                  </td>

                  {/* Sender */}
                  <td className="px-5 py-3.5 text-slate-400">
                    <span className="text-[11px] font-mono text-slate-400 bg-dark-700/50 px-2 py-0.5 rounded">
                      {email.senderEmail}
                    </span>
                  </td>

                  {/* Subject */}
                  <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">
                    <span className="font-medium text-slate-200">{email.subject}</span>
                  </td>

                  {/* Scheduled For */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{formatDate(email.scheduledAt)}</span>
                      <span className="text-[10px] text-blue-400 font-medium ml-1">
                        ({getTimeRemaining(email.scheduledAt)})
                      </span>
                    </div>
                  </td>

                  {/* Rate Limit / Delay Info */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <span className="bg-dark-700/60 px-2 py-0.5 rounded text-slate-300">
                        {email.hourlyLimit}/hr
                      </span>
                      <span>•</span>
                      <span>{email.delaySeconds}s delay</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5">
                    {isRateLimited ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        <span>Rescheduled</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <RefreshCw className="w-3 h-3 mr-0.5 animate-spin" />
                        <span>Sending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1" />
                        <span>Scheduled</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onCancel(email.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Cancel and remove scheduled email"
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
