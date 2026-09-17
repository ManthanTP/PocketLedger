import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useFinanceStore } from './store/useFinanceStore';
import { Onboarding } from './components/Onboarding';
import { PINLock } from './components/PINLock';
import { BottomNav } from './components/BottomNav';
import { AddEntryModal } from './components/AddEntryModal';
import { ToastContainer, AndroidNotificationShade } from './components/NotificationManager';
import { useNotificationStore } from './store/useNotificationStore';
import { AppIconFull } from './components/AppIcon';
import { LandingPage } from './pages/LandingPage';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Reports } from './pages/Reports';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { CashBook } from './pages/CashBook';

import { ShieldAlert } from 'lucide-react';
import { initBackButtonListener, recordTabChange } from './utils/backButtonManager';

function App() {
  const {
    init,
    initialized,
    accounts,
    pinHash,
    isLocked,
    activeTab
  } = useFinanceStore();

  const { activeDialog, closeDialog } = useNotificationStore();

  const isNative = Capacitor.isNativePlatform();

  // On Web, show Landing Page at root / unless navigating directly to #app or /app
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    if (isNative) return false; // Native Android APK always goes directly into the finance app!
    return window.location.hash !== '#app' && window.location.pathname !== '/app';
  });

  // Listen for hash changes to navigate smoothly between Landing Page and Web App
  useEffect(() => {
    if (isNative) return;
    const handleHash = () => {
      setShowLanding(window.location.hash !== '#app' && window.location.pathname !== '/app');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isNative]);

  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  // Initialize DB and fetch states on mount
  useEffect(() => {
    init();
  }, [init]);

  // Initialize Capacitor Android & Web hardware back button handling
  useEffect(() => {
    const unbind = initBackButtonListener();
    return () => unbind();
  }, []);

  // Track tab history for back navigation
  useEffect(() => {
    recordTabChange(activeTab);
  }, [activeTab]);

  // Handle splash screen fade-out
  useEffect(() => {
    if (initialized) {
      setSplashFade(true);
      const timer = setTimeout(() => setShowSplash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [initialized]);

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

  // Web Landing Page (Shown at / for web visitors, bypassed in Android APK)
  if (showLanding) {
    return (
      <LandingPage
        onLaunchApp={() => {
          setShowLanding(false);
          window.location.hash = '#app';
        }}
      />
    );
  }

  // Show a full-screen premium splash screen while loading DB
  if (showSplash) {
    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base transition-opacity duration-300 ${
          splashFade ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Pulsing Aurora Glow behind splash logo */}
        <div className="absolute w-72 h-72 rounded-full bg-accent-green/10 dark:bg-accent-green/5 blur-3xl pulse-biometric" aria-hidden="true" />
        <div className="absolute w-72 h-72 rounded-full bg-accent-violet/10 dark:bg-accent-violet/5 blur-3xl pulse-biometric" aria-hidden="true" style={{ animationDelay: '1s' }} />

        <div className="relative flex flex-col items-center space-y-6">
          <AppIconFull size={120} className="pulse-biometric" />
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold tracking-widest text-text-primary font-display uppercase">
              Pocket-Ledger.pro
            </h1>
            <p className="text-[10px] text-text-subtle uppercase tracking-widest font-semibold font-body">
              Privacy-First Personal Finance
            </p>
          </div>
        </div>
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
    <div className="min-h-screen bg-bg-base text-text-primary font-sans antialiased transition-colors duration-300">
      {/* Web-only navigation bar to download APK or return to Product Landing Page */}
      {!isNative && (
        <aside aria-label="Web App Banner" className="bg-[#0B1220] border-b border-white/[0.08] px-4 py-2 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white font-display">Pocket Ledger Pro</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/25">
              Web Version
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/PocketLedgerPRO.apk"
              download="PocketLedgerPRO.apk"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
            >
              Get Android APK (9.57 MB)
            </a>
            <button
              onClick={() => {
                setShowLanding(true);
                window.location.hash = '';
              }}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition cursor-pointer font-medium"
            >
              ← Product Page
            </button>
          </div>
        </aside>
      )}

      {/* Top banner warning if browser cookies/storage are disabled */}
      <noscript>
        <div className="bg-accent-red text-white text-xs font-bold py-2 px-4 flex items-center justify-center space-x-1">
          <ShieldAlert className="w-4 h-4" />
          <span>JavaScript is disabled. Pocket-Ledger.pro requires browser storage to work.</span>
        </div>
      </noscript>

      {/* Main Content Area */}
      <main className="w-full relative">
        {renderActiveTab()}
      </main>

      {/* Add Modal, Navigation, and Global Notifications */}
      <AddEntryModal />
      <BottomNav />
      <ToastContainer />
      <AndroidNotificationShade />

      {/* Custom Dialog Modal Overlay */}
      {activeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <div 
            className="w-full max-w-sm bg-bg-surface border border-border-custom rounded-3xl p-6 space-y-6 glass-panel animate-slide-up mx-4 text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="space-y-2">
              <h2 id="dialog-title" className="text-base font-bold text-text-primary font-display">
                {activeDialog.title}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed font-body">
                {activeDialog.message}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3.5 pt-2">
              {activeDialog.type === 'confirm' && (
                <button
                  onClick={() => {
                    if (activeDialog.onCancel) activeDialog.onCancel();
                    closeDialog();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border-custom hover:bg-white/5 text-text-secondary font-bold text-xs cursor-pointer transition duration-150"
                >
                  {activeDialog.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => {
                  activeDialog.onConfirm();
                  closeDialog();
                }}
                className="flex-1 py-2.5 bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold rounded-xl text-xs shadow-md transition duration-150 cursor-pointer"
              >
                {activeDialog.confirmLabel || (activeDialog.type === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
