import React from 'react';
import { UpcomingDelivery } from '../utils/notifications';
import { Clock, AlertTriangle, Calendar, X, ArrowLeft, Bell, CheckCircle } from 'lucide-react';
import { getRemainingDaysText } from '../utils';

interface AppStartupNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullSchedule: () => void;
  deliveries: {
    overdue: UpcomingDelivery[];
    today: UpcomingDelivery[];
    tomorrow: UpcomingDelivery[];
    thisWeek: UpcomingDelivery[];
    totalUrgentCount: number;
  };
}

export function AppStartupNotificationModal({
  isOpen,
  onClose,
  onOpenFullSchedule,
  deliveries
}: AppStartupNotificationModalProps) {
  if (!isOpen) return null;

  const totalOverdue = deliveries.overdue.length;
  const totalToday = deliveries.today.length;
  const totalTomorrow = deliveries.tomorrow.length;

  const urgentList = [
    ...deliveries.overdue,
    ...deliveries.today,
    ...deliveries.tomorrow
  ].slice(0, 4);

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl border-2 border-indigo-500/30 dark:border-indigo-500/40 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white relative overflow-hidden border-b border-indigo-500/30">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-center border border-white/20 animate-bounce">
                <Bell size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>تنبيه بمواعيد التسليم</span>
                  <span className="bg-rose-500/30 text-rose-300 border border-rose-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    مهم
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                  تذكير تلقائي عند فتح التطبيق
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          
          {/* Summary Badge Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
              {totalOverdue > 0 && totalToday > 0 ? (
                <span>
                  يوجد <strong className="text-rose-600 dark:text-rose-400 font-black">{totalOverdue} طلبات متأخرة</strong> عن موعد التسليم، و <strong className="text-amber-600 dark:text-amber-400 font-black">{totalToday} طلبات مستحقة اليوم</strong>.
                </span>
              ) : totalOverdue > 0 ? (
                <span>
                  تنبيه: يوجد <strong className="text-rose-600 dark:text-rose-400 font-black">{totalOverdue} طلبات خياطة تجاوزت موعد التسليم المحدد</strong>.
                </span>
              ) : totalToday > 0 ? (
                <span>
                  تذكير: لديك <strong className="text-amber-600 dark:text-amber-400 font-black">{totalToday} طلبات خياطة موعد تسليمها اليوم</strong>.
                </span>
              ) : (
                <span>
                  تذكير: لديك <strong className="text-indigo-600 dark:text-indigo-400 font-black">{totalTomorrow} طلبات تسليمها غداً</strong>.
                </span>
              )}
            </div>
          </div>

          {/* Quick List Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
              <span>الطلبات العاجلة القادمة:</span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                إجمالي ({deliveries.totalUrgentCount})
              </span>
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {urgentList.map(({ order, isOverdue, isToday }) => (
                <div
                  key={order.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isOverdue
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                      : isToday
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 dark:text-white truncate">
                      {order.customerName || 'زبون عام'}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {order.description}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 flex items-center gap-1 ${
                    isOverdue
                      ? 'bg-rose-600 text-white'
                      : isToday
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  }`}>
                    <Clock size={12} />
                    <span>{order.deliveryDate ? getRemainingDaysText(order.deliveryDate) : 'قريب'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullSchedule();
            }}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Calendar size={16} />
            <span>استعراض جدول المواعيد والمهام</span>
            <ArrowLeft size={14} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
