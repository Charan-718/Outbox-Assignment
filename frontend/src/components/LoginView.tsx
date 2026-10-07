import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authApi } from '../services/api';
import { User } from '../types';
import { Layers, ShieldCheck, Clock, Activity, CheckCircle2, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google login failed: no credential received');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await authApi.loginWithGoogle(credentialResponse.credential);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await authApi.loginDemo();
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 relative">
      {/* Subtle hairline grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1f2b0f_1px,transparent_1px),linear-gradient(to_bottom,#1b1f2b0f_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-surface border border-surface-border shadow-xl p-7">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated border border-surface-border mb-3 text-slate-200">
            <Layers className="w-5 h-5 text-slate-300" />
          </div>
          <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
            ReachInbox
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Production Email Scheduler
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Login Options */}
        <div className="space-y-3.5">
          {/* Google Sign In */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign-In was cancelled or failed')}
              useOneTap={false}
              theme="filled_black"
              shape="rectangular"
              text="continue_with"
            />
          </div>

          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <span className="relative bg-surface px-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              or
            </span>
          </div>

          {/* Evaluator Demo Access */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-surface-border text-slate-200 text-xs font-medium transition-colors"
          >
            <span>Continue as Alex Chen (Evaluator Demo)</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-6 pt-5 border-t border-surface-border grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Zero Cron Jobs</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Crash Persistence</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Hourly Throttling</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Slack Alerts</span>
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-slate-500">
        <p>Outbox Labs Architecture</p>
      </footer>
    </div>
  );
};
