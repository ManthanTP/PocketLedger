import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  actionLabel?: string;
  onActionClick?: () => void;
  persistent?: boolean;
}

export interface BannerItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  actionLabel?: string;
  onActionClick?: () => void;
  dismissible?: boolean;
}

export interface AndroidSimNotification {
  id: string;
  title: string;
  body: string;
  channel: 'Bill Reminders' | 'Loan Repayments' | 'Budget Alerts' | 'Backup Reminders';
  actions?: Array<{
    label: string;
    isPrimary?: boolean;
    actionId: string;
  }>;
}

export interface DialogConfig {
  title: string;
  message: string;
  type: 'confirm' | 'alert';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationState {
  toasts: ToastItem[];
  banners: BannerItem[];
  simulatedNotifications: AndroidSimNotification[];
  activeDialog: DialogConfig | null;
  
  // Toast Actions
  showToast: (
    message: string,
    type?: ToastItem['type'],
    actionLabel?: string,
    onActionClick?: () => void,
    persistent?: boolean
  ) => void;
  dismissToast: (id: string) => void;
  
  // Banner Actions
  showBanner: (
    id: string,
    message: string,
    type?: BannerItem['type'],
    actionLabel?: string,
    onActionClick?: () => void,
    dismissible?: boolean
  ) => void;
  dismissBanner: (id: string) => void;
  
  // Simulated Android Notifications
  triggerAndroidNotification: (notification: AndroidSimNotification) => void;
  dismissAndroidNotification: (id: string) => void;

  // Dialog Actions
  showDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  banners: [],
  simulatedNotifications: [],
  activeDialog: null,

  showToast: (message, type = 'success', actionLabel, onActionClick, persistent = false) => {
    const id = Math.random().toString(36).substring(7);
    
    set((state) => {
      // Auto-dismiss transient toasts after 3 seconds
      if (!persistent && type !== 'error') {
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 3000);
      }
      
      const newToast: ToastItem = {
        id,
        message,
        type,
        actionLabel,
        onActionClick,
        persistent: persistent || type === 'error',
      };
      
      // Stacking limit: max 2 toasts visible, newest on top
      const currentToasts = [newToast, ...state.toasts];
      return {
        toasts: currentToasts.slice(0, 2),
      };
    });
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showBanner: (id, message, type = 'info', actionLabel, onActionClick, dismissible = true) =>
    set((state) => {
      // Replace existing banner if ID matches, otherwise add
      const filtered = state.banners.filter((b) => b.id !== id);
      return {
        banners: [
          ...filtered,
          { id, message, type, actionLabel, onActionClick, dismissible },
        ],
      };
    }),

  dismissBanner: (id) =>
    set((state) => ({
      banners: state.banners.filter((b) => b.id !== id),
    })),

  triggerAndroidNotification: (notification) =>
    set((state) => {
      // Ensure we don't duplicate notifications with same ID
      const filtered = state.simulatedNotifications.filter((n) => n.id !== notification.id);
      
      // If native local notification can be integrated in the future, it hooks here:
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          // Fallback to HTML5 browser notifications for simulation
          new Notification(notification.title, {
            body: notification.body,
            icon: '/favicon.svg'
          });
        }
      } catch (e) {
        console.warn('Native notification permission error:', e);
      }

      return {
        simulatedNotifications: [...filtered, notification],
      };
    }),

  dismissAndroidNotification: (id) =>
    set((state) => ({
      simulatedNotifications: state.simulatedNotifications.filter((n) => n.id !== id),
    })),

  showDialog: (config) => set({ activeDialog: config }),
  closeDialog: () => set({ activeDialog: null }),
}));
