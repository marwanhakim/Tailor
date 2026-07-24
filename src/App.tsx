import { useState, useEffect } from 'react';
import { TabType } from './types';
import { BottomNav } from './components/BottomNav';
import { CustomersTab } from './components/Tabs/CustomersTab';
import { AccountsTab } from './components/Tabs/AccountsTab';
import { OrdersTab } from './components/Tabs/OrdersTab';
import { SettingsTab } from './components/Tabs/SettingsTab';
import { ToastContainer } from './components/Toast';
import { DailyTasksModal } from './components/DailyTasksModal';
import { AppStartupNotificationModal } from './components/AppStartupNotificationModal';
import { IntroSplashScreen } from './components/IntroSplashScreen';
import { initDB } from './db';
import { Scissors, Ruler, Sparkles, Bell } from 'lucide-react';
import { getUpcomingDeliveries, checkAndNotifyDeliveries, UpcomingDelivery } from './utils/notifications';
import { performAutoDriveBackup, initAuth } from './lib/googleDrive';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [showIntro, setShowIntro] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isDailyTasksOpen, setIsDailyTasksOpen] = useState(false);
  const [isStartupModalOpen, setIsStartupModalOpen] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const [deliveriesData, setDeliveriesData] = useState<{
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

  const refreshUrgentDeliveries = async () => {
    const data = await getUpcomingDeliveries();
    setDeliveriesData(data);
    setUrgentCount(data.totalUrgentCount);
  };

  useEffect(() => {
    // Initialize Theme and Font Size
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
    
    const fSize = localStorage.getItem('fontSize') || 'medium';
    let rootSize = '16px';
    if (fSize === 'small') rootSize = '14px';
    if (fSize === 'large') rootSize = '18px';
    document.documentElement.style.fontSize = rootSize;

    // Initialize DB & check notifications & perform auto Google Drive backup
    initDB().then(async () => {
      const data = await getUpcomingDeliveries();
      setDeliveriesData(data);
      setUrgentCount(data.totalUrgentCount);
      checkAndNotifyDeliveries();

      // Show startup alert notification modal if there are overdue or near deliveries
      const hasSeenNotify = sessionStorage.getItem('hasSeenStartupDeliveryNotify');
      if (!hasSeenNotify && (data.overdue.length > 0 || data.today.length > 0 || data.tomorrow.length > 0)) {
        setIsStartupModalOpen(true);
        sessionStorage.setItem('hasSeenStartupDeliveryNotify', 'true');
      }

      // Silent Auto Backup to Google Drive if user is logged in
      initAuth(() => {
        performAutoDriveBackup();
      });
      performAutoDriveBackup();
    }).catch(console.error);

    let syncTimer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowSyncSuccess(true);
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        setShowSyncSuccess(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowSyncSuccess(false);
    };
    
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      setActiveTab(customEvent.detail);
    };

    const handleOpenDailyTasks = () => {
      setIsDailyTasksOpen(true);
      refreshUrgentDeliveries();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('changeTab', handleTabChange);
    window.addEventListener('openDailyTasksModal', handleOpenDailyTasks);

    return () => {
      clearTimeout(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('changeTab', handleTabChange);
      window.removeEventListener('openDailyTasksModal', handleOpenDailyTasks);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 transition-colors">
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-bold sticky top-0 z-50">
          أنت غير متصل بالإنترنت. التغييرات ستُحفظ محلياً وتتزامن لاحقاً.
        </div>
      )}
      {showSyncSuccess && (
        <div className="bg-emerald-500 text-white text-center py-2 text-sm font-bold sticky top-0 z-50 animate-in fade-in duration-300">
          ✓ تم المزامنة - أنت الآن متصل بالإنترنت
        </div>
      )}

      {/* Modern Tailoring Header - نظام بكسل */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b-2 border-indigo-500/30 text-white shadow-xl sticky top-0 z-40 relative overflow-hidden">
        {/* Subtle decorative stitching line pattern background */}
        <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-indigo-400/30"></div>
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-5 py-3.5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            {/* Modern Tailoring Logo Badge with Scissors & Stitch Accent */}
            <div className="relative group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center border border-indigo-400/40 relative overflow-hidden">
                <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex items-center justify-center relative">
                  <Scissors size={20} className="text-indigo-300 transform -rotate-45" />
                  <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
              </div>
              {/* Needle/Ruler floating detail badge */}
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-md text-[10px] shadow border border-slate-900 font-black">
                <Ruler size={10} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                  نظام بكسل
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>الخياطة</span>
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                إدارة المشغل، الزبائن والطلبات
              </p>
            </div>
          </div>

          {/* Quick Notification Bell & Agenda Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDailyTasksOpen(true);
                refreshUrgentDeliveries();
              }}
              className="relative p-2.5 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500/40 rounded-xl text-indigo-100 transition-all active:scale-95 flex items-center gap-2 shadow-inner"
              title="جدول مواعيد التسليم والمهام اليومية"
            >
              <Bell size={18} className={urgentCount > 0 ? "text-amber-300 animate-bounce" : "text-indigo-200"} />
              <span className="text-xs font-black hidden sm:inline">مواعيد التسليم</span>
              {urgentCount > 0 && (
                <span className="w-5 h-5 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                  {urgentCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      
      <main className="w-full">
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {(activeTab === 'settings' || activeTab === 'history') && <SettingsTab />}
      </main>

      <AppStartupNotificationModal
        isOpen={isStartupModalOpen}
        onClose={() => setIsStartupModalOpen(false)}
        onOpenFullSchedule={() => setIsDailyTasksOpen(true)}
        deliveries={deliveriesData}
      />

      <DailyTasksModal 
        isOpen={isDailyTasksOpen} 
        onClose={() => {
          setIsDailyTasksOpen(false);
          refreshUrgentDeliveries();
        }} 
        onOrderUpdated={refreshUrgentDeliveries}
      />

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      <ToastContainer />

      {showIntro && (
        <IntroSplashScreen 
          durationSeconds={3} 
          onComplete={() => setShowIntro(false)} 
        />
      )}
    </div>
  );
}

