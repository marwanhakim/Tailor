import React, { useState, useEffect } from 'react';
import { LogEntry } from '../../types';
import { initDB } from '../../db';
import { formatDate, showToast } from '../../utils';
import { ConfirmModal } from '../ConfirmModal';
import { Clock, Trash2, History } from 'lucide-react';

export function HistoryTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await initDB();
    const all = await db.getAllFromIndex('history', 'by-date');
    setLogs(all.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    const db = await initDB();
    await db.clear('history');
    showToast('تم مسح السجل بنجاح', 'info');
    setShowClearConfirm(false);
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <History size={24} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">سجل العمليات والنشاطات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">عرض جميع العمليات التي تم إجراؤها في النظام</p>
          </div>
        </div>

        {logs.length > 0 && (
          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 px-3.5 py-2 rounded-xl transition-all text-sm border border-red-200 dark:border-red-800/50"
          >
            <Trash2 size={16} />
            <span>مسح السجل</span>
          </button>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            <Clock size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-base font-bold">السجل فارغ حالياً</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-200/70 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-0.5 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDate(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={showClearConfirm}
        title="مسح السجل"
        message="هل أنت متأكد من مسح السجل بالكامل؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="مسح السجل"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

