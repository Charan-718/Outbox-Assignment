import React from 'react';
import { EmailJob } from '../types';
import { CheckCircle2, XCircle, ExternalLink, Inbox } from 'lucide-react';

interface SentTableProps {
  emails: EmailJob[];
  loading: boolean;
  onOpenCompose: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  onOpenCompose,
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
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
          <Inbox className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">No sent emails yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
          Delivered emails via Ethereal fake SMTP will appear here with live preview links.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-medium transition-colors"
        >
          <span>Schedule an Email</span>
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
              <th className="px-4 py-3 font-medium">Sent At</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {emails.map((email) => {
              const isSent = email.status === 'SENT';

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
                    {email.errorMessage && (
                      <p className="text-[11px] text-rose-400 mt-0.5 truncate">{email.errorMessage}</p>
                    )}
                  </td>

                  {/* Sent Time */}
                  <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                    {formatDate(email.sentAt)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3">
                    {isSent ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        <XCircle className="w-3 h-3 mr-0.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>

                  {/* Ethereal Preview Link */}
                  <td className="px-4 py-3 text-right">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-elevated text-slate-300 hover:text-white border border-surface-border transition-colors"
                        title="View rendered email in Ethereal"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">—</span>
                    )}
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
