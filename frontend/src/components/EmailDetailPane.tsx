import React, { useState } from 'react';
import { EmailJob } from '../types';
import {
  Mail,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EmailDetailPaneProps {
  email: EmailJob | null;
  onCancelEmail?: (id: string) => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const EmailDetailPane: React.FC<EmailDetailPaneProps> = ({
  email,
  onCancelEmail,
  onShowToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none bg-canvas">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-slate-500 mb-3.5 shadow-sm">
          <Mail className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Select an email to read</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-3">
          Click any email thread on the left to inspect scheduling telemetry, rendered HTML, and fake SMTP delivery.
        </p>
        <div className="text-[11px] font-mono text-slate-600 bg-surface px-2.5 py-1 rounded border border-surface-border">
          Tip: Press <kbd className="text-slate-400">C</kbd> to compose, <kbd className="text-slate-400">↑</kbd> <kbd className="text-slate-400">↓</kbd> to navigate
        </div>
      </div>
    );
  }

  const isSent = email.status === 'SENT';
  const isRateLimited = email.status === 'RATE_LIMITED';

  const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopyLink = () => {
    if (email.etherealPreviewUrl) {
      navigator.clipboard.writeText(email.etherealPreviewUrl);
      setCopiedLink(true);
      if (onShowToast) onShowToast('Ethereal preview link copied to clipboard', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-y-auto">
      {/* Top Action Header */}
      <div className="h-14 px-6 border-b border-surface-border flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center space-x-2">
          {isSent ? (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Delivered via Ethereal</span>
            </span>
          ) : isRateLimited ? (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Throttled & Rescheduled</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-surface-elevated text-slate-300 border border-surface-border">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Scheduled in BullMQ</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {email.etherealPreviewUrl && (
            <>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-surface-border text-xs transition-colors"
                title="Copy Ethereal message URL"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-medium transition-colors shadow-xs"
                title="Open fake email preview in Ethereal"
              >
                <span>View in Ethereal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}

          {onCancelEmail && email.status !== 'SENT' && (
            <button
              onClick={() => onCancelEmail(email.id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-surface-border text-xs font-medium transition-colors"
              title="Cancel scheduled job"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Job</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Content Container */}
      <div className="p-8 max-w-4xl space-y-6">
        {/* Subject Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight leading-snug">
            {email.subject}
          </h1>

          {email.errorMessage && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {email.errorMessage}
            </div>
          )}
        </div>

        {/* Sender & Recipient Metadata Card */}
        <div className="rounded-xl bg-surface border border-surface-border p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 w-12 font-medium">From:</span>
              <span className="font-mono text-slate-200">{email.senderEmail}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {isSent ? `Sent: ${formatFullDate(email.sentAt)}` : `Scheduled: ${formatFullDate(email.scheduledAt)}`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 w-12 font-medium">To:</span>
              <span className="font-mono text-slate-200 font-medium">{email.recipient}</span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
              <span>Limit: {email.hourlyLimit}/hr</span>
              <span>•</span>
              <span>Delay: {email.delaySeconds}s</span>
            </div>
          </div>

          {email.bullJobId && (
            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="truncate">Job ID: {email.bullJobId}</span>
              <button
                onClick={() => setShowRawMetadata(!showRawMetadata)}
                className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <Code className="w-3 h-3" />
                <span>{showRawMetadata ? 'Hide Details' : 'Queue Details'}</span>
                {showRawMetadata ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Collapsible Raw Metadata */}
          {showRawMetadata && (
            <div className="mt-2 pt-2 border-t border-surface-border/60 bg-surface-elevated/40 p-2.5 rounded font-mono text-[10px] text-slate-400 space-y-1">
              <div>BullMQ Queue: email-queue</div>
              <div>BullMQ Job ID: {email.bullJobId}</div>
              {email.etherealMessageId && <div>Message ID: {email.etherealMessageId}</div>}
              <div>Created At: {email.createdAt}</div>
              <div>Database ID: {email.id}</div>
            </div>
          )}
        </div>

        {/* Ethereal Fake SMTP Callout Banner */}
        {email.etherealPreviewUrl && (
          <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-300">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Delivered via Ethereal Fake SMTP</p>
                <p className="text-[11px] text-slate-500">Real rendered HTML message captured in Ethereal mailbox</p>
              </div>
            </div>

            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium text-xs transition-colors"
            >
              Open Mailbox Preview
            </a>
          </div>
        )}

        {/* Email Body Paper Container */}
        <div className="rounded-xl bg-surface border border-surface-border p-6 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-4 pb-2 border-b border-surface-border">
            Message Body
          </div>

          {email.body.includes('<') && email.body.includes('>') ? (
            <div
              className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
              {email.body}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
