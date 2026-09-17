import React, { useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Lock, Fingerprint, Delete, AlertCircle, HelpCircle, X, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { BiometricService, type BiometricStatus } from '../services/biometricService';

export const PINLock: React.FC = () => {
  const {
    pinHash,
    pinLength,
    isLocked,
    unlockApp,
    securityQuestion,
    recoverPIN,
    wipeAllData
  } = useFinanceStore();

  const { showToast } = useNotificationStore();

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<boolean>(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);

  // Hardware Biometric state
  const [bioStatus, setBioStatus] = useState<BiometricStatus | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const autoPromptRef = useRef<boolean>(false);

  // Check biometric capability on mount or when locked
  useEffect(() => {
    if (!isLocked || !pinHash) return;

    let isMounted = true;
    BiometricService.checkStatus().then((status) => {
      if (!isMounted) return;
      setBioStatus(status);

      // Optionally auto-prompt enrolled fingerprint once on initial screen appearance
      if (status.isEnrolled && !autoPromptRef.current) {
        autoPromptRef.current = true;
        // Small delay to ensure UI transition settles
        setTimeout(() => {
          if (isMounted) {
            triggerHardwareBiometric();
          }
        }, 350);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isLocked, pinHash]);

  if (!isLocked || !pinHash) {
    return null;
  }

  const handleKeyPress = async (num: string) => {
    if (pin.length >= pinLength) return;
    setError(null);
    const newPin = pin + num;
    setPin(newPin);

    // Verify PIN instantly when the input length matches the set pinLength
    if (newPin.length === pinLength) {
      const success = await unlockApp(newPin);
      if (success) {
        setPin('');
        setError(null);
        showToast("Welcome back!", "success");
      } else {
        triggerError();
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const triggerError = () => {
    setError('Incorrect PIN');
    setShake(true);
    setPin('');
    setTimeout(() => setShake(false), 500);
    showToast("Incorrect security PIN entered", "error");
  };

  /**
   * Real hardware biometric trigger
   */
  const triggerHardwareBiometric = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    try {
      const currentStatus = await BiometricService.checkStatus();
      setBioStatus(currentStatus);

      // If no biometric enrolled on device, offer to create / enroll in Android Settings
      if (!currentStatus.isEnrolled || currentStatus.status === 'NONE_ENROLLED') {
        if (currentStatus.hasHardware) {
          setShowEnrollModal(true);
        } else {
          showToast("No biometric sensor detected on this device. Please use your PIN.", "info");
        }
        setIsAuthenticating(false);
        return;
      }

      // Device has enrolled fingerprint -> invoke official BiometricPrompt
      const res = await BiometricService.authenticate({
        title: "Unlock Pocket Ledger Pro",
        subtitle: "Touch the fingerprint sensor to unlock",
        negativeButtonText: "Use PIN"
      });

      if (res.success) {
        useFinanceStore.setState({ isLocked: false });
        showToast("Fingerprint verified. Welcome back!", "success");
      } else if (res.code === 'NONE_ENROLLED') {
        setShowEnrollModal(true);
      } else if (res.code === 'LOCKOUT') {
        setError('Fingerprint locked temporarily. Please enter PIN.');
        showToast("Biometric locked temporarily. Enter your PIN.", "error");
      } else if (res.code === 'USER_CANCELED') {
        // User voluntarily cancelled or tapped "Use PIN", do not show error
      } else if (res.message) {
        showToast(res.message, "error");
      }
    } catch (err: unknown) {
      console.warn("Biometric authentication error:", err);
      showToast("Biometric verification error. Please enter PIN.", "error");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBiometricClick = () => {
    triggerHardwareBiometric();
  };

  const handleOpenEnrollment = async () => {
    setShowEnrollModal(false);
    const result = await BiometricService.enrollOrOpenSettings();
    if (result.success) {
      // Recheck status
      const updated = await BiometricService.checkStatus();
      setBioStatus(updated);
      if (updated.isEnrolled) {
        showToast("Biometric registered! You can now unlock with fingerprint.", "success");
      }
    } else if (result.message) {
      showToast(result.message, "info");
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(false);
    const success = await recoverPIN(recoveryAnswer);
    if (success) {
      setIsRecovering(false);
      setRecoveryAnswer('');
      showToast("PIN cleared. Reset lock in settings.", "info");
    } else {
      setRecoveryError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showToast("Recovery answer validation failed", "error");
    }
  };

  const handleWipeData = async () => {
    await wipeAllData();
    setIsRecovering(false);
    setShowWipeConfirm(false);
    showToast("Application completely reset", "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base px-4 overflow-hidden select-none">
      
      {/* Blurred Aurora Glow Orbs behind PIN lock */}
      <div className="aurora-glow-orb top-10 left-10 bg-[#34D399] opacity-[0.06] blur-[100px]" aria-hidden="true" />
      <div className="aurora-glow-orb bottom-10 right-10 bg-[#8B5CF6] opacity-[0.06] blur-[100px]" aria-hidden="true" />

      <div className={`w-full max-w-sm flex flex-col items-center justify-between min-h-[82vh] py-8 z-10 ${shake ? 'animate-shake' : ''}`}>
        
        {/* Header Section */}
        <header className="flex flex-col items-center mt-6 text-center">
          <div className="p-4 bg-bg-surface border border-border-custom rounded-3xl text-accent-green mb-4 shadow-lg animate-scale-pulse">
            <Lock className="w-7 h-7" />
          </div>
          <h1 id="pin-lock-title" className="text-xl font-bold tracking-tight text-text-primary font-display">
            Pocket-Ledger.pro Locked
          </h1>
          <p className="text-xs text-text-subtle mt-1 max-w-[240px] font-body">
            Enter PIN code or scan enrolled fingerprint
          </p>
        </header>

        {/* PIN Dot Indicators */}
        <section className="my-6 flex flex-col items-center w-full" aria-label="PIN Input State">
          <div className="flex space-x-4 mb-4">
            {[...Array(pinLength)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-accent-green border-accent-green scale-110 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'border-border-custom bg-transparent'
                }`}
              />
            ))}
          </div>
          <div className="h-6" role="alert">
            {error && (
              <div className="flex items-center text-accent-red text-xs font-semibold space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Tactile Keypad */}
        <section className="w-full grid grid-cols-3 gap-y-4 gap-x-6 px-6" aria-label="Keypad input">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              id={`pin-key-${num}`}
              aria-label={`Digit ${num}`}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-full flex items-center justify-center text-lg font-bold bg-bg-surface border border-border-custom text-text-primary hover:bg-white/5 active:scale-[0.88] active:bg-white/10 transition-all cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            id="pin-key-biometric"
            aria-label="Unlock with registered fingerprint"
            onClick={handleBiometricClick}
            className={`h-16 rounded-full flex items-center justify-center bg-bg-surface/50 border border-border-custom/50 text-accent-green hover:bg-white/5 active:scale-[0.88] transition-all cursor-pointer relative ${
              isAuthenticating ? 'opacity-50 pointer-events-none' : ''
            }`}
            title="Scan registered fingerprint"
          >
            <Fingerprint className="w-6 h-6 animate-pulse" />
          </button>
          <button
            id="pin-key-0"
            aria-label="Digit 0"
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-full flex items-center justify-center text-lg font-bold bg-bg-surface border border-border-custom text-text-primary hover:bg-white/5 active:scale-[0.88] active:bg-white/10 transition-all cursor-pointer shadow-sm"
          >
            0
          </button>
          <button
            id="pin-key-backspace"
            aria-label="Backspace"
            onClick={handleBackspace}
            className="h-16 rounded-full flex items-center justify-center bg-bg-surface border border-border-custom text-text-secondary hover:bg-white/5 active:scale-[0.88] transition-all cursor-pointer shadow-sm"
          >
            <Delete className="w-5 h-5" />
          </button>
        </section>

        {/* Footer actions */}
        <footer className="mt-6 flex flex-col items-center space-y-2 text-xs">
          <button
            id="pin-forgot-btn"
            onClick={() => setIsRecovering(true)}
            className="text-text-subtle hover:text-accent-green transition flex items-center space-x-1 cursor-pointer py-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot PIN code?</span>
          </button>
        </footer>
      </div>

      {/* Recovery Question Modal */}
      {isRecovering && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative text-left space-y-4 animate-scale-pulse">
            <button
              id="pin-recovery-close-btn"
              onClick={() => {
                setIsRecovering(false);
                setRecoveryError(false);
                setShowWipeConfirm(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-text-primary font-display m-0">
                PIN Recovery
              </h2>
              <p className="text-xs text-text-subtle font-body mt-0.5">
                Answer your security question to reset access
              </p>
            </div>

            <div className="p-3 bg-white/5 border border-border-custom rounded-xl">
              <span className="text-[10px] uppercase font-bold text-text-subtle block font-body">
                Security Question
              </span>
              <p className="text-xs font-semibold text-text-primary mt-1 font-body">
                {securityQuestion || "No security question configured."}
              </p>
            </div>

            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="recovery-answer-input" className="text-[10px] uppercase font-bold text-text-secondary font-body">
                  Your Answer
                </label>
                <input
                  id="recovery-answer-input"
                  type="text"
                  required
                  placeholder="Case-insensitive answer"
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none focus:border-accent-green font-body"
                />
              </div>

              {recoveryError && (
                <p className="text-xs text-accent-red font-medium">
                  Incorrect answer. Please try again.
                </p>
              )}

              <button
                id="recovery-verify-btn"
                type="submit"
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-sm cursor-pointer"
              >
                Reset PIN & Unlock
              </button>
            </form>

            <div className="pt-2 border-t border-border-custom flex flex-col items-center">
              {showWipeConfirm ? (
                <div className="w-full p-3 bg-accent-red/10 border border-accent-red/30 rounded-xl space-y-2 text-center">
                  <p className="text-[11px] font-bold text-accent-red">
                    Are you completely sure?
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    All accounts, transactions, and categories will be permanently deleted.
                  </p>
                  <div className="flex space-x-2 pt-1">
                    <button
                      id="wipe-cancel-btn"
                      onClick={() => setShowWipeConfirm(false)}
                      className="flex-1 py-1.5 rounded-lg bg-bg-base border border-border-custom text-text-secondary text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      id="wipe-confirm-btn"
                      onClick={handleWipeData}
                      className="flex-1 py-1.5 rounded-lg bg-accent-red hover:bg-accent-red/90 text-white text-xs font-bold"
                    >
                      Yes, Wipe All
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="wipe-reset-btn"
                  onClick={() => setShowWipeConfirm(true)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-accent-red/30 hover:bg-accent-red/10 text-accent-red text-xs font-bold transition cursor-pointer"
                >
                  Wipe & Reset App
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Helper Modal (when phone has hardware but no fingerprint enrolled) */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative text-center space-y-5 animate-scale-pulse">
            <button
              onClick={() => setShowEnrollModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green">
              <Fingerprint className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-text-primary font-display m-0">
                {bioStatus?.platform === 'android'
                  ? 'No Fingerprint Enrolled on Phone'
                  : 'Register Biometric Passkey'}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed font-body">
                {bioStatus?.platform === 'android'
                  ? 'Your phone supports fingerprint biometrics, but no fingerprints have been registered in your Android settings yet. Would you like to set one up now?'
                  : 'Register your device biometric sensor (Touch ID, Windows Hello, or Chrome Android) to unlock Pocket Ledger Pro instantly.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleOpenEnrollment}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                {bioStatus?.platform === 'android' ? (
                  <>
                    <SettingsIcon className="w-4 h-4" />
                    <span>Open Phone Settings</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Register Device Fingerprint</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary font-bold text-xs cursor-pointer"
              >
                Use PIN Code Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
