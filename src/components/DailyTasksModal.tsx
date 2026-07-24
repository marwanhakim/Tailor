import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { initDB, logAction } from '../db';
import { 
  X, Calendar, Clock, AlertTriangle, CheckCircle, Phone, MessageCircle, 
  Bell, BellOff, ArrowRight, ShieldAlert, Sparkles, Filter, ChevronLeft
} from 'lucide-react';
import { showToast, formatDate, getRemainingDaysText } from '../utils';
import { 
  getUpcomingDeliveries, UpcomingDelivery, requestNotificationPermission, 
  getNotificationPermission, sendBrowserNotification 
} from '../utils/notifications';

interface DailyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

type FilterTab = 'all' | 'overdue' | 'today' | 'tomorrow' | 'thisWeek';

export function DailyTasksModal({ isOpen, onClose, onOrderUpdated }: DailyTasksModalProps) {
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('today');
  const [deliveries, setDeliveries] = useState<{
    overdue: UpcomingDelivery[];
    today: UpcomingDelivery[];
    tomorrow: UpcomingDelivery[];
    thisWeek: UpcomingDelivery[];
    totalUrgentCount: number;
  }>({
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    totalUrgentCount: 0,
  });

  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  const [editingDeliveryDateOrderId, setEditingDeliveryDateOrderId] = useState<string | null>(null);
  const [newDateVal, setNewDateVal] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadDeliveries();
      setNotificationPerm(getNotificationPermission());
    }
  }, [isOpen]);

  const loadDeliveries = async () => {
    setLoading(true);
    const data = await getUpcomingDeliveries();
    setDeliveries(data);

    // Auto switch to overdue if today is empty but overdue has items
    if (data.today.length === 0 && data.overdue.length > 0) {
      setActiveFilter('overdue');
    } else if (data.today.length === 0 && data.overdue.length === 0 && data.tomorrow.length > 0) {
      setActiveFilter('tomorrow');
    }

    setLoading(false);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPerm(getNotificationPermission());
    if (granted) {
      showToast('تم تفعيل إشعارات المتصفح بنجاح! ستتلقى تنبيهات بمواعيد التسليم', 'success');
      sendBrowserNotification('🧵 تم تفعيل التنبيهات بنجاح', {
        body: 'ستتلقى إشعارات يومية عند استحقاق تسليم طلبات الخياطة للزبائن.',
      });
    } else {
      showToast('تم رفض إذن الإشعارات من المتصفح. يمكنك تفعيلها من إعدادات الموقع', 'error');
    }
  };

  const handleTestNotification = () => {
    sendBrowserNotification('🧵 إشعار تجريبي من نظام بكسل الخياطة', {
      body: 'هذا إشعار تجريبي لاختبار التنبيهات لمواعيد تسليم الطلبات.',
    });
    showToast('تم إرسال الإشعار التجريبي!', 'info');
  };

  const handleUpdateStatus = async (order: Order, newStatus: Order['status']) => {
    try {
      const db = await initDB();
      const updatedOrder: Order = { ...order, status: newStatus };
      await db.put('orders', updatedOrder);

      const statusLabels: Record<Order['status'], string> = {
        pending: 'قيد الانتظار',
        in_progress: 'قيد الخياطة',
        ready: 'جاهز للتسليم',
        delivered: 'تم التسليم للزبون',
        completed: 'مكتمل',
        cancelled: 'ملغي',
      };

      await logAction('تغيير حالة طلب', `تم تغيير حالة طلب "${order.description}" إلى ${statusLabels[newStatus]}`);
      showToast(`تم تحديث الحالة إلى: ${statusLabels[newStatus]}`, 'success');

      await loadDeliveries();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      console.error(err);
      showToast('فشل تحديث حالة الطلب', 'error');
    }
  };

  const handleReschedule = async (order: Order) => {
    if (!newDateVal) return;
    try {
      const db = await initDB();
      const newTimestamp = new Date(newDateVal).getTime();
      const updatedOrder: Order = { ...order, deliveryDate: newTimestamp };
      await db.put('orders', updatedOrder);

      await logAction('تغيير موعد تسليم', `تم تغيير موعد تسليم طلب "${order.description}" إلى ${newDateVal}`);
      showToast('تم تغيير موعد التسليم بنجاح', 'success');

      setEditingDeliveryDateOrderId(null);
      setNewDateVal('');
      await loadDeliveries();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      console.error(err);
      showToast('فشل تغيير الموعد', 'error');
    }
  };

  const sendWhatsAppReminder = (order: Order) => {
    if (!order.customerName) return;
    
    // Default message template
    const text = `مرحباً ${order.customerName}، نود إعلامك من مشغل الخياطة أن طلبك (${order.description}) أصبح جاهزاً للاستلام. أهلاً بك في أي وقت!`;
    const encoded = encodeURIComponent(text);
    
    // Find customer phone or open general WhatsApp share
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  // Filter items according to active tab
  const getFilteredItems = (): UpcomingDelivery[] => {
    if (activeFilter === 'overdue') return deliveries.overdue;
    if (activeFilter === 'today') return deliveries.today;
    if (activeFilter === 'tomorrow') return deliveries.tomorrow;
    if (activeFilter === 'thisWeek') return deliveries.thisWeek;
    
    // 'all'
    return [
      ...deliveries.overdue,
      ...deliveries.today,
      ...deliveries.tomorrow,
      ...deliveries.thisWeek,
    ];
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[28px] overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 px-5 py-4 text-white shrink-0 flex items-center justify-between border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/40 text-indigo-200 rounded-2xl border border-indigo-400/30 relative">
              <Calendar size={22} />
              {deliveries.totalUrgentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                  {deliveries.totalUrgentCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <span>جدول مهام ومواعيد التسليم</span>
                <span className="text-xs bg-indigo-500/30 text-indigo-200 font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                  يومي
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                متابعة مواعيد تسليم القماش والطلبات المستحقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Browser Push Notifications Alert Banner */}
        {notificationPerm !== 'granted' ? (
          <div className="bg-amber-50 dark:bg-amber-950/70 px-4 py-3 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200 font-bold">
              <BellOff size={18} className="text-amber-600 shrink-0" />
              <span>إشعارات المتصفح غير مفعلة لتنبيهك بمواعيد اليوم.</span>
            </div>
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Bell size={14} />
              <span>تفعيل الآن</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 border-b border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-emerald-600" />
              <span>إشعارات المتصفح مفعلة للتنبيه التلقائي.</span>
            </div>
            <button
              type="button"
              onClick={handleTestNotification}
              className="text-[11px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-200 font-extrabold"
            >
              تجربة إشعار
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('today')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'today'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock size={14} />
            <span>تسليمات اليوم</span>
            {deliveries.today.length > 0 && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-extrabold ${
                activeFilter === 'today' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              }`}>
                {deliveries.today.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('overdue')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <AlertTriangle size={14} />
            <span>متأخرة</span>
            {deliveries.overdue.length > 0 && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-extrabold ${
                activeFilter === 'overdue' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {deliveries.overdue.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('tomorrow')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'tomorrow'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>تسليمات الغد</span>
            {deliveries.tomorrow.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full">
                {deliveries.tomorrow.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('thisWeek')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'thisWeek'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>خلال هذا الأسبوع</span>
            {deliveries.thisWeek.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full">
                {deliveries.thisWeek.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>الكل</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold text-sm">
              جاري تحميل جدول المواعيد...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {activeFilter === 'overdue' && 'ممتاز! لا يوجد أي طلبات متأخرة التسليم.'}
                {activeFilter === 'today' && 'لا توجد طلبات مستحقة التسليم لهذا اليوم.'}
                {activeFilter === 'tomorrow' && 'لا توجد مواعيد تسليم مجدولة للغد.'}
                {activeFilter === 'thisWeek' && 'لا توجد مواعيد تسليم إضافية خلال الأيام السبعة القادمة.'}
                {activeFilter === 'all' && 'لا توجد مواعيد تسليم قريبة قائمة حالياً.'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                سيتم إدراج الطلبات تلقائياً هنا عند تحديد "تاريخ التسليم المتوقع" في تفاصيل الطلب.
              </p>
            </div>
          ) : (
            filteredItems.map(({ order, daysRemaining, isToday, isOverdue }) => (
              <div
                key={order.id}
                className={`p-4 rounded-2xl border-2 shadow-sm transition-all bg-white dark:bg-slate-800 ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/20 dark:bg-rose-950/10'
                    : isToday
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isOverdue 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                        : isToday 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' 
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}>
                      {order.customerName ? order.customerName.charAt(0) : 'ز'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {order.customerName || 'زبون عام'}
                        </h4>
                        
                        {/* Status badge */}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          order.status === 'ready' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : order.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {order.status === 'ready' ? 'جاهز للتسليم' : order.status === 'in_progress' ? 'قيد الخياطة' : 'قيد الانتظار'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-0.5">
                        {order.description}
                      </p>
                    </div>
                  </div>

                  {/* Delivery date badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div 
                      title={order.deliveryDate ? `تاريخ التسليم: ${formatDate(order.deliveryDate)}` : ''}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          : isToday
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Clock size={14} />
                      <span>{order.deliveryDate ? getRemainingDaysText(order.deliveryDate) : 'غير محدد'}</span>
                    </div>
                  </div>
                </div>

                {/* Inline date rescheduling input if active */}
                {editingDeliveryDateOrderId === order.id ? (
                  <div className="pt-3 flex items-center gap-2">
                    <input
                      type="date"
                      value={newDateVal}
                      onChange={(e) => setNewDateVal(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleReschedule(order)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
                    >
                      حفظ الموعد
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDeliveryDateOrderId(null)}
                      className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  /* Action Buttons */
                  <div className="pt-3 flex flex-wrap items-center gap-2">
                    {order.status !== 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order, 'ready')}
                        className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                      >
                        <CheckCircle size={14} />
                        <span>تحديد كـ "جاهز"</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order, 'delivered')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <CheckCircle size={14} />
                      <span>تم التسليم للزبون</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingDeliveryDateOrderId(order.id);
                        if (order.deliveryDate) {
                          setNewDateVal(new Date(order.deliveryDate).toISOString().split('T')[0]);
                        }
                      }}
                      className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    >
                      تغيير الموعد
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            إجمالي المهام المتبقية: {filteredItems.length} طلب
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
