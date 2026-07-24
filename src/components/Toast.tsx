import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastType } from '../utils';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType; id: string }>;
      const { message, type, id } = customEvent.detail;
      
      const newToast: ToastItem = {
        id: id || crypto.randomUUID(),
        message,
        type: type || 'success',
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-emerald-600 text-white border-emerald-700';
        let Icon = CheckCircle2;

        if (toast.type === 'error') {
          bgClass = 'bg-rose-600 text-white border-rose-700';
          Icon = XCircle;
        } else if (toast.type === 'info') {
          bgClass = 'bg-blue-600 text-white border-blue-700';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border-2 ${bgClass} transition-all duration-300 transform translate-y-0 scale-100 animate-in slide-in-from-top-4 fade-in`}
          >
            <div className="flex items-center gap-3">
              <Icon size={22} className="shrink-0" />
              <span className="font-bold text-base leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
