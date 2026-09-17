import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';

export type BackHandler = () => boolean; // return true if handled

const backHandlers: BackHandler[] = [];
let lastBackPressTime = 0;
let isListenerInitialized = false;

// Tab navigation history stack
const tabHistory: string[] = ['dashboard'];

/**
 * Registers a high-priority handler for the back button (e.g. for closing specific modals/sheets).
 * Returns an unregister function.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Record a tab transition in history
 */
export function recordTabChange(newTab: string) {
  if (tabHistory.length === 0 || tabHistory[tabHistory.length - 1] !== newTab) {
    tabHistory.push(newTab);
    // Keep reasonable history length
    if (tabHistory.length > 20) {
      tabHistory.shift();
    }
  }
}

/**
 * Primary back button resolution logic
 */
export function handleBackNavigation(): boolean {
  // 1. Check registered custom handlers (top of stack first)
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    const handler = backHandlers[i];
    try {
      const handled = handler();
      if (handled) return true;
    } catch (e) {
      console.error('Error in back handler:', e);
    }
  }

  // 2. Check Global Dialog (Confirmation / Alert)
  const notificationState = useNotificationStore.getState();
  if (notificationState.activeDialog) {
    notificationState.closeDialog();
    return true;
  }

  // 3. Check Add / Edit Entry Modal
  const financeState = useFinanceStore.getState();
  if (financeState.isAddModalOpen) {
    financeState.closeAddModal();
    return true;
  }

  // 4. Check Settings Sub-Panel (Categories, Security, Budgets, Reminders, etc.)
  if (financeState.settingsActivePanel !== 'none') {
    financeState.setSettingsActivePanel('none');
    return true;
  }

  // 5. Check Account Detail Page (inside Accounts tab)
  if (financeState.selectedAccount !== null) {
    financeState.setSelectedAccount(null);
    return true;
  }

  // 6. Check Tab Navigation
  const currentTab = financeState.activeTab;
  if (currentTab !== 'dashboard') {
    // Pop current tab from history
    if (tabHistory.length > 0 && tabHistory[tabHistory.length - 1] === currentTab) {
      tabHistory.pop();
    }
    const previousTab = tabHistory.length > 0 ? tabHistory[tabHistory.length - 1] : 'dashboard';
    financeState.setActiveTab(previousTab as any);
    return true;
  }

  // 7. On Dashboard root — double-tap to exit
  const now = Date.now();
  if (now - lastBackPressTime < 2000) {
    // Exit application
    if (Capacitor.isNativePlatform()) {
      CapApp.exitApp();
    }
    return true;
  } else {
    lastBackPressTime = now;
    notificationState.showToast('Press back again to exit', 'info');
    return true;
  }
}

/**
 * Initializes the back button listener for Capacitor native app and Web popstate
 */
export function initBackButtonListener(): () => void {
  if (isListenerInitialized) {
    return () => {};
  }
  isListenerInitialized = true;

  let capListenerRemove: (() => void) | null = null;

  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', () => {
      handleBackNavigation();
    }).then(handle => {
      capListenerRemove = () => handle.remove();
    }).catch(err => {
      console.warn('Could not attach Capacitor backButton listener:', err);
    });
  }

  // Also support Web browser back button if pushState is used
  const handlePopState = (e: PopStateEvent) => {
    const handled = handleBackNavigation();
    if (handled) {
      e.preventDefault();
    }
  };
  window.addEventListener('popstate', handlePopState);

  return () => {
    isListenerInitialized = false;
    if (capListenerRemove) {
      capListenerRemove();
    }
    window.removeEventListener('popstate', handlePopState);
  };
}
