import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import { emailApi } from '../services/api';
import confetti from 'canvas-confetti';
import { X, Upload, Users, Clock, Shield, Sparkles, AlertCircle, Check } from 'lucide-react';

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
  
  // Start time: defaults to current local datetime + 10 seconds
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
      setError('Please provide an email subject');
      return;
    }
    if (!body.trim()) {
      setError('Please provide an email body');
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
          setError('Please upload a CSV or text file containing at least one email address');
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

      // Celebrate with confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700 pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Compose & Schedule Campaign</h2>
              <p className="text-xs text-slate-400">BullMQ persistent queue with rate limit throttling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-750 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Mode Toggle */}
          <div className="flex rounded-lg bg-dark-800 p-1 border border-dark-750">
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === 'batch'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSV / Lead List Upload (Bulk)
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                mode === 'single'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Recipient Test
            </button>
          </div>

          {/* Recipients Input */}
          {mode === 'single' ? (
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Recipient Email *</label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. prospect@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Upload Leads (CSV / TXT) *</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-dark-700 hover:border-blue-500/50 rounded-xl p-5 text-center bg-dark-800/40 hover:bg-dark-800/70 transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-slate-200 font-medium">Click to upload or drag & drop</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Supports CSV, TSV, or plain text with emails</p>
              </div>

              {parsedEmails.length > 0 && (
                <div className="mt-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-300">
                      {parsedEmails.length} valid lead{parsedEmails.length === 1 ? '' : 's'} detected
                    </span>
                    <span className="text-slate-400 text-[11px]">({uploadedFileName})</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Ready</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sender Dropdown */}
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Sending Account</label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
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
            <label className="block font-medium text-slate-300 mb-1.5">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling cold outreach with AI workflows"
              className="w-full px-3.5 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Body (HTML or Text) *</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email copy or HTML template here..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-[12px]"
              required
            />
          </div>

          {/* Rate Limiting & Scheduling Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-dark-800/60 border border-dark-750">
            {/* Start Time */}
            <div>
              <label className="block font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-dark-850 border border-dark-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Delay between emails */}
            <div>
              <label className="block font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Delay (seconds)</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                className="w-full px-2.5 py-1.5 rounded-md bg-dark-850 border border-dark-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500">Min throttling delay</span>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Hourly Limit</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 50)}
                className="w-full px-2.5 py-1.5 rounded-md bg-dark-850 border border-dark-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500">Max sends/hr/sender</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-dark-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Scheduling in BullMQ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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
