import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import { emailApi } from '../services/api';
import {
  X,
  Upload,
  Users,
  Clock,
  Shield,
  Send,
  AlertCircle,
  Check,
  FileText,
  Sliders,
  Mail,
  Loader2,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: Sender[];
  userId?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
  userId,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [recipient, setRecipient] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [senderEmail, setSenderEmail] = useState(senders[0]?.email || 'sales@reachinbox.ai');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);

  const getDefaultStartTime = () => {
    const d = new Date(Date.now() + 10000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [startTime, setStartTime] = useState(getDefaultStartTime());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      const unique = Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));
      setParsedEmails(unique);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex) || [];
        const unique = Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));
        setParsedEmails(unique);
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Email body is required');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'single') {
        if (!recipient.trim() || !recipient.includes('@')) {
          setError('Please provide a valid recipient email address');
          setLoading(false);
          return;
        }

        await emailApi.schedule({
          recipient: recipient.trim(),
          senderEmail,
          subject,
          body,
          scheduledAt: new Date(startTime).toISOString(),
          delaySeconds,
          hourlyLimit,
          userId,
        });
      } else {
        if (parsedEmails.length === 0) {
          setError('Please upload a file containing at least one email address');
          setLoading(false);
          return;
        }

        await emailApi.scheduleBatch({
          recipients: parsedEmails,
          senderEmail,
          subject,
          body,
          startTime: new Date(startTime).toISOString(),
          delayBetweenEmailsSeconds: delaySeconds,
          hourlyLimit,
          userId,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-xl bg-surface-card border border-surface-border shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3.5 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-300">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Schedule Outreach Campaign</h2>
              <p className="text-[11px] text-slate-400">BullMQ persistent queue with rate limit throttling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Target Mode Toggle */}
          <div className="flex rounded-lg bg-surface-elevated p-0.5 border border-surface-border">
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-colors ${
                mode === 'batch'
                  ? 'bg-surface border border-surface-border text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSV / Lead Upload (Bulk)
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-colors ${
                mode === 'single'
                  ? 'bg-surface border border-surface-border text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Recipient
            </button>
          </div>

          {/* Recipients Input */}
          {mode === 'single' ? (
            <div>
              <label className="block font-medium text-slate-300 mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="prospect@company.com"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block font-medium text-slate-300 mb-1">Leads Source (CSV / TXT)</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border border-dashed border-surface-border hover:border-slate-500 rounded-lg p-4 text-center bg-surface/50 hover:bg-surface transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-slate-300 font-medium text-xs">Upload CSV or drag & drop</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Supports CSV, TSV, or plain text</p>
              </div>

              {parsedEmails.length > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-200">
                      {parsedEmails.length} lead{parsedEmails.length === 1 ? '' : 's'} detected
                    </span>
                    <span className="text-slate-500 text-[11px] font-mono">({uploadedFileName})</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Parsed</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sender Dropdown */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">Sender Mailbox</label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 focus:outline-none focus:border-slate-500 transition-colors"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.email}>
                  {s.name ? `${s.name} (${s.email})` : s.email}
                  {s.usage ? ` — [${s.usage.count}/${s.usage.limit} sent this hr]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Cold email sequence introduction"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
              required
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">Body (HTML or Plain Text)</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body or HTML markup here..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 font-mono text-xs transition-colors"
              required
            />
          </div>

          {/* Rate Limiting & Scheduling Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-surface-elevated/60 border border-surface-border">
            {/* Start Time */}
            <div>
              <label className="block font-medium text-slate-400 mb-1 flex items-center space-x-1 text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md bg-surface border border-surface-border text-slate-200 text-xs focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>

            {/* Delay between emails */}
            <div>
              <label className="block font-medium text-slate-400 mb-1 flex items-center space-x-1 text-[11px]">
                <Sliders className="w-3 h-3 text-slate-400" />
                <span>Delay (sec)</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                className="w-full px-2 py-1.5 rounded-md bg-surface border border-surface-border text-slate-200 text-xs focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block font-medium text-slate-400 mb-1 flex items-center space-x-1 text-[11px]">
                <Shield className="w-3 h-3 text-slate-400" />
                <span>Hourly Limit</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 50)}
                className="w-full px-2 py-1.5 rounded-md bg-surface border border-surface-border text-slate-200 text-xs focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium disabled:opacity-50 transition-all active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Schedule {mode === 'batch' && parsedEmails.length > 0 ? `${parsedEmails.length} Emails` : 'Email'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
