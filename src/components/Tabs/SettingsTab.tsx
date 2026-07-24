import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Type, Download, Wifi, WifiOff, CheckCircle2, Smartphone, Database, Upload, ShieldCheck, RefreshCw, Cloud, CloudUpload, CloudDownload, LogOut, Bell, Calendar, X, ExternalLink, HelpCircle, Sparkles, Share2, MoreVertical } from 'lucide-react';
import { showToast } from '../../utils';
import { initDB, logAction } from '../../db';
import { HistoryTab } from './HistoryTab';
import { initAuth, googleSignIn, backupToGoogleDrive, restoreFromGoogleDrive, logoutGoogle } from '../../lib/googleDrive';
import { User } from 'firebase/auth';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function SettingsTab() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || 'medium';
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as any).deferredInstallPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsDriveSyncing(true);
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
        showToast(`تم تسجيل الدخول بحساب Google: ${res.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message || 'فشل تسجيل الدخول بحساب Google', 'error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    showToast('تم تسجيل الخروج من Google', 'info');
  };

  const handleDriveBackup = async () => {
    try {
      setIsDriveSyncing(true);
      const db = await initDB();
      const customers = await db.getAll('customers');
      const accounts = await db.getAll('accounts');
      const orders = await db.getAll('orders');
      const history = await db.getAll('history');

      const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        appName: 'Pixel Tailoring',
        data: { customers, accounts, orders, history }
      };

      const result = await backupToGoogleDrive(backupData);
      await logAction('نسخة Google Drive', `تم رفع نسخة احتياطية إلى Google Drive (${customers.length} زبون، ${orders.length} طلب)`);
      showToast(`تم حفظ النسخة الاحتياطية بنجاح على Google Drive! (${result.name})`, 'success');
    } catch (err: any) {
      console.error('Drive backup error:', err);
      showToast(err.message || 'فشل رفع النسخة الاحتياطية إلى Google Drive', 'error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    try {
      setIsDriveSyncing(true);
      const backup = await restoreFromGoogleDrive();

      if (!backup || !backup.data) {
        showToast('ملف النسخة الاحتياطية على Google Drive غير صالح', 'error');
        return;
      }

      const { customers = [], accounts = [], orders = [], history = [] } = backup.data;

      const confirmRestore = window.confirm(
        `هل أنت متأكد من استعادة النسخة من Google Drive؟\nتحتوي النسخة على:\n- ${customers.length} زبون\n- ${orders.length} طلب خياطة\n- ${accounts.length} سجل مالي`
      );

      if (!confirmRestore) return;

      const db = await initDB();

      for (const customer of customers) {
        await db.put('customers', customer);
      }
      for (const account of accounts) {
        await db.put('accounts', account);
      }
      for (const order of orders) {
        await db.put('orders', order);
      }
      for (const item of history) {
        await db.put('history', item);
      }

      await logAction('استعادة Google Drive', `تمت استعادة البيانات بنجاح من Google Drive`);
      showToast('تمت استعادة جميع البيانات من Google Drive بنجاح!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error('Drive restore error:', err);
      showToast(err.message || 'تعذر استعادة النسخة الاحتياطية من Google Drive', 'error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  useEffect(() => {
    setIsInIframe(window.self !== window.top);

    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    if ((window as any).deferredInstallPrompt) {
      setDeferredPrompt((window as any).deferredInstallPrompt);
    }

    const handleInstallable = () => {
      if ((window as any).deferredInstallPrompt) {
        setDeferredPrompt((window as any).deferredInstallPrompt);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const db = await initDB();
      const customers = await db.getAll('customers');
      const accounts = await db.getAll('accounts');
      const orders = await db.getAll('orders');
      const history = await db.getAll('history');

      const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        appName: 'Pixel Tailoring',
        data: {
          customers,
          accounts,
          orders,
          history
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `pixel_tailor_backup_${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await logAction('نسخة احتياطية', `تم تصدير نسخة احتياطية شاملة (${customers.length} زبون، ${orders.length} طلب)`);
      showToast('تم تصدير وتنزيل ملف النسخة الاحتياطية بنجاح!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('تعذر تصدير النسخة الاحتياطية', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup || !backup.data) {
        showToast('ملف النسخة الاحتياطية غير صالح أو تالف', 'error');
        return;
      }

      const { customers = [], accounts = [], orders = [], history = [] } = backup.data;

      const confirmRestore = window.confirm(
        `هل أنت متأكد من استعادة النسخة الاحتياطية؟\nتحتوي النسخة على:\n- ${customers.length} زبون\n- ${orders.length} طلب خياطة\n- ${accounts.length} حساب مالي`
      );

      if (!confirmRestore) return;

      const db = await initDB();

      // Put imported items into IndexedDB
      for (const customer of customers) {
        await db.put('customers', customer);
      }
      for (const account of accounts) {
        await db.put('accounts', account);
      }
      for (const order of orders) {
        await db.put('orders', order);
      }
      for (const item of history) {
        await db.put('history', item);
      }

      await logAction('استعادة نسخة احتياطية', `تمت استعادة البيانات من ملف ${file.name}`);
      showToast('تمت استعادة جميع البيانات بنجاح!', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error('Import error:', err);
      showToast('خطأ في قراءة ملف النسخة الاحتياطية', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('تم البدء في تنصيب نظام بكسل على جهازك بنجاح!', 'success');
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
      } catch (e) {
        console.error('Install error:', e);
        setShowInstallGuideModal(true);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const toggleDarkMode = () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    showToast(nextVal ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح', 'info');
  };

  const changeFontSize = (sizeId: string) => {
    setFontSize(sizeId);
    const labels: Record<string, string> = { small: 'صغير', medium: 'متوسط', large: 'كبير' };
    showToast(`تم تغيير حجم الخط إلى: ${labels[sizeId] || sizeId}`, 'info');
  };

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    let rootSize = '16px';
    if (fontSize === 'small') rootSize = '14px';
    if (fontSize === 'large') rootSize = '18px';
    document.documentElement.style.fontSize = rootSize;
  }, [fontSize]);

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white underline decoration-blue-500 underline-offset-8 mb-6">الإعدادات</h2>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 space-y-8">
        
        {/* PWA & Offline Support Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تثبيت التطبيق والعمل أوفلاين</h3>
                <p className="text-xs text-indigo-200/80">تطبيق تطبيق ويب تقدمي (PWA) يعمل بدون إنترنت</p>
              </div>
            </div>

            {isInstalled ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                <CheckCircle2 size={14} />
                <span>مثبّت على الجهاز</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download size={16} />
                <span>تنصيب التطبيق</span>
              </button>
            )}
          </div>

          <div className="pt-2 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              {isOnline ? (
                <Wifi size={18} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <WifiOff size={18} className="text-amber-400 flex-shrink-0" />
              )}
              <div>
                <span className="text-slate-400 font-medium block">حالة الاتصال:</span>
                <span className={`font-black ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isOnline ? 'متصل بالإنترنت' : 'يعمل أوفلاين (بدون إنترنت)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        {/* Notifications & Daily Deliveries Agenda Settings Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">إشعارات المتصفح ومواعيد اليوم</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">تنبيهات تلقائية لمواعيد تسليم الخياطة المستحقة والمتأخرة</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openDailyTasksModal'))}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Calendar size={15} />
              <span>فتح جدول المواعيد</span>
            </button>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {darkMode ? <Moon size={24} className="text-indigo-400" /> : <Sun size={24} className="text-orange-500" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">الوضع الداكن</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">تغيير مظهر التطبيق إلى الألوان الداكنة</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={toggleDarkMode}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}
          >
            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${darkMode ? 'translate-x-0' : '-translate-x-6'}`} />
          </button>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        {/* Font Size */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <Type size={24} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">حجم الخط</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">تغيير حجم النصوص في التطبيق</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            {[
              { id: 'small', label: 'صغير' },
              { id: 'medium', label: 'متوسط' },
              { id: 'large', label: 'كبير' }
            ].map(size => (
              <button
                key={size.id}
                type="button"
                onClick={() => changeFontSize(size.id)}
                className={`flex-1 py-2 font-bold rounded-lg transition-all ${fontSize === size.id ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        {/* Backup and Restore Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">النسخ الاحتياطي والاستعادة</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">احفظ بياناتك واسترجعها عبر سحابة Google Drive بسهولة وآمان</p>
            </div>
          </div>

          {/* Google Drive Integration Box */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-slate-800 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-indigo-100 dark:border-slate-700">
                  <Cloud size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Drive Cloud Backup</span>
                    {googleUser && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        متصل
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {googleUser ? googleUser.email : 'قم بربط حسابك لحفظ واستعادة البيانات تلقائياً على السحابة'}
                  </p>
                </div>
              </div>

              {googleUser ? (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <LogOut size={14} />
                  <span>تسجيل الخروج</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isDriveSyncing}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold px-4 py-2.5 rounded-xl text-xs border-2 border-slate-300 dark:border-slate-600 shadow-sm transition-all flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>تسجيل الدخول بـ Google</span>
                </button>
              )}
            </div>

            {googleUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                <button
                  type="button"
                  onClick={handleDriveBackup}
                  disabled={isDriveSyncing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold p-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  {isDriveSyncing ? <RefreshCw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                  <span>رفع نسخة إلى Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handleDriveRestore}
                  disabled={isDriveSyncing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold p-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  {isDriveSyncing ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                  <span>استعادة نسخة من Google Drive</span>
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/80">
                اضغط على زر "تسجيل الدخول بـ Google" لربط تطبيقك مع Google Drive لحفظ نسختك السحابية بضغطة زر.
              </p>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>أمان وحفظ البيانات:</span>
            </div>
            <p className="leading-relaxed">
              عند استخدام Google Drive، تظل جميع النسخ خفية وآمنة وخاصة بحسابك فقط، ويمكنك استعادتها بضغطة زر في أي وقت.
            </p>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        {/* History Section */}
        <HistoryTab />

        {/* Install Guide Modal */}
        {showInstallGuideModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-5 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-sm">
                    <Smartphone size={24} className="text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">تثبيت نظام بكسل على جهازك</h3>
                    <p className="text-xs text-indigo-200 font-medium">خطوات بسيطة لإضافة التطبيق لشاشتك الرئيسية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all text-white backdrop-blur-sm relative z-10 active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto text-slate-800 dark:text-slate-100 text-sm">
                
                {/* Notice if in iframe / preview mode */}
                {isInIframe && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/60 dark:to-slate-800/80 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold">
                      <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>تصفح التطبيق في نافذة جديدة للتثبيت المباشر</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      أنت حالياً تتصفح التطبيق داخل نافذة المعاينة. لتثبيت نظام بكسل مباشرة كـ تطبيق حقيقي على الهاتف أو الكمبيوتر، يُرجى فتح رابط التطبيق في نافذة متصفح مستقلة.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <ExternalLink size={16} />
                      <span>فتح التطبيق في نافذة جديدة مستقلة</span>
                    </button>
                  </div>
                )}

                {/* Direct Trigger Button if Prompt is ready */}
                {(deferredPrompt || (window as any).deferredInstallPrompt) && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">التثبيت المباشر متاح الآن!</h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">اضغط للبدء في تثبيت التطبيق فوراً</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                    >
                      <Download size={16} />
                      <span>تثبيت الآن</span>
                    </button>
                  </div>
                )}

                {/* Manual Steps Guide */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <HelpCircle size={18} className="text-indigo-500" />
                    <span>طريقة التثبيت اليدوي من المتصفح:</span>
                  </h4>

                  {/* Android / Chrome */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px]">1</span>
                      <span>على متصفح كروم / أندرويد (Google Chrome):</span>
                    </div>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside pr-2 leading-relaxed">
                      <li>اضغط على قائمة المتصفح (النقاط الثلاث <MoreVertical size={14} className="inline text-slate-500" /> أعلى أو أسفل الشاشة).</li>
                      <li>اختر <b>"تثبيت التطبيق"</b> (Install app) أو <b>"إضافة إلى الشاشة الرئيسية"</b> (Add to Home screen).</li>
                      <li>تأكيد التثبيت وسينزل التطبيق على شاشتك الرئيسية مباشرة.</li>
                    </ul>
                  </div>

                  {/* iPhone / Safari */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px]">2</span>
                      <span>على هواتف آيفون / متصفح سفاري (iPhone Safari):</span>
                    </div>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside pr-2 leading-relaxed">
                      <li>اضغط على زر المشاركة (<Share2 size={14} className="inline text-indigo-500" /> Share) في أسفل الشاشة.</li>
                      <li>اسحب القائمة لأسفل واختر <b>"إضافة إلى الشاشة الرئيسية"</b> (Add to Home Screen).</li>
                      <li>اضغط على <b>"إضافة"</b> (Add) بالأعلى لتثبيته كتطبيق مستقل.</li>
                    </ul>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold px-5 py-2 rounded-xl text-xs transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


