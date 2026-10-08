import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-6 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg bg-surface-elevated border border-surface-border shadow-xl text-xs text-slate-100 animate-in slide-in-from-bottom-2 duration-150"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
          <span className="font-medium pr-1">{toast.text}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-0.5 rounded text-slate-500 hover:text-slate-300"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
