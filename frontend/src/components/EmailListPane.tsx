import React, { useState } from 'react';
import { EmailJob } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Mail,
  Filter,
} from 'lucide-react';

interface EmailListPaneProps {
  emails: EmailJob[];
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailJob) => void;
  onCancelEmail?: (id: string) => void;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  folderType: 'scheduled' | 'sent' | 'throttled';
}

export const EmailListPane: React.FC<EmailListPaneProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  onCancelEmail,
  loading,
  emptyTitle,
  emptyDescription,
  folderType,
}) => {
  const [filter, setFilter] = useState<'all' | 'today'>('all');

  const getInitials = (emailStr: string) => {
    const clean = emailStr.split('@')[0] || '';
    return clean.slice(0, 2).toUpperCase();
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTimeRemaining = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff <= 0) return 'Sending';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '').slice(0, 80);
  };

  // Filter list
  const filteredEmails = emails.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'today') {
      const targetDate = new Date(item.sentAt || item.scheduledAt);
      return targetDate.toDateString() === new Date().toDateString();
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 divide-y divide-surface-border overflow-y-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3.5 flex items-start space-x-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-surface-elevated shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 bg-surface-elevated rounded w-1/3" />
                <div className="h-3 bg-surface-elevated rounded w-12" />
              </div>
              <div className="h-3 bg-surface-elevated rounded w-2/3" />
              <div className="h-2.5 bg-surface-elevated rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-500 mb-3">
          <Mail className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-semibold text-slate-200 mb-1">{emptyTitle}</h4>
        <p className="text-[11px] text-slate-500 max-w-xs">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Quick Filter Bar */}
      <div className="h-8 px-4 border-b border-surface-border bg-surface/80 flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              filter === 'all'
                ? 'bg-surface-elevated text-slate-200 border border-surface-border'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All ({emails.length})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              filter === 'today'
                ? 'bg-surface-elevated text-slate-200 border border-surface-border'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Today
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-500">
          Showing {filteredEmails.length}
        </span>
      </div>

      {/* Thread List */}
      <div className="flex-1 divide-y divide-surface-border overflow-y-auto">
        {filteredEmails.map((email) => {
          const isSelected = selectedEmailId === email.id;
          const isRateLimited = email.status === 'RATE_LIMITED';
          const isProcessing = email.status === 'PROCESSING';
          const isSent = email.status === 'SENT';

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`p-3.5 cursor-pointer transition-colors relative group select-none flex items-start space-x-3 ${
                isSelected
                  ? 'bg-surface-elevated border-l-2 border-primary text-slate-100 shadow-inner'
                  : 'hover:bg-surface-hover/70 text-slate-300'
              }`}
            >
              {/* Recipient Initials Avatar */}
              <div className="w-8 h-8 rounded-full bg-surface border border-surface-border flex items-center justify-center shrink-0 font-mono text-[11px] font-medium text-slate-400 group-hover:text-slate-200">
                {getInitials(email.recipient)}
              </div>

              {/* Email Summary */}
              <div className="flex-1 min-w-0">
                {/* Row 1: Recipient + Timestamp + Status */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-xs text-slate-200 truncate max-w-[190px]">
                    {email.recipient}
                  </span>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {folderType === 'scheduled' || folderType === 'throttled' ? (
                      <span className="text-[10px] font-mono text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>{getTimeRemaining(email.scheduledAt)}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatTimestamp(email.sentAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Subject */}
                <p className="text-xs font-medium text-slate-300 truncate mb-0.5">
                  {email.subject}
                </p>

                {/* Row 3: Body Snippet Preview */}
                <p className="text-[11px] text-slate-500 truncate">
                  {stripHtml(email.body) || 'No message preview'}
                </p>

                {/* Row 4: Metadata chips */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="truncate max-w-[170px]">From: {email.senderEmail}</span>

                  <div className="flex items-center space-x-1">
                    {isRateLimited ? (
                      <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                        <span>Throttled</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] bg-slate-700 text-slate-300">
                        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                        <span>Sending</span>
                      </span>
                    ) : isSent ? (
                      <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-surface border border-surface-border text-slate-400">
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover Actions */}
              {onCancelEmail && email.status !== 'SENT' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEmail(email.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-elevated text-slate-500 hover:text-rose-400 transition-all absolute right-2 top-2"
                  title="Cancel email"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
