import React, { useState, useEffect } from 'react';
import { Customer, Account } from '../../types';
import { initDB, logAction } from '../../db';
import { Plus, Trash2, Search, User, FileText, X, DollarSign, BookOpen, AlertCircle, ChevronLeft, CheckCircle2, ArrowDownCircle, Layers, Calendar, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency, formatDate, showToast } from '../../utils';
import { ConfirmModal } from '../ConfirmModal';

interface GroupedCustomerDebt {
  customerId: string;
  customerName: string;
  totalOriginalDebt: number; // إجمالي الديون القديمة الأصلية (ثابتة بدون خصم)
  totalPayments: number;     // إجمالي التسديدات والدفعات
  netRemainingDebt: number;  // الصافي المتبقي من الدين
  latestDate: number;
  items: (Account & { customerName: string })[];
  debts: (Account & { customerName: string })[];
  payments: (Account & { customerName: string })[];
}

export function AccountsTab() {
  const [accounts, setAccounts] = useState<(Account & { customerName: string })[]>([]);
  const [groupedDebts, setGroupedDebts] = useState<GroupedCustomerDebt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Active selections
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<GroupedCustomerDebt | null>(null);
  const [payModalCustomer, setPayModalCustomer] = useState<{ customerId: string; customerName: string; netRemainingDebt: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; amount: number; cName: string; isPayment: boolean } | null>(null);
  
  // New Debt Form states
  const [customerInput, setCustomerInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Form states
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<GroupedCustomerDebt[]> => {
    const db = await initDB();
    const custs = await db.getAllFromIndex('customers', 'by-name');
    const accs = await db.getAllFromIndex('accounts', 'by-customer');
    
    const custMap = new Map(custs.map(c => [c.id, c.name]));
    
    const enrichedAccounts = accs.map(acc => {
      const activeName = custMap.get(acc.customerId);
      let displayName = '';
      if (activeName) {
        displayName = activeName;
        if (!acc.customerName) {
          acc.customerName = activeName;
          db.put('accounts', acc);
        }
      } else if (acc.customerName) {
        displayName = `زبون محذوف (${acc.customerName})`;
      } else {
        displayName = 'زبون محذوف';
      }

      return {
        ...acc,
        customerName: displayName
      };
    }).sort((a, b) => b.date - a.date);

    // Grouping debts & payments by customer
    const groupedMap = new Map<string, GroupedCustomerDebt>();
    enrichedAccounts.forEach(acc => {
      const key = acc.customerId || acc.customerName;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          customerId: acc.customerId,
          customerName: acc.customerName,
          totalOriginalDebt: 0,
          totalPayments: 0,
          netRemainingDebt: 0,
          latestDate: 0,
          items: [],
          debts: [],
          payments: []
        });
      }
      const group = groupedMap.get(key)!;
      group.items.push(acc);

      if (acc.type === 'payable') {
        group.payments.push(acc);
        group.totalPayments += acc.amount;
      } else {
        // default to receivable / debt
        group.debts.push(acc);
        group.totalOriginalDebt += acc.amount;
      }

      if (acc.date > group.latestDate) {
        group.latestDate = acc.date;
      }
    });

    // Calculate net remaining debt for each customer
    groupedMap.forEach(group => {
      group.netRemainingDebt = Math.max(0, group.totalOriginalDebt - group.totalPayments);
    });

    const groupedList = Array.from(groupedMap.values()).sort((a, b) => b.latestDate - a.latestDate);

    setCustomers(custs);
    setAccounts(enrichedAccounts);
    setGroupedDebts(groupedList);

    return groupedList;
  };

  const handleOpenAddModal = (initialCustName = '', initialCustId = '') => {
    setCustomerInput(initialCustName);
    setSelectedCustomerId(initialCustId);
    setShowSuggestions(false);
    setAmount('');
    setNotes('');
    setIsAddingModalOpen(true);
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerInput(val);
    setShowSuggestions(true);

    const exactMatch = customers.find(c => c.name.trim().toLowerCase() === val.trim().toLowerCase());
    if (exactMatch) {
      setSelectedCustomerId(exactMatch.id);
    } else {
      setSelectedCustomerId('');
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerInput(customer.name);
    setSelectedCustomerId(customer.id);
    setShowSuggestions(false);
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customerInput.trim();
    if (!trimmedName || !amount || parseFloat(amount) <= 0) {
      showToast('يرجى إدخال اسم الزبون ومبلغ صحيح', 'error');
      return;
    }

    const db = await initDB();
    let finalCustomerId = selectedCustomerId;
    let finalCustomerName = trimmedName;

    // Check if customer exists by name
    const existingCust = customers.find(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existingCust) {
      finalCustomerId = existingCust.id;
      finalCustomerName = existingCust.name;
    } else if (!finalCustomerId) {
      // Automatically register new customer
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name: finalCustomerName,
        phone: '',
        createdAt: Date.now()
      };
      await db.put('customers', newCustomer);
      finalCustomerId = newCustomer.id;
      await logAction('إضافة زبون تلقائياً', `تم إنشاء الزبون: ${finalCustomerName} عند تسجيل الدين`);
    }

    const debtAccount: Account = {
      id: crypto.randomUUID(),
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      type: 'receivable',
      amount: parseFloat(amount),
      description: notes.trim() || 'تسجيل دين مباشر',
      date: Date.now(),
    };
    
    await db.put('accounts', debtAccount);
    await logAction('إضافة دين جديد', `مبلغ ${formatCurrency(debtAccount.amount)} على الزبون ${finalCustomerName}`);
    showToast(`تم إضافة الدين للزبون ${finalCustomerName} بنجاح`);
    
    setIsAddingModalOpen(false);
    
    const updatedGroups = await loadData();
    // Refresh detail modal if open for this customer
    if (selectedCustomerDetail && (selectedCustomerDetail.customerId === finalCustomerId || selectedCustomerDetail.customerName === finalCustomerName)) {
      const match = updatedGroups.find(g => (g.customerId && g.customerId === finalCustomerId) || g.customerName === finalCustomerName);
      if (match) setSelectedCustomerDetail(match);
    }
  };

  // Open Payment Modal
  const handleOpenPayModal = (group: GroupedCustomerDebt) => {
    setPayModalCustomer({
      customerId: group.customerId,
      customerName: group.customerName,
      netRemainingDebt: group.netRemainingDebt
    });
    setPayAmount('');
    setPayNote('');
  };

  // Process Debt Settlement / Payment without altering original debts
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalCustomer) return;
    const pVal = parseFloat(payAmount);
    if (isNaN(pVal) || pVal <= 0) {
      showToast('يرجى إدخال مبلغ تسديد صحيح', 'error');
      return;
    }

    const db = await initDB();

    // Create a dedicated payment transaction entry
    const paymentRecord: Account = {
      id: crypto.randomUUID(),
      customerId: payModalCustomer.customerId,
      customerName: payModalCustomer.customerName,
      type: 'payable', // Payment / Settlement
      amount: pVal,
      description: payNote.trim() ? `تسديد: ${payNote.trim()}` : 'تسديد دفعة من الدين',
      date: Date.now(),
    };

    await db.put('accounts', paymentRecord);
    const noteInfo = payNote.trim() ? ` (${payNote.trim()})` : '';
    await logAction('تسديد دين جزئي', `تسديد مبلغ ${formatCurrency(pVal)} لحساب الزبون ${payModalCustomer.customerName}${noteInfo}`);
    showToast(`تم تسجيل تسديد ${formatCurrency(pVal)} للزبون ${payModalCustomer.customerName} بنجاح`);

    const targetCustId = payModalCustomer.customerId;
    const targetCustName = payModalCustomer.customerName;

    setPayModalCustomer(null);
    setPayAmount('');
    setPayNote('');

    const updatedGroups = await loadData();

    // Refresh detail modal state if open
    if (selectedCustomerDetail) {
      const match = updatedGroups.find(g => (g.customerId && g.customerId === targetCustId) || g.customerName === targetCustName);
      if (match) {
        setSelectedCustomerDetail(match);
      }
    }
  };

  const handleDeleteItem = (item: Account & { customerName: string }) => {
    const isPayment = item.type === 'payable';
    setDeleteConfirm({ 
      id: item.id, 
      amount: item.amount, 
      cName: item.customerName,
      isPayment 
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, amount, cName, isPayment } = deleteConfirm;
    const db = await initDB();
    await db.delete('accounts', id);
    const label = isPayment ? 'سجل تسديد' : 'سجل دين';
    await logAction(`حذف ${label}`, `حذف ${label} بقيمة ${formatCurrency(amount)} للزبون ${cName}`);
    showToast(`تم حذف ${label} بنجاح`, 'info');
    setDeleteConfirm(null);

    const updatedGroups = await loadData();

    // Refresh detail modal if open
    if (selectedCustomerDetail) {
      const match = updatedGroups.find(g => (g.customerId && g.customerId === selectedCustomerDetail.customerId) || g.customerName === selectedCustomerDetail.customerName);
      if (match) {
        setSelectedCustomerDetail(match);
      } else {
        setSelectedCustomerDetail(null);
      }
    }
  };

  // Filtered grouped debts by search query
  const filteredGroups = groupedDebts.filter(group => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = group.customerName.toLowerCase().includes(q);
    const notesMatch = group.items.some(item => item.description.toLowerCase().includes(q));
    return nameMatch || notesMatch;
  });

  const totalNetDebts = groupedDebts.reduce((sum, g) => sum + g.netRemainingDebt, 0);
  const totalOriginalDebtsAll = groupedDebts.reduce((sum, g) => sum + g.totalOriginalDebt, 0);
  const totalPaymentsAll = groupedDebts.reduce((sum, g) => sum + g.totalPayments, 0);

  const filteredSuggestions = customers.filter(c => 
    c.name.toLowerCase().includes(customerInput.trim().toLowerCase())
  );

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white underline decoration-rose-500 underline-offset-8">
            سجل الديون والالتزامات
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            متابعة ديون الزبائن والتسديدات الجزئية
          </p>
        </div>

        <button 
          onClick={() => handleOpenAddModal()}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-5 rounded-2xl text-base shadow-lg border-b-4 border-rose-800 active:translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          <span>إضافة دين جديد</span>
        </button>
      </div>

      {/* Total Summary Card */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/80 dark:from-rose-950/40 dark:to-slate-900 border-2 border-rose-200 dark:border-rose-900/60 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-rose-800 dark:text-rose-300 font-extrabold text-sm">
              إجمالي صافي الديون المطلوب تسديدها (عليهم)
            </p>
            <p className="text-3xl font-black text-rose-950 dark:text-rose-100 mt-0.5" dir="ltr">
              {formatCurrency(totalNetDebts)}
            </p>
          </div>
          <div className="p-3.5 bg-rose-200/70 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl">
            <BookOpen size={32} />
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-rose-200/70 dark:border-rose-900/50">
          <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-rose-100 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي الديون الأصلية</span>
            <span className="text-base font-black text-slate-800 dark:text-slate-200" dir="ltr">
              {formatCurrency(totalOriginalDebtsAll)}
            </span>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-rose-100 dark:border-slate-700">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block">إجمالي التسديدات المحصلة</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
              {formatCurrency(totalPaymentsAll)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      {groupedDebts.length > 0 && (
        <div className="relative">
          <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث عن زبون أو ملاحظة..."
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 py-3 text-base font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 focus:border-rose-500 transition-all shadow-sm"
          />
        </div>
      )}

      {/* Grouped Debts List */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-xl font-bold text-slate-600 dark:text-slate-300">
              {searchQuery ? 'لا توجد نتائج تطابق البحث' : 'لا يوجد ديون مسجلة حالياً'}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium">
              اضغط على "إضافة دين جديد" لتسجيل دين على زبون
            </p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div 
              key={group.customerId || group.customerName} 
              onClick={() => setSelectedCustomerDetail(group)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4 hover:border-rose-300 dark:hover:border-rose-700 transition-all cursor-pointer group"
            >
              <div className="p-3.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                <User size={26} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                    {group.customerName}
                  </h3>
                  {group.debts.length > 1 && (
                    <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      {group.debts.length} ديون مدمجة
                    </span>
                  )}
                  {group.totalPayments > 0 && (
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>تسديد جزئي</span>
                    </span>
                  )}
                </div>

                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>آخر حركة: {formatDate(group.latestDate)}</span>
                  </span>
                  {group.totalPayments > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      • تم تسديد: {formatCurrency(group.totalPayments)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left flex flex-col items-end gap-2 flex-shrink-0">
                {group.netRemainingDebt > 0 ? (
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block text-left">الصافي المتبقي</span>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400" dir="ltr">
                      {formatCurrency(group.netRemainingDebt)}
                    </p>
                  </div>
                ) : (
                  <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    تم التسديد بالكامل
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPayModal(group);
                    }}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    title="تسديد مبلغ أو دفعة جزئية"
                  >
                    <ArrowDownCircle size={15} />
                    <span>تسديد</span>
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerDetail(group);
                    }}
                    className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                    title="عرض تفاصيل الديون والتسديدات"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Debts Details Modal (Complete Breakdown) */}
      {selectedCustomerDetail && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedCustomerDetail(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User size={22} className="text-rose-500" />
                  <span>حساب الزبون: {selectedCustomerDetail.customerName}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  تراكمات الديون القديمة وسجل التسديدات الجزئية
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedCustomerDetail(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Financial Summary Panel */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300 font-bold">الصافي المتبقي المطلوب تسديده</p>
                  <p className="text-2xl font-black text-rose-400 mt-0.5" dir="ltr">
                    {formatCurrency(selectedCustomerDetail.netRemainingDebt)}
                  </p>
                </div>
                <button 
                  onClick={() => handleOpenPayModal(selectedCustomerDetail)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl text-sm shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <ArrowDownCircle size={18} />
                  <span>تسديد مبلغ</span>
                </button>
              </div>
            </div>

            {/* Individual Records List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
              {(() => {
                const displayItems = selectedCustomerDetail.items;

                if (displayItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      لا يوجد حركات مسجلة
                    </div>
                  );
                }

                return displayItems.map(item => {
                  const isPayment = item.type === 'payable';
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all",
                        isPayment 
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" 
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <div className="p-2 rounded-xl flex-shrink-0 text-white shadow-sm font-bold" style={{ backgroundColor: isPayment ? '#10b981' : '#f43f5e' }}>
                        {isPayment ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full border",
                            isPayment 
                              ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300"
                              : "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border-rose-300"
                          )}>
                            {isPayment ? 'تسديد جزئي' : 'دين أصل ثابت'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug mt-1">
                          {item.description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          {formatDate(item.date)}
                        </p>
                      </div>

                      <div className="text-left flex items-center gap-2.5 flex-shrink-0">
                        <span className={cn(
                          "text-base font-black",
                          isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )} dir="ltr">
                          {isPayment ? `- ${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                          title="حذف هذا السجل"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedCustomerDetail.customerName, selectedCustomerDetail.customerId)}
                className="text-xs text-rose-600 dark:text-rose-400 font-extrabold hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                <span>إضافة دين جديد لهذا الزبون</span>
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedCustomerDetail(null)}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Settlement / Payment Modal */}
      {payModalCustomer && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPayModalCustomer(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownCircle size={22} className="text-emerald-500" />
                  <span>تسديد جزء من الدين</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  الزبون: {payModalCustomer.customerName}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setPayModalCustomer(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Total Banner */}
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">الصافي المتبقي قبل التسديد:</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400" dir="ltr">
                {formatCurrency(payModalCustomer.netRemainingDebt)}
              </span>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-700 dark:text-slate-200 font-bold text-sm">
                    مبلغ التسديد الحالي
                  </label>
                  {payModalCustomer.netRemainingDebt > 0 && (
                    <button 
                      type="button"
                      onClick={() => setPayAmount(payModalCustomer.netRemainingDebt.toString())}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline"
                    >
                      تسديد المتبقي بالكامل ({formatCurrency(payModalCustomer.netRemainingDebt)})
                    </button>
                  )}
                </div>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="أدخل المبلغ المسدد..."
                  dir="ltr"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-800 dark:text-white text-left placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5 text-sm">
                  ملاحظة / تفاصيل الدفعة (اختياري)
                </label>
                <input 
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="مثال: دفعة أولى / تسديد نقدي / تحويل..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-3.5 rounded-2xl shadow-md border-b-4 border-emerald-800 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  <span>تأكيد وتسجيل التسديد</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setPayModalCustomer(null)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base py-3.5 rounded-2xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Adding New Debt */}
      {isAddingModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsAddingModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">إضافة دين جديد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  تسجيل مبلغ مطلوب من زبون
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddingModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddDebt} className="space-y-4">
              {/* Customer Name with Autocomplete */}
              <div className="relative">
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                  <User size={16} className="text-rose-500" />
                  <span>اسم الزبون</span>
                </label>
                <input 
                  type="text"
                  required
                  value={customerInput}
                  onChange={handleCustomerInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="ابتدئ بكتابة اسم الزبون..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 focus:border-rose-500 transition-all"
                />

                {/* Dropdown Suggestions */}
                {showSuggestions && customerInput.trim().length > 0 && (
                  <div className="absolute top-full right-0 left-0 z-50 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-100">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(c);
                          }}
                          className="w-full text-right px-4 py-3 hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center justify-between font-bold text-slate-800 dark:text-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-rose-500" />
                            <span>{c.name}</span>
                          </div>
                          {c.phone && (
                            <span className="text-xs text-slate-400 font-medium" dir="ltr">{c.phone}</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>زبون جديد (سيتم تسجيله تلقائياً)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount Required */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                  <DollarSign size={16} className="text-rose-500" />
                  <span>المبلغ المطلوب</span>
                </label>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-800 dark:text-white text-left placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                  <FileText size={16} className="text-rose-500" />
                  <span>الملاحظات والتفاصيل</span>
                </label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات أو تفاصيل حول هذا الدين..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 focus:border-rose-500 transition-all resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-base py-3.5 rounded-2xl shadow-md border-b-4 border-rose-800 active:translate-y-0.5 transition-all"
                >
                  حفظ الدين
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddingModalOpen(false)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base py-3.5 rounded-2xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteConfirm}
        title={deleteConfirm?.isPayment ? "حذف سجل تسديد" : "حذف سجل دين"}
        message={
          deleteConfirm 
            ? `هل أنت متأكد من حذف ${deleteConfirm.isPayment ? 'سجل التسديد' : 'سجل الدين'} بقيمة ${formatCurrency(deleteConfirm.amount)} المسجل للزبون "${deleteConfirm.cName}"؟`
            : ''
        }
        confirmLabel="تأكيد الحذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}



