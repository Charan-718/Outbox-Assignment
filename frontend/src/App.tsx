import React, { useState, useEffect, useCallback } from 'react';
import { User, EmailJob, Sender, SystemStats, SlackStatus } from './types';
import { emailApi, senderApi, slackApi } from './services/api';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { SendersView } from './components/SendersView';
import { LoginView } from './components/LoginView';
import { Search, RefreshCw, Mail, CheckCircle2, Sliders, Database } from 'lucide-react';

export const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('reachinbox_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'senders'>('scheduled');

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

      setScheduledEmails(scheduledRes.emails || []);
      setSentEmails(sentRes.emails || []);
      setSenders(sendersRes || []);
      setStats(statsRes);
      setSlackStatus(slackRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [user]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

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

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {/* Metric Cards */}
        <StatsCards stats={stats} onRefresh={fetchData} />

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          {/* Minimal Navigation Tabs */}
          <div className="flex items-center space-x-1 rounded-lg bg-surface p-1 border border-surface-border">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'scheduled'
                  ? 'bg-surface-elevated text-slate-100 border border-surface-border shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Scheduled Emails</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-slate-400">
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'bg-surface-elevated text-slate-100 border border-surface-border shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Sent Emails</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-slate-400">
                {sentEmails.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('senders');
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'senders'
                  ? 'bg-surface-elevated text-slate-100 border border-surface-border shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Senders & Limits</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-slate-400">
                {senders.length}
              </span>
            </button>
          </div>

          {/* Search Input with Elasticsearch indicator */}
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, body, recipient..."
                className="w-full pl-8 pr-20 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border">
                  {searchSource ? (searchSource === 'elasticsearch' ? 'ES 8.x' : 'DB') : 'Elasticsearch'}
                </span>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg bg-surface border border-surface-border text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'scheduled' && (
          <ScheduledTable
            emails={scheduledEmails}
            loading={loading}
            onCancel={handleCancelEmail}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === 'sent' && (
          <SentTable
            emails={sentEmails}
            loading={loading}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === 'senders' && (
          <SendersView
            senders={senders}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        senders={senders}
        userId={user.id}
      />

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
