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
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">No sent emails yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
          Emails sent by the scheduler via Ethereal fake SMTP will appear here with live preview links.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <span>Schedule an Email Now</span>
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
              <th className="px-5 py-3.5">Sent At</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/50">
            {emails.map((email) => {
              const isSent = email.status === 'SENT';

              return (
                <tr
                  key={email.id}
                  className="hover:bg-dark-800/40 transition-colors group"
                >
                  {/* Recipient */}
                  <td className="px-5 py-3.5 font-medium text-slate-200">
                    <span className="font-mono text-slate-300">{email.recipient}</span>
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
                    {email.errorMessage && (
                      <p className="text-[11px] text-rose-400 mt-0.5 truncate">{email.errorMessage}</p>
                    )}
                  </td>

                  {/* Sent Time */}
                  <td className="px-5 py-3.5 text-slate-300">
                    <span>{formatDate(email.sentAt)}</span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5">
                    {isSent ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        <XCircle className="w-3 h-3 mr-0.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>

                  {/* Ethereal Preview Link */}
                  <td className="px-5 py-3.5 text-right">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/20 transition-all hover:scale-105"
                        title="View rendered email in Ethereal"
                      >
                        <span>View Email</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-500">—</span>
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
