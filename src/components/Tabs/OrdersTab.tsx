import React, { useState, useEffect } from 'react';
import { Customer, Order } from '../../types';
import { initDB, logAction } from '../../db';
import { Trash2, CheckCircle, Clock, XCircle, Scissors, PackageCheck, Edit, RefreshCw, X, Search, Calendar, Shirt, Ruler, ChevronDown, ChevronUp, Sparkles, Filter, ArrowUpDown } from 'lucide-react';
import { cn, formatCurrency, formatDate, getRemainingDaysText, showToast } from '../../utils';
import { NewOrderModal } from './NewOrderModal';
import { ConfirmModal } from '../ConfirmModal';

export function OrdersTab() {
  const [orders, setOrders] = useState<(Order & { customerName: string })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState<{ order: Order; customer: Customer } | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<(Order & { customerName: string }) | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'delivery' | 'newest'>('delivery');

  const [statusConfirm, setStatusConfirm] = useState<{ orderId: string; newStatus: Order['status']; desc: string; cName: string; statusNameAr: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; desc: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await initDB();
    const custs = await db.getAllFromIndex('customers', 'by-name');
    let ords = await db.getAllFromIndex('orders', 'by-date');
    
    const filter = localStorage.getItem('customerOrderFilter');
    if (filter) {
      ords = ords.filter(o => o.customerId === filter);
      setCustomerFilter(filter);
    } else {
      setCustomerFilter(null);
    }
    
    const custMap = new Map(custs.map(c => [c.id, c.name]));
    
    const enrichedOrders = ords.map(ord => {
      const activeName = custMap.get(ord.customerId);
      let displayName = '';
      if (activeName) {
        displayName = activeName;
        if (!ord.customerName) {
          ord.customerName = activeName;
          db.put('orders', ord);
        }
      } else if (ord.customerName) {
        displayName = `زبون محذوف (${ord.customerName})`;
      } else {
        displayName = 'زبون محذوف';
      }

      return {
        ...ord,
        customerName: displayName
      };
    }).sort((a, b) => b.date - a.date);

    setCustomers(custs);
    setOrders(enrichedOrders);
  };

  const updateStatus = async (id: string, status: Order['status'], desc: string, cName: string, statusNameAr: string) => {
    const db = await initDB();
    const order = await db.get('orders', id);
    if (order) {
      order.status = status;
      await db.put('orders', order);
      await logAction('تحديث طلب', `تحديث حالة طلب "${desc}" للزبون ${cName} إلى: ${statusNameAr}`);
      showToast(`تم تحديث حالة الطلب إلى: ${statusNameAr}`);
      loadData();
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status'], desc: string, cName: string, statusNameAr: string) => {
    setStatusConfirm({ orderId, newStatus, desc, cName, statusNameAr });
  };

  const confirmStatusChange = () => {
    if (!statusConfirm) return;
    const { orderId, newStatus, desc, cName, statusNameAr } = statusConfirm;
    updateStatus(orderId, newStatus, desc, cName, statusNameAr);
    setStatusConfirm(null);
  };

  const handleDelete = (id: string, desc: string) => {
    setDeleteConfirm({ id, desc });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, desc } = deleteConfirm;
    const db = await initDB();
    await db.delete('orders', id);
    await logAction('حذف طلب', `تم حذف الطلب: ${desc}`);
    showToast('تم حذف الطلب', 'info');
    setDeleteConfirm(null);
    loadData();
  };

  const getStatusDisplay = (status: Order['status']) => {
    switch(status) {
      case 'pending': return { label: 'قيد الانتظار', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/70', border: 'border-amber-300 dark:border-amber-800' };
      case 'in_progress': return { label: 'قيد التنفيذ', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-950/70', border: 'border-indigo-300 dark:border-indigo-800' };
      case 'ready': return { label: 'جاهز للتسليم', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/70', border: 'border-emerald-300 dark:border-emerald-800' };
      case 'delivered': 
      case 'completed': return { label: 'تم التسليم', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-950/70', border: 'border-purple-300 dark:border-purple-800' };
      case 'cancelled': return { label: 'ملغي', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-950/70', border: 'border-rose-300 dark:border-rose-800' };
      default: return { label: 'قيد الانتظار', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-900', border: 'border-slate-300 dark:border-slate-700' };
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch(status) {
      case 'pending': return <Clock className="text-amber-500" size={18} />;
      case 'in_progress': return <Scissors className="text-indigo-500" size={18} />;
      case 'ready': return <CheckCircle className="text-emerald-500" size={18} />;
      case 'delivered':
      case 'completed': return <PackageCheck className="text-purple-500" size={18} />;
      case 'cancelled': return <XCircle className="text-rose-500" size={18} />;
      default: return <Clock className="text-amber-500" size={18} />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.trim().toLowerCase();
    const nameMatch = (order.customerName || '').toLowerCase().includes(query);
    const descMatch = (order.description || '').toLowerCase().includes(query);

    return nameMatch || descMatch;
  }).sort((a, b) => {
    if (sortBy === 'delivery') {
      if (a.deliveryDate && b.deliveryDate) {
        return a.deliveryDate - b.deliveryDate;
      }
      if (a.deliveryDate && !b.deliveryDate) return -1;
      if (!a.deliveryDate && b.deliveryDate) return 1;
      return b.date - a.date;
    }
    return b.date - a.date;
  });

  return (
    <div className="pb-28 pt-4 px-3 sm:px-4 max-w-3xl mx-auto space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Scissors size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  طلبات التفصيل والخياطة
                </h2>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {filteredOrders.length} طلب
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                متابعة حالة خياطة الفساتين والقطع والمواعيد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openDailyTasksModal'))}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Calendar size={15} />
              <span>جدول التسليم والمهام اليومية</span>
            </button>

            {customerFilter && (
              <button 
                onClick={() => {
                  localStorage.removeItem('customerOrderFilter');
                  loadData();
                }}
                className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
              >
                <X size={14} />
                <span>عرض جميع الطلبات (إلغاء الفلتر)</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الزبون، نوع الطلب، الملاحظات..."
            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all shadow-inner"
          />
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sorting Options Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-1 border-t border-slate-100 dark:border-slate-700/60 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-extrabold">
            <ArrowUpDown size={14} className="text-indigo-500" />
            <span>ترتيب حسب:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSortBy('delivery')}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg font-black transition-all flex items-center gap-1.5 active:scale-95",
                sortBy === 'delivery'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Clock size={13} />
              <span>الأقرب تسليماً</span>
            </button>

            <button
              type="button"
              onClick={() => setSortBy('newest')}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg font-black transition-all flex items-center gap-1.5 active:scale-95",
                sortBy === 'newest'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Calendar size={13} />
              <span>الأحدث تاريخاً</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'pending', label: 'انتظار' },
            { value: 'in_progress', label: 'تنفيذ' },
            { value: 'ready', label: 'جاهز' },
            { value: 'delivered', label: 'تسليم' },
            { value: 'cancelled', label: 'ملغي' },
          ].map(status => {
            const count = status.value === 'all' 
              ? orders.length 
              : orders.filter(o => o.status === status.value || (status.value === 'delivered' && o.status === 'completed')).length;

            return (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value as Order['status'] | 'all')}
                className={cn(
                  "px-1.5 sm:px-2.5 py-2 text-xs rounded-xl font-bold transition-all flex items-center justify-center gap-1 border-2 active:scale-95 text-center",
                  statusFilter === status.value 
                    ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-500 shadow-sm" 
                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span className="truncate">{status.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] sm:text-[11px] font-black shrink-0",
                  statusFilter === status.value 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Shirt size={28} />
            </div>
            <p className="text-lg font-bold">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد طلبات مسجلة في هذا التصنيف'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl font-bold hover:bg-indigo-200"
              >
                مسح كلمة البحث
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map(order => {
            const statusDisplay = getStatusDisplay(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div 
                key={order.id} 
                className={cn(
                  "bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 transition-all shadow-sm flex flex-col gap-4 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600",
                  isExpanded ? "border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-200 dark:border-slate-700"
                )}
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/80 pb-4 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-100 dark:border-indigo-800">
                        <Shirt size={16} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {order.customerName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Calendar size={12} className="text-slate-400" />
                        <span>تاريخ الطلب: {formatDate(order.date)}</span>
                      </span>

                      {order.deliveryDate && (
                        <span 
                          title={`تاريخ التسليم المحدد: ${formatDate(order.deliveryDate)}`}
                          className={cn(
                            "flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-lg border text-xs shadow-sm transition-colors",
                            getRemainingDaysText(order.deliveryDate).startsWith('متأخر')
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800"
                              : "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                          )}
                        >
                          <Clock size={13} className={getRemainingDaysText(order.deliveryDate).startsWith('متأخر') ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"} />
                          <span>التسليم: {getRemainingDaysText(order.deliveryDate)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">
                      {formatCurrency(order.price)}
                    </p>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setStatusModalOrder(order); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${statusDisplay.bg} ${statusDisplay.border}`}
                      title="اضغط لتغيير حالة الطلب"
                    >
                      {getStatusIcon(order.status)}
                      <span className={`text-xs sm:text-sm font-extrabold ${statusDisplay.color}`}>
                        {statusDisplay.label}
                      </span>
                      <RefreshCw size={12} className={`mr-0.5 ${statusDisplay.color} opacity-70`} />
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details: Description, Photo & Measurements */}
                {isExpanded && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                    {/* Order Description */}
                    <div className="text-slate-800 dark:text-slate-200 text-base font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">تفاصيل الطلب والقماش:</p>
                      {order.description}
                    </div>

                    {order.photo && (
                      <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 max-w-sm mx-auto shadow-md">
                        <img src={order.photo} alt="صورة الموديل" className="w-full h-auto max-h-72 object-cover" />
                      </div>
                    )}

                    {order.measurements && Object.values(order.measurements).some(v => v) && (
                      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/60 space-y-3">
                        <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                          <Ruler size={16} className="text-indigo-600 dark:text-indigo-400" />
                          <span>القياسات الخاصة بالطلب (سم)</span>
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'shoulder', label: 'الكتف' },
                            { id: 'bust', label: 'الصدر' },
                            { id: 'waist', label: 'الخصر' },
                            { id: 'hips', label: 'الورك' },
                            { id: 'sleeve', label: 'الردن' },
                            { id: 'yokeLength', label: 'طول الزخمة' },
                            { id: 'skirtLength', label: 'طول التنورة' },
                            { id: 'dressLength', label: 'طول الفستان' },
                            { id: 'pantsLength', label: 'طول البنطرون' },
                          ].map(field => {
                            const val = order.measurements![field.id as keyof typeof order.measurements];
                            if (!val) return null;
                            return (
                              <div key={field.id} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-indigo-100 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{field.label}</span>
                                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5" dir="ltr">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Expand Indicator & Action buttons */}
                <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100 dark:border-slate-700/80">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والقياسات'}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {order.status === 'pending' && (
                      <button 
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'in_progress', order.description, order.customerName, 'قيد التنفيذ')}
                        className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-900 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        بدء الخياطة
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button 
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'ready', order.description, order.customerName, 'جاهز')}
                        className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        جاهز للتسليم
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'delivered', order.description, order.customerName, 'تم التسليم')}
                        className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        تسليم للزبون
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => { 
                        const cust = customers.find(c => c.id === order.customerId) || {
                          id: order.customerId,
                          name: order.customerName,
                          phone: '',
                          date: Date.now()
                        };
                        setEditingOrder({ order, customer: cust });
                      }}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                      title="تعديل الطلب"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDelete(order.id, order.description)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="حذف الطلب"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <NewOrderModal 
          customer={editingOrder.customer}
          orderToEdit={editingOrder.order}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            loadData();
          }}
        />
      )}

      {/* Change Status Dialog Modal */}
      {statusModalOrder && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setStatusModalOrder(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">تحديث حالة الطلب</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  الزبون: {statusModalOrder.customerName}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setStatusModalOrder(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              الطلب: {statusModalOrder.description}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {[
                { status: 'pending', label: 'قيد الانتظار', desc: 'في انتظار بداية التفصيل والقص', icon: Clock, bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-slate-200 dark:border-slate-700', activeBg: 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200' },
                { status: 'in_progress', label: 'قيد التنفيذ والخياطة', desc: 'جاري العمل والماكينة', icon: Scissors, bg: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-slate-200 dark:border-slate-700', activeBg: 'bg-indigo-100 dark:bg-indigo-950 border-indigo-400 text-indigo-900 dark:text-indigo-200' },
                { status: 'ready', label: 'جاهز للتسليم', desc: 'تم إنجاز القطعة وتنتظر الاستلام', icon: CheckCircle, bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-slate-200 dark:border-slate-700', activeBg: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-900 dark:text-emerald-200' },
                { status: 'delivered', label: 'تم التسليم', desc: 'تم تسليم القطعة للزبون بنجاح', icon: PackageCheck, bg: 'hover:bg-purple-50 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-slate-200 dark:border-slate-700', activeBg: 'bg-purple-100 dark:bg-purple-950 border-purple-400 text-purple-900 dark:text-purple-200' },
                { status: 'cancelled', label: 'ملغي', desc: 'تم إلغاء الطلب', icon: XCircle, bg: 'hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-slate-200 dark:border-slate-700', activeBg: 'bg-rose-100 dark:bg-rose-950 border-rose-400 text-rose-900 dark:text-rose-200' },
              ].map(item => {
                const IconComponent = item.icon;
                const isCurrent = statusModalOrder.status === item.status;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => {
                      const targetOrder = statusModalOrder;
                      setStatusModalOrder(null);
                      if (targetOrder.status !== item.status) {
                        handleStatusChange(targetOrder.id, item.status as Order['status'], targetOrder.description, targetOrder.customerName, item.label);
                      }
                    }}
                    className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between text-right transition-all font-bold ${isCurrent ? item.activeBg : `bg-slate-50 dark:bg-slate-900 ${item.bg}`}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold">{item.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{item.desc}</div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-0.5 rounded-full font-black">الحالية</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!statusConfirm}
        title="تغيير حالة الطلب"
        message={statusConfirm ? `هل أنت متأكد من تغيير حالة طلب "${statusConfirm.desc}" إلى "${statusConfirm.statusNameAr}"؟` : ''}
        confirmLabel="تغيير"
        cancelLabel="إلغاء"
        variant="info"
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusConfirm(null)}
      />

      <ConfirmModal 
        isOpen={!!deleteConfirm}
        title="حذف الطلب"
        message={deleteConfirm ? `هل أنت متأكد من حذف طلب "${deleteConfirm.desc}"؟` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
