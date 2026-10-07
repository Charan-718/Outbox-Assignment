import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authApi } from '../services/api';
import { User } from '../types';
import { Zap, Shield, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0B0D13] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-emerald-400/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-dark-850/90 border border-dark-700/80 shadow-2xl p-8 backdrop-blur-xl">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 p-[1px] mb-4 shadow-xl shadow-blue-500/20">
            <div className="w-full h-full bg-dark-850 rounded-[15px] flex items-center justify-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-300 bg-clip-text text-transparent">
                ⚡
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            ReachInbox
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Production-grade Email Scheduler Dashboard
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-750 border border-dark-700 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BullMQ • Redis • Elasticsearch • PostgreSQL</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Login actions */}
        <div className="space-y-4">
          {/* Real Google OAuth Login */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign-In was cancelled or failed')}
              useOneTap={false}
              theme="filled_black"
              shape="pill"
              text="continue_with"
            />
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700" />
            </div>
            <span className="relative bg-dark-850 px-3 text-[11px] text-slate-500 uppercase font-semibold">
              Or Fast Evaluator Access
            </span>
          </div>

          {/* Quick Demo Access Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-dark-750 hover:bg-dark-700 border border-dark-700 text-slate-200 text-xs font-semibold transition-all hover:border-slate-500 active:scale-[0.99] group shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Continue as Alex Chen (Evaluator Demo)</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-dark-700/60 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero Cron Jobs</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Restart Persistence</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Hourly Throttling</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Slack Rate Alerts</span>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        <p>Outbox Labs Assignment • ReachInbox Scheduler Architecture</p>
      </footer>
    </div>
  );
};
