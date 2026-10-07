import React, { useState } from 'react';
import { User, SlackStatus } from '../types';
import { Activity, ExternalLink, LogOut, MessageSquare, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <header className="sticky top-0 z-30 border-b border-dark-700 bg-dark-900/90 backdrop-blur-md px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Product */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 p-[1px] shadow-lg shadow-blue-500/10">
              <div className="w-full h-full bg-dark-850 rounded-[11px] flex items-center justify-center">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-300 bg-clip-text text-transparent">
                  ⚡
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100 tracking-tight text-lg">ReachInbox</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Scheduler Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Outbox Labs Architecture</p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          {/* BullMQ Live Dashboard */}
          <a
            href="http://localhost:5001/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-800 text-slate-300 border border-dark-700 hover:border-slate-500 hover:text-white transition-colors"
            title="Open Live BullMQ Queue Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BullMQ Dashboard</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Slack Connection Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              slackStatus.isConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                : 'bg-dark-800 text-slate-300 border-dark-700 hover:border-slate-500 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#E01E5A]" />
            <span>{slackStatus.isConnected ? 'Slack Connected' : 'Connect Slack'}</span>
            {slackStatus.isConnected ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
          >
            <span>+ Compose New Email</span>
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-dark-800 transition-colors border border-transparent hover:border-dark-700"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left text-xs">
                <p className="font-medium text-slate-200 leading-tight">{user.name || 'User'}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-dark-850 border border-dark-700 shadow-2xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-dark-700">
                    <p className="font-semibold text-slate-100">{user.name || 'ReachInbox Account'}</p>
                    <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <a
                      href="http://localhost:5001/admin/queues"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>BullMQ Queue UI</span>
                    </a>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenSlackModal();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:bg-dark-700 hover:text-white text-left transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Slack Notification Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-dark-700 pt-1">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
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
