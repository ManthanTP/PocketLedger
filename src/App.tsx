import { useEffect } from 'react';
import { useFinanceStore } from './store/useFinanceStore';
import { Onboarding } from './components/Onboarding';
import { PINLock } from './components/PINLock';
import { BottomNav } from './components/BottomNav';
import { AddEntryModal } from './components/AddEntryModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Reports } from './pages/Reports';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { CashBook } from './pages/CashBook';

import { ShieldAlert } from 'lucide-react';

function App() {
  const {
    init,
    initialized,
    accounts,
    pinHash,
    isLocked,
    activeTab
  } = useFinanceStore();

  // Initialize DB and fetch states on mount
  useEffect(() => {
    init();
  }, [init]);

  // Security auto-lock timeout tracking
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        localStorage.setItem('lastActiveTime', Date.now().toString());
      } else {
        const lastActive = localStorage.getItem('lastActiveTime');
        const pin = useFinanceStore.getState().pinHash;
        const timeout = useFinanceStore.getState().autoLockTimeout;

        if (pin && lastActive && timeout !== -1) {
          const elapsedMs = Date.now() - parseInt(lastActive, 10);
          const elapsedMins = elapsedMs / (1000 * 60);
          if (elapsedMins >= timeout) {
            useFinanceStore.setState({ isLocked: true });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Show a full-screen premium spinner while loading DB
  if (!initialized) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-950 animate-spin border-t-indigo-600 dark:border-t-indigo-500" />
        </div>
        <span className="mt-4 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase animate-pulse">
          Pocket Ledger Loading
        </span>
      </div>
    );
  }

  // Onboarding (First launch - no accounts exist)
  if (accounts.length === 0) {
    return <Onboarding />;
  }

  // Security screen (PIN Lock is active)
  if (pinHash && isLocked) {
    return <PINLock />;
  }

  // Render the current active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'accounts':
        return <Accounts />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'transactions':
        return <Transactions />;
      case 'cashbook':
        return <CashBook />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 antialiased">
      {/* Top banner warning if browser cookies/storage are disabled */}
      <noscript>
        <div className="bg-rose-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-center space-x-1">
          <ShieldAlert className="w-4 h-4" />
          <span>JavaScript is disabled. Pocket Ledger requires browser storage to work.</span>
        </div>
      </noscript>

      {/* Main Panel Content Area */}
      <main className="w-full">
        {renderActiveTab()}
      </main>

      {/* Add Modal and Navigation */}
      <AddEntryModal />
      <BottomNav />
    </div>
  );
}

export default App;
