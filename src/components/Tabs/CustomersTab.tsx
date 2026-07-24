import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { initDB, logAction } from '../../db';
import { UserPlus, Phone, Search, Trash2, Edit, Users, X, Plus, Clock, User, MessageSquare, ChevronLeft, ArrowUpRight, MessageCircle } from 'lucide-react';
import { cn, showToast, formatIraqiWhatsAppNumber } from '../../utils';
import { NewOrderModal } from './NewOrderModal';
import { ConfirmModal } from '../ConfirmModal';

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', notes: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; activeCount: number } | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const db = await initDB();
    const all = await db.getAllFromIndex('customers', 'by-name');
    setCustomers(all);
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: '', phone: '', notes: '' });
    setIsAdding(true);
  };

  const handleOpenEditModal = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setCustomerForm({ name: customer.name, phone: customer.phone || '', notes: customer.notes || '' });
    setIsAdding(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    const db = await initDB();

    if (editingCustomer) {
      // Update existing customer
      const updated: Customer = {
        ...editingCustomer,
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        notes: customerForm.notes.trim(),
      };
      await db.put('customers', updated);
      await logAction('تعديل زبون', `تم تعديل بيانات الزبون: ${updated.name}`);
      showToast(`تم تحديث بيانات الزبون ${updated.name} بنجاح`);
    } else {
      // Add new customer
      const customer: Customer = {
        id: crypto.randomUUID(),
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        notes: customerForm.notes.trim(),
        createdAt: Date.now(),
      };
      await db.put('customers', customer);
      await logAction('إضافة زبون', `تم إضافة الزبون: ${customer.name}`);
      showToast(`تم إضافة الزبون ${customer.name} بنجاح`);
    }
    
    setCustomerForm({ name: '', phone: '', notes: '' });
    setIsAdding(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const db = await initDB();
    const orders = await db.getAllFromIndex('orders', 'by-customer', id);
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    setDeleteConfirm({ id, name, activeCount: activeOrders.length });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    const db = await initDB();

    // Preserve customer name on associated orders & accounts
    const orders = await db.getAllFromIndex('orders', 'by-date');
    for (const o of orders) {
      if (o.customerId === id) {
        o.customerName = name;
        await db.put('orders', o);
      }
    }

    const accounts = await db.getAllFromIndex('accounts', 'by-customer');
    for (const a of accounts) {
      if (a.customerId === id) {
        a.customerName = name;
        await db.put('accounts', a);
      }
    }

    await db.delete('customers', id);
    await logAction('حذف زبون', `تم حذف الزبون: ${name}`);
    showToast(`تم حذف الزبون ${name}`, 'info');
    setDeleteConfirm(null);
    loadCustomers();
  };

  const filtered = customers.filter(c => 
    c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="pb-28 pt-4 px-3 sm:px-4 max-w-3xl mx-auto space-y-6">
      {/* Top Card & Search Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  سجل الزبائن
                </h2>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {filtered.length} زبون
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                إدارة بيانات التواصل وأرشيف طلبات الخياطة
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm self-start sm:self-auto"
          >
            <UserPlus size={18} />
            <span>إضافة زبون جديد</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الزبون أو رقم الهاتف..."
            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all shadow-inner"
          />
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 dark:bg-slate-800 px-6 py-4 flex justify-between items-center text-white shrink-0 border-b border-indigo-700 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <User size={20} />
                <h3 className="text-lg font-black">
                  {editingCustomer ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsAdding(false)} 
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCustomer} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم الزبون الكامل *
                  </label>
                  <input 
                    autoFocus
                    type="text" 
                    required
                    value={customerForm.name}
                    onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 outline-none transition-all"
                    placeholder="مثال: أم أحمد"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهاتف (اختياري)
                  </label>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 outline-none transition-all text-left"
                    dir="ltr"
                    placeholder="077XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ملاحظات أو تفاصيل الدفع والذوق (اختياري)
                  </label>
                  <textarea 
                    value={customerForm.notes}
                    onChange={e => setCustomerForm({...customerForm, notes: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 outline-none transition-all min-h-[90px]"
                    placeholder="ملاحظات تفضيلات القماش، المواعيد المفضلة..."
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0 flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3 rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {editingCustomer ? 'حفظ التغييرات' : 'إضافة الزبون'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customers List Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Users size={28} />
            </div>
            <p className="text-lg font-bold">
              {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد زبائن مسجلون حالياً'}
            </p>
            {searchTerm ? (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl font-bold hover:bg-indigo-200"
              >
                مسح كلمة البحث
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleOpenAddModal}
                className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-indigo-500"
              >
                إضافة أول زبون الآن
              </button>
            )}
          </div>
        ) : (
          filtered.map(customer => (
            <div 
              key={customer.id} 
              className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-100 dark:border-indigo-800">
                    {customer.name.trim().charAt(0) || 'ز'}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {customer.name}
                    </h3>
                    {customer.phone && (
                      <a 
                        href={`tel:${customer.phone}`} 
                        className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold mt-0.5 transition-colors"
                        dir="ltr"
                      >
                        <Phone size={12} />
                        <span>{customer.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Quick actions for WhatsApp and phone call */}
                {customer.phone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a 
                      href={`https://wa.me/${formatIraqiWhatsAppNumber(customer.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      title="فتح محادثة واتساب"
                    >
                      <MessageCircle size={15} />
                      <span>واتساب</span>
                    </a>

                    <a 
                      href={`tel:${customer.phone}`} 
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 rounded-xl transition-colors"
                      title="اتصال تلفوني"
                    >
                      <Phone size={16} />
                    </a>
                  </div>
                )}
              </div>

              {customer.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 flex items-start gap-2">
                  <MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{customer.notes}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsAddingOrder(true);
                  }}
                  className="flex-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>طلب تفصيل جديد</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    localStorage.setItem('customerOrderFilter', customer.id);
                    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'orders' }));
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Clock size={14} />
                  <span>عرض الطلبات</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => handleOpenEditModal(customer, e)}
                  className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-700 transition-colors"
                  title="تعديل بيانات الزبون"
                >
                  <Edit size={16} />
                </button>

                <button 
                  type="button"
                  onClick={(e) => handleDelete(customer.id, customer.name, e)}
                  className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors"
                  title="حذف الزبون"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Order Modal Triggered from Customer */}
      {isAddingOrder && selectedCustomer && (
        <NewOrderModal 
          customer={selectedCustomer} 
          onClose={() => {
            setIsAddingOrder(false);
            setSelectedCustomer(null);
          }} 
          onSuccess={() => {
            setIsAddingOrder(false);
            setSelectedCustomer(null);
            window.dispatchEvent(new CustomEvent('changeTab', { detail: 'orders' }));
          }} 
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal 
        isOpen={!!deleteConfirm}
        title={deleteConfirm && deleteConfirm.activeCount > 0 ? "تنبيه: طلبات قائمة للزبون" : "حذف زبون"}
        message={
          deleteConfirm 
            ? deleteConfirm.activeCount > 0
              ? `الزبون "${deleteConfirm.name}" لديه ${deleteConfirm.activeCount} طلبات خياطة جارية. هل أنت متأكد من حذف الزبون؟`
              : `هل أنت متأكد من حذف الزبون "${deleteConfirm.name}"؟`
            : ''
        }
        confirmLabel="تأكيد الحذف"
        cancelLabel="إلغاء"
        variant={deleteConfirm && deleteConfirm.activeCount > 0 ? "warning" : "danger"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

