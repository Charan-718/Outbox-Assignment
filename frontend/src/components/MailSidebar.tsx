import React from 'react';
import { User, SystemStats, SlackStatus } from '../types';
import {
  Inbox,
  Send,
  Clock,
  AlertTriangle,
  Sliders,
  Activity,
  MessageSquare,
  LogOut,
  PenSquare,
  ExternalLink,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface MailSidebarProps {
  currentFolder: 'scheduled' | 'sent' | 'throttled' | 'senders';
  onSelectFolder: (folder: 'scheduled' | 'sent' | 'throttled' | 'senders') => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  user: User;
  onLogout: () => void;
  stats: SystemStats | null;
  slackStatus: SlackStatus;
  sendersCount: number;
}

export const MailSidebar: React.FC<MailSidebarProps> = ({
  currentFolder,
  onSelectFolder,
  onOpenCompose,
  onOpenSlackModal,
  user,
  onLogout,
  stats,
  slackStatus,
  sendersCount,
}) => {
  const db = stats?.database || { scheduled: 0, sent: 0, failed: 0, rateLimited: 0, total: 0 };

  return (
    <aside className="w-64 bg-surface border-r border-surface-border flex flex-col justify-between shrink-0 select-none">
      {/* Top Section */}
      <div>
        {/* App Title & Brand */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-surface-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div>
              <span className="font-semibold text-slate-100 tracking-tight text-xs block leading-tight">
                ReachInbox
              </span>
              <span className="text-[10px] text-slate-500 font-mono block leading-none">
                Mail Engine
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border">
            v1.0
          </span>
        </div>

        {/* Compose Button (Mail Client Primary CTA) */}
        <div className="p-3">
          <button
            onClick={onOpenCompose}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-medium text-xs shadow-sm transition-all active:scale-[0.98]"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </button>
        </div>

        {/* Folders Navigation */}
        <nav className="px-2 space-y-0.5 text-xs">
          {/* Scheduled Folder */}
          <button
            onClick={() => onSelectFolder('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
              currentFolder === 'scheduled'
                ? 'bg-surface-elevated text-slate-100 border border-surface-border font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Clock className={`w-3.5 h-3.5 ${currentFolder === 'scheduled' ? 'text-slate-200' : 'text-slate-500'}`} />
              <span>Scheduled</span>
            </div>
            {db.scheduled > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-slate-300">
                {db.scheduled}
              </span>
            )}
          </button>

          {/* Sent Folder */}
          <button
            onClick={() => onSelectFolder('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
              currentFolder === 'sent'
                ? 'bg-surface-elevated text-slate-100 border border-surface-border font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Send className={`w-3.5 h-3.5 ${currentFolder === 'sent' ? 'text-slate-200' : 'text-slate-500'}`} />
              <span>Sent Mail</span>
            </div>
            {db.sent > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-slate-300">
                {db.sent}
              </span>
            )}
          </button>

          {/* Throttled / Outbox */}
          <button
            onClick={() => onSelectFolder('throttled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
              currentFolder === 'throttled'
                ? 'bg-surface-elevated text-slate-100 border border-surface-border font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${currentFolder === 'throttled' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>Throttled Queue</span>
            </div>
            {db.rateLimited > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {db.rateLimited}
              </span>
            )}
          </button>

          {/* Senders & Mailboxes */}
          <button
            onClick={() => onSelectFolder('senders')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
              currentFolder === 'senders'
                ? 'bg-surface-elevated text-slate-100 border border-surface-border font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sliders className={`w-3.5 h-3.5 ${currentFolder === 'senders' ? 'text-slate-200' : 'text-slate-500'}`} />
              <span>Mailboxes & Limits</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {sendersCount}
            </span>
          </button>
        </nav>

        {/* System & Integrations Links */}
        <div className="px-3 pt-5">
          <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Integrations
          </p>

          <div className="space-y-0.5 text-xs">
            {/* Live BullMQ Dashboard Link */}
            <a
              href="http://localhost:5001/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">BullMQ Monitor</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            {/* Slack Alerts */}
            <button
              onClick={onOpenSlackModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">Slack Alerts</span>
              </div>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  slackStatus.isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-surface-border">
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/50 border border-surface-border">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.email}
                className="w-7 h-7 rounded-md object-cover border border-surface-border shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-surface border border-surface-border flex items-center justify-center text-xs font-medium text-slate-300 shrink-0">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                {user.name || 'Account'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate leading-none mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 ml-1"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
