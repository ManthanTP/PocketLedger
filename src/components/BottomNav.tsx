import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { LayoutDashboard, Wallet, Plus, BarChart3, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openAddModal } = useFinanceStore();

  interface NavItem {
    id: 'dashboard' | 'accounts' | 'add-button' | 'reports' | 'settings';
    label: string;
    icon: React.ComponentType<any>;
    isFab?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'add-button', label: 'Add', icon: Plus, isFab: true },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
      {/* Background shadow & blur */}
      <nav id="bottom-navigation" aria-label="Main Navigation" className="mx-auto max-w-lg glass-modal h-16 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.2)] rounded-t-[24px] flex items-center justify-between px-4 transition-all duration-300">
        
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key={item.id} className="relative -top-5 flex flex-col items-center">
                <button
                  id="nav-tab-add"
                  onClick={() => openAddModal()}
                  className="w-12.5 h-12.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(79,70,229,0.35)] dark:shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:scale-105 transition-all duration-200 cursor-pointer"
                  aria-label="Add New Transaction"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                  Add
                </span>
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = activeTab === item.id || 
            (item.id === 'accounts' && activeTab === 'cashbook');

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              aria-label={`Navigate to ${item.label}`}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative ${
                isActive 
                  ? 'text-indigo-600 dark:text-indigo-400 scale-102' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1 tracking-wide">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          );
        })}
        
      </nav>
    </div>
  );
};
