import React from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = 'تأكيد الإجراء',
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  let iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400';
  let buttonBg = 'bg-rose-600 hover:bg-rose-700 text-white border-b-4 border-rose-800';
  let Icon = Trash2;

  if (variant === 'warning') {
    iconBg = 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400';
    buttonBg = 'bg-amber-600 hover:bg-amber-700 text-white border-b-4 border-amber-800';
    Icon = AlertTriangle;
  } else if (variant === 'info') {
    iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400';
    buttonBg = 'bg-blue-600 hover:bg-blue-700 text-white border-b-4 border-blue-800';
    Icon = Info;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 rounded-2xl ${iconBg} shadow-inner`}>
          <Icon size={36} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-md ${buttonBg}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-lg rounded-2xl active:scale-95 transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
