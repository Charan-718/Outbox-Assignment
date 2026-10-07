import React, { useState } from 'react';
import { User, SlackStatus } from '../types';
import {
  Layers,
  Activity,
  ExternalLink,
  LogOut,
  MessageSquare,
  ChevronDown,
  Plus,
  CheckCircle2,
  CircleDot,
  Radio,
} from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  slackStatus: SlackStatus;
  onOpenSlackModal: () => void;
  onOpenCompose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  slackStatus,
  onOpenSlackModal,
  onOpenCompose,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-canvas/95 backdrop-blur-md px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Product */}
        <div className="flex items-center space-x-3.5">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-200">
            <Layers className="w-4 h-4 text-slate-300" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="font-semibold text-slate-100 tracking-tight text-sm">
              ReachInbox
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border">
              Scheduler
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2.5">
          {/* BullMQ Live Dashboard */}
          <a
            href="http://localhost:5001/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-surface-border text-slate-300 hover:bg-surface-elevated hover:text-slate-100 transition-colors"
            title="Open Live BullMQ Queue Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>BullMQ Queues</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          {/* Slack Connection Button */}
          <button
            onClick={onOpenSlackModal}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              slackStatus.isConnected
                ? 'bg-surface border-surface-border text-slate-200 hover:bg-surface-elevated'
                : 'bg-surface border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>{slackStatus.isConnected ? 'Slack Connected' : 'Connect Slack'}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                slackStatus.isConnected ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenCompose}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-white text-slate-900 shadow-sm active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Compose Email</span>
          </button>

          {/* User Profile */}
          <div className="relative ml-1">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-surface-elevated transition-colors border border-transparent hover:border-surface-border"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="w-7 h-7 rounded-md object-cover border border-surface-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-surface-elevated border border-surface-border flex items-center justify-center text-xs font-medium text-slate-300">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left text-xs">
                <p className="font-medium text-slate-200 leading-tight">{user.name || 'Account'}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-surface-card border border-surface-border shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-surface-border">
                    <p className="font-medium text-slate-200 truncate">{user.name || 'User'}</p>
                    <p className="text-slate-400 text-[11px] font-mono truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <a
                      href="http://localhost:5001/admin/queues"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 px-3.5 py-1.5 text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      <span>BullMQ Dashboard</span>
                    </a>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenSlackModal();
                      }}
                      className="w-full flex items-center space-x-2 px-3.5 py-1.5 text-slate-300 hover:bg-surface-elevated hover:text-white text-left transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Slack Notifications</span>
                    </button>
                  </div>
                  <div className="border-t border-surface-border pt-1">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center space-x-2 px-3.5 py-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
