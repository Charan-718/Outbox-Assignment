import React, { useState, useEffect, useCallback } from 'react';
import { User, EmailJob, Sender, SystemStats, SlackStatus } from './types';
import { emailApi, senderApi, slackApi } from './services/api';
import { MailSidebar } from './components/MailSidebar';
import { EmailListPane } from './components/EmailListPane';
import { EmailDetailPane } from './components/EmailDetailPane';
import { MailComposer } from './components/MailComposer';
import { SlackModal } from './components/SlackModal';
import { SendersView } from './components/SendersView';
import { LoginView } from './components/LoginView';
import {
  Search,
  RefreshCw,
  Clock,
  Send,
  AlertTriangle,
  Sliders,
  Filter,
} from 'lucide-react';

export const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('reachinbox_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Current Mailbox Folder
  const [currentFolder, setCurrentFolder] = useState<'scheduled' | 'sent' | 'throttled' | 'senders'>('scheduled');

  // Selected Email for Reading Pane
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  // Data States
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ isConnected: false });

  // UI States
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<'elasticsearch' | 'database' | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  // Sync user to localStorage
  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('reachinbox_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [scheduledRes, sentRes, sendersRes, statsRes, slackRes] = await Promise.all([
        emailApi.getScheduled(),
        emailApi.getSent(),
        senderApi.getAll(),
        emailApi.getStats(),
        slackApi.getStatus(user.id),
      ]);

      const sched = scheduledRes.emails || [];
      const sent = sentRes.emails || [];
      setScheduledEmails(sched);
      setSentEmails(sent);
      setSenders(sendersRes || []);
      setStats(statsRes);
      setSlackStatus(slackRes);

      // Auto-select first email if none selected
      setSelectedEmail((prev) => {
        if (prev) {
          // Keep updated state of current selection
          const all = [...sched, ...sent];
          const found = all.find((e) => e.id === prev.id);
          return found || prev;
        }
        if (currentFolder === 'scheduled' && sched.length > 0) return sched[0];
        if (currentFolder === 'sent' && sent.length > 0) return sent[0];
        return null;
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [user, currentFolder]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  // Update selected email when folder changes
  const handleSelectFolder = (folder: 'scheduled' | 'sent' | 'throttled' | 'senders') => {
    setCurrentFolder(folder);
    if (folder === 'scheduled' && scheduledEmails.length > 0) {
      setSelectedEmail(scheduledEmails[0]);
    } else if (folder === 'sent' && sentEmails.length > 0) {
      setSelectedEmail(sentEmails[0]);
    } else if (folder === 'throttled') {
      const throttled = scheduledEmails.filter((e) => e.status === 'RATE_LIMITED');
      setSelectedEmail(throttled[0] || null);
    } else {
      setSelectedEmail(null);
    }
  };

  // Elasticsearch Search with debounce
  useEffect(() => {
    if (!user) return;
    if (!searchQuery.trim()) {
      setSearchSource(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await emailApi.search({ q: searchQuery.trim() });
        setSearchSource(res.source);

        const scheduled = res.emails.filter((e) => ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING'].includes(e.status));
        const sent = res.emails.filter((e) => ['SENT', 'FAILED'].includes(e.status));

        setScheduledEmails(scheduled);
        setSentEmails(sent);

        if (res.emails.length > 0) {
          setSelectedEmail(res.emails[0]);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleCancelEmail = async (id: string) => {
    try {
      await emailApi.cancel(id);
      fetchData();
    } catch (err) {
      console.error('Cancel email error:', err);
    }
  };

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Filter emails based on folder
  const currentList =
    currentFolder === 'scheduled'
      ? scheduledEmails.filter((e) => e.status !== 'RATE_LIMITED')
      : currentFolder === 'throttled'
      ? scheduledEmails.filter((e) => e.status === 'RATE_LIMITED')
      : currentFolder === 'sent'
      ? sentEmails
      : [];

  const getFolderMeta = () => {
    switch (currentFolder) {
      case 'scheduled':
        return {
          title: 'Scheduled Queue',
          count: currentList.length,
          emptyTitle: 'No scheduled emails',
          emptyDesc: 'Outreach campaigns waiting in BullMQ delayed queue will appear here.',
        };
      case 'sent':
        return {
          title: 'Delivered Outbox',
          count: currentList.length,
          emptyTitle: 'No sent emails yet',
          emptyDesc: 'Emails sent via Ethereal fake SMTP will appear here with preview links.',
        };
      case 'throttled':
        return {
          title: 'Throttled & Rescheduled',
          count: currentList.length,
          emptyTitle: 'No throttled emails',
          emptyDesc: 'Jobs that hit hourly limits are automatically held and queued for the next window.',
        };
      case 'senders':
        return {
          title: 'Mailboxes & Rate Limits',
          count: senders.length,
          emptyTitle: '',
          emptyDesc: '',
        };
    }
  };

  const folderMeta = getFolderMeta();

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas text-slate-100 flex font-sans">
      {/* 1. Left Email Client Sidebar */}
      <MailSidebar
        currentFolder={currentFolder}
        onSelectFolder={handleSelectFolder}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        user={user}
        onLogout={handleLogout}
        stats={stats}
        slackStatus={slackStatus}
        sendersCount={senders.length}
      />

      {/* 2. Main Email Workspace */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-canvas">
        {/* Top Search & Action Bar */}
        <header className="h-14 px-6 border-b border-surface-border bg-surface flex items-center justify-between shrink-0">
          {/* Email Search with Elasticsearch Badge */}
          <div className="relative w-full max-w-lg">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient, subject, or message body..."
              className="w-full pl-8 pr-28 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors font-sans"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface text-slate-400 border border-surface-border">
                {searchSource ? (searchSource === 'elasticsearch' ? 'ES 8.x' : 'DB') : 'Elasticsearch'}
              </span>
            </div>
          </div>

          {/* Quick Header Right Tools */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span className="hidden sm:inline-block text-[11px] text-slate-500">
              Worker Concurrency: 5
            </span>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg border border-surface-border bg-surface-elevated hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        {currentFolder === 'senders' ? (
          <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-slate-100">Sending Mailboxes & Hourly Limits</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage per-sender limits, track real-time Redis hourly counters, and trigger manual resets.
              </p>
            </div>
            <SendersView senders={senders} onRefresh={fetchData} />
          </div>
        ) : (
          /* Split Dual-Pane Email View (Superhuman / Apple Mail Style) */
          <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-surface-border">
            {/* Left Sub-Pane: Email Thread List */}
            <div className="w-[380px] lg:w-[420px] flex flex-col bg-surface shrink-0 h-full overflow-hidden">
              {/* Folder Sub-Header */}
              <div className="h-10 px-4 border-b border-surface-border flex items-center justify-between shrink-0 bg-surface">
                <span className="text-xs font-semibold text-slate-200">
                  {folderMeta.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {folderMeta.count} {folderMeta.count === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Thread List */}
              <EmailListPane
                emails={currentList}
                selectedEmailId={selectedEmail?.id || null}
                onSelectEmail={setSelectedEmail}
                onCancelEmail={handleCancelEmail}
                loading={loading}
                emptyTitle={folderMeta.emptyTitle}
                emptyDescription={folderMeta.emptyDesc}
                folderType={currentFolder}
              />
            </div>

            {/* Right Sub-Pane: Full Email Reading / Inspection View */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
              <EmailDetailPane
                email={selectedEmail}
                onCancelEmail={handleCancelEmail}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Docked Floating Email Composer (Superhuman / Gmail Style) */}
      <MailComposer
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        senders={senders}
        userId={user.id}
      />

      {/* 4. Slack Connection & Live Alert Modal */}
      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        status={slackStatus}
        onStatusChange={fetchData}
        userId={user.id}
      />
    </div>
  );
};

export default App;
