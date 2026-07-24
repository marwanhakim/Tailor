import React from 'react';
import { Users, CreditCard, ShoppingCart, Settings } from 'lucide-react';
import { TabType } from '../types';
import { cn } from '../utils';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'customers', label: 'الزبائن', icon: <Users size={28} /> },
    { id: 'accounts', label: 'الديون', icon: <CreditCard size={28} /> },
    { id: 'orders', label: 'الطلبات', icon: <ShoppingCart size={28} /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings size={28} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-50 transition-colors">
      <div className="flex justify-around items-center h-24 px-2 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'orders') {
                  localStorage.removeItem('customerOrderFilter');
                }
                onChange(tab.id);
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                !isActive && "opacity-40"
              )}
              aria-label={tab.label}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all",
                isActive ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}>
                {React.cloneElement(tab.icon as React.ReactElement, { size: 24 })}
              </div>
              <span className={cn(
                "text-sm font-bold transition-all",
                isActive ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
