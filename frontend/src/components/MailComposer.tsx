import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import { emailApi } from '../services/api';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Upload,
  Send,
  Clock,
  Shield,
  Sliders,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  Paperclip,
} from 'lucide-react';

interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: Sender[];
  userId?: string;
}

export const MailComposer: React.FC<MailComposerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
  userId,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [recipient, setRecipient] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [senderEmail, setSenderEmail] = useState(senders[0]?.email || 'sales@reachinbox.ai');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'single') {
        if (!recipient.trim() || !recipient.includes('@')) {
          setError('Please provide a valid recipient address');
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
          setError('Please upload a CSV or list containing at least one lead email');
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
      setError(err?.response?.data?.error || err.message || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 w-72 bg-surface-card border border-surface-border rounded-t-xl z-50 shadow-2xl">
        <div className="h-10 px-4 flex items-center justify-between text-xs text-slate-200">
          <span className="font-medium truncate">{subject || 'New Message'}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-200 bg-surface-card border border-surface-border shadow-2xl flex flex-col ${
        isMaximized
          ? 'inset-6 rounded-xl'
          : 'bottom-0 right-6 w-[560px] h-[580px] rounded-t-xl'
      }`}
    >
      {/* Title Bar */}
      <div className="h-10 px-4 bg-surface flex items-center justify-between border-b border-surface-border rounded-t-xl shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-200">New Outreach Message</span>
          {mode === 'batch' && parsedEmails.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated text-slate-300 border border-surface-border">
              {parsedEmails.length} leads
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
        {/* From Field */}
        <div className="px-4 py-2 border-b border-surface-border flex items-center">
          <span className="text-slate-500 w-14 font-medium">From:</span>
          <select
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="flex-1 bg-transparent text-slate-200 focus:outline-none text-xs font-mono"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.email} className="bg-surface text-slate-200">
                {s.name ? `${s.name} <${s.email}>` : s.email}
              </option>
            ))}
          </select>
        </div>

        {/* To Field with Mode Switch */}
        <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center flex-1 mr-2">
            <span className="text-slate-500 w-14 font-medium">To:</span>
            {mode === 'single' ? (
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="prospect@company.com"
                className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none font-mono text-xs"
                required
              />
            ) : (
              <div className="flex items-center space-x-2">
                {parsedEmails.length > 0 ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-slate-200 font-mono text-[11px]">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{parsedEmails.length} leads ({uploadedFileName})</span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">Upload CSV or lead file below</span>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded bg-surface hover:bg-surface-elevated border border-surface-border text-slate-300 text-[11px] flex items-center space-x-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>{parsedEmails.length > 0 ? 'Change File' : 'Upload CSV'}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Toggle between Single and Bulk */}
          <button
            type="button"
            onClick={() => setMode(mode === 'single' ? 'batch' : 'single')}
            className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono"
          >
            {mode === 'single' ? 'Switch to Bulk CSV' : 'Switch to Single Lead'}
          </button>
        </div>

        {/* Subject Field */}
        <div className="px-4 py-2.5 border-b border-surface-border flex items-center">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-medium"
            required
          />
        </div>

        {/* Body Textarea */}
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email body or HTML copy..."
            className="w-full h-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none text-xs leading-relaxed font-sans"
            required
          />
        </div>

        {/* Schedule Settings Drawer (collapsible) */}
        {showScheduleSettings && (
          <div className="px-4 py-3 bg-surface border-t border-surface-border grid grid-cols-3 gap-3 animate-in fade-in">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center space-x-1">
                <Clock className="w-2.5 h-2.5" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-1 rounded bg-surface-elevated border border-surface-border text-slate-200 text-[11px] font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center space-x-1">
                <Sliders className="w-2.5 h-2.5" />
                <span>Delay (sec)</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                className="w-full px-2 py-1 rounded bg-surface-elevated border border-surface-border text-slate-200 text-[11px] font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center space-x-1">
                <Shield className="w-2.5 h-2.5" />
                <span>Hourly Limit</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 50)}
                className="w-full px-2 py-1 rounded bg-surface-elevated border border-surface-border text-slate-200 text-[11px] font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Bottom Toolbar & Action Bar */}
        <div className="h-12 px-4 bg-surface border-t border-surface-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowScheduleSettings(!showScheduleSettings)}
              className={`p-1.5 rounded-md border text-xs flex items-center space-x-1.5 transition-colors ${
                showScheduleSettings
                  ? 'bg-surface-elevated border-slate-600 text-slate-100'
                  : 'border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
              }`}
              title="Configure timing & hourly rate limits"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px]">Throttling Options</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium text-xs shadow-sm transition-all disabled:opacity-50"
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
                    Schedule {mode === 'batch' && parsedEmails.length > 0 ? `${parsedEmails.length} Leads` : 'Email'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
