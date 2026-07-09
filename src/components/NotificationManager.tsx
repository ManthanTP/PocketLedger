import React from 'react';
import { useNotificationStore } from '../store/useNotificationStore';
import { CheckCircle2, Info, AlertTriangle, XCircle, X, ChevronRight, Bell } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * Global component to render in-app toasts at the bottom of the screen.
 * Places toasts right above the bottom navigation bar.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-22 left-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-md mx-auto"
      aria-live="assertive"
    >
      {toasts.map((toast) => {
        // Variant styling
        let accentColor = 'bg-accent-green';
        let Icon = CheckCircle2;
        let iconColor = 'text-accent-green-light';
        
        if (toast.type === 'info') {
          accentColor = 'bg-indigo-400';
          Icon = Info;
          iconColor = 'text-indigo-400';
        } else if (toast.type === 'warning') {
          accentColor = 'bg-accent-amber';
          Icon = AlertTriangle;
          iconColor = 'text-accent-amber';
        } else if (toast.type === 'error') {
          accentColor = 'bg-accent-red';
          Icon = XCircle;
          iconColor = 'text-accent-red';
        }

        return (
          <div
            key={toast.id}
            className="card-entrance pointer-events-auto flex items-stretch bg-bg-elevated border border-border-custom rounded-xl shadow-xl overflow-hidden transition-all duration-300 transform"
          >
            {/* Left Accent Bar */}
            <div className={`w-1 ${accentColor} flex-shrink-0`} />

            {/* Content */}
            <div className="flex-1 p-3.5 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <span className="text-sm font-medium text-text-primary text-left truncate leading-tight">
                  {toast.message}
                </span>
              </div>

              {/* Action Link & Dismiss buttons */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                {toast.actionLabel && toast.onActionClick && (
                  <button
                    onClick={() => {
                      toast.onActionClick?.();
                      dismissToast(toast.id);
                    }}
                    className="text-xs font-bold text-accent-green-light hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    {toast.actionLabel}
                  </button>
                )}
                
                {(toast.persistent || toast.type === 'error') && (
                  <button
                    onClick={() => dismissToast(toast.id)}
                    aria-label="Dismiss notification"
                    className="text-text-subtle hover:text-text-primary p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Component to render fixed page banners below page headers.
 */
export const BannerRenderer: React.FC<{ id: string }> = ({ id }) => {
  const { banners, dismissBanner } = useNotificationStore();
  const banner = banners.find((b) => b.id === id);

  if (!banner) return null;

  let bgClass = 'bg-indigo-500/10 border-indigo-500/20';
  let borderClass = 'border-b border-indigo-500/30';
  let Icon = Info;
  let iconColor = 'text-indigo-400';
  let actionColor = 'text-indigo-400';

  if (banner.type === 'success') {
    bgClass = 'bg-accent-green/10';
    borderClass = 'border-b border-accent-green/20';
    Icon = CheckCircle2;
    iconColor = 'text-accent-green-light';
    actionColor = 'text-accent-green-light';
  } else if (banner.type === 'warning') {
    bgClass = 'bg-accent-amber/10';
    borderClass = 'border-b border-accent-amber/20';
    Icon = AlertTriangle;
    iconColor = 'text-accent-amber';
    actionColor = 'text-accent-amber';
  } else if (banner.type === 'error') {
    bgClass = 'bg-accent-red/10';
    borderClass = 'border-b border-accent-red/20';
    Icon = XCircle;
    iconColor = 'text-accent-red';
    actionColor = 'text-accent-red';
  }

  return (
    <div 
      className={`w-full overflow-hidden transition-all duration-300 ${bgClass} ${borderClass}`}
    >
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between space-x-3 text-left">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
          <span className="text-xs text-text-secondary truncate leading-tight">
            {banner.message}
          </span>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          {banner.actionLabel && banner.onActionClick && (
            <button
              onClick={banner.onActionClick}
              className={`text-xs font-bold ${actionColor} hover:underline flex items-center space-x-0.5 cursor-pointer`}
            >
              <span>{banner.actionLabel}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          {banner.dismissible && (
            <button
              onClick={() => dismissBanner(banner.id)}
              aria-label="Dismiss banner"
              className="text-text-subtle hover:text-text-primary p-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Simulated Android Push Notification tray component.
 * Appears as a sliding popover at the top of the viewport when triggered.
 */
export const AndroidNotificationShade: React.FC = () => {
  const { simulatedNotifications, dismissAndroidNotification, showToast } = useNotificationStore();
  const { setActiveTab, addTransaction, accounts, currency } = useFinanceStore();

  if (simulatedNotifications.length === 0) return null;

  // Newest notification
  const notification = simulatedNotifications[simulatedNotifications.length - 1];

  const handleBodyClick = () => {
    dismissAndroidNotification(notification.id);
    // Deep linking logic:
    if (notification.channel === 'Bill Reminders') {
      setActiveTab('transactions');
    } else if (notification.channel === 'Budget Alerts') {
      setActiveTab('reports');
    } else {
      setActiveTab('dashboard');
    }
    showToast(`Navigated to ${notification.channel} view`, 'info');
  };

  const handleActionClick = async (actionId: string) => {
    dismissAndroidNotification(notification.id);
    
    if (actionId === 'mark-paid') {
      // Simulate logging transaction in background
      const cashAcc = accounts.find((a) => a.type === 'Cash') || accounts[0];
      if (cashAcc) {
        // Read details dynamically from the notification object
        const payAmount = notification.amount !== undefined ? notification.amount : 1240;
        const payCategory = notification.category || 'Bills';
        const payTitle = notification.title || 'Bill';

        await addTransaction({
          accountId: cashAcc.id,
          type: 'expense',
          amount: payAmount,
          category: payCategory,
          date: new Date().toISOString().split('T')[0],
          notes: `${payTitle} (Auto-logged from Push Action)`
        });
        showToast(`${payTitle} marked as Paid (${currency}${payAmount.toLocaleString('en-IN')})`, 'success');
      } else {
        showToast('Failed to auto-log: No Cash/Default Account found', 'error');
      }
    } else if (actionId === 'snooze') {
      showToast('Bill reminder snoozed for 24 hours', 'info');
    }
  };

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto pointer-events-none">
      <div 
        className="pointer-events-auto bg-[#0b1220] border border-white/10 rounded-2xl shadow-2xl p-4 space-y-3.5 animate-slide-up duration-300"
        style={{
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Status Line */}
        <div className="flex justify-between items-center text-[10px] text-text-secondary">
          <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider">
            <Bell className="w-3 h-3 text-accent-green" />
            <span>{notification.channel}</span>
          </div>
          <span>just now</span>
        </div>

        {/* Text Block */}
        <div 
          onClick={handleBodyClick}
          className="text-left space-y-1 cursor-pointer group"
        >
          <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-green transition duration-150">
            {notification.title}
          </h4>
          <p className="text-xs text-text-secondary leading-normal">
            {notification.body}
          </p>
        </div>

        {/* Actions Row */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex items-center space-x-2 pt-1 border-t border-white/5">
            {notification.actions.map((act) => (
              <button
                key={act.actionId}
                onClick={() => handleActionClick(act.actionId)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  act.isPrimary
                    ? 'bg-accent-green hover:bg-accent-green/90 text-bg-base'
                    : 'bg-white/5 hover:bg-white/10 text-text-primary'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
