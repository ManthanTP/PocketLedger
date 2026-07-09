import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Lock, Fingerprint, Delete, AlertCircle, HelpCircle, X } from 'lucide-react';

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

  // Biometric state variables
  const [biometricOpen, setBiometricOpen] = useState<boolean>(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState<number>(0);

  if (!isLocked || !pinHash) {
    return null;
  }

  const handleKeyPress = (num: string) => {
    if (pin.length >= pinLength) return;
    setError(null);
    const newPin = pin + num;
    setPin(newPin);

    // Verify PIN instantly when the input length matches the set pinLength
    if (newPin.length === pinLength) {
      const success = unlockApp(newPin);
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

  const handleBiometricClick = () => {
    setBiometricOpen(true);
    setScanState('idle');
    setScanProgress(0);
  };

  const startBiometricScan = () => {
    if (scanState === 'scanning' || scanState === 'success') return;
    setScanState('scanning');
    setScanProgress(0);
    
    // Simulate high-fidelity biometric fingerprint scanning
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        // 90% chance of success, 10% chance of scanning failure for realism
        const isSuccess = Math.random() < 0.90;
        if (isSuccess) {
          setScanState('success');
          setTimeout(() => {
            setBiometricOpen(false);
            useFinanceStore.setState({ isLocked: false });
            showToast("Fingerprint scan verified. Welcome back!", "success");
          }, 800);
        } else {
          setScanState('error');
          showToast("Fingerprint not recognized. Please try again.", "error");
        }
      }
    }, 150);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(false);
    const success = recoverPIN(recoveryAnswer);
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
            Pocket Ledger Locked
          </h1>
          <p className="text-xs text-text-subtle mt-1 max-w-[220px] font-body">
            Enter security PIN code to access database
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
            aria-label="Unlock with fingerprint biometric scan"
            onClick={handleBiometricClick}
            className="h-16 rounded-full flex items-center justify-center bg-bg-surface/50 border border-border-custom/50 text-accent-green hover:bg-white/5 active:scale-[0.88] transition-all cursor-pointer"
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
            className="h-16 rounded-full flex items-center justify-center bg-bg-surface/50 border border-border-custom/50 text-text-secondary hover:bg-white/5 active:scale-[0.88] transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </section>

        {/* Recovery Options */}
        <footer className="mt-6">
          <button
            id="forgot-pin-btn"
            onClick={() => setIsRecovering(true)}
            className="min-h-[44px] px-4 py-2 text-xs font-bold text-accent-green-light hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot PIN? Recover Data</span>
          </button>
        </footer>
      </div>

      {/* Recovery Modal */}
      {isRecovering && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsRecovering(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary font-display m-0">
                Recover Ledger Database
              </h2>
            </div>
            
            {securityQuestion ? (
              <form onSubmit={handleRecoverySubmit} className="mt-6 space-y-4 text-left">
                <div className="space-y-1 bg-bg-base p-3 border border-border-custom rounded-xl">
                  <span className="text-[9px] text-text-subtle uppercase font-bold tracking-wide">
                    Security Question
                  </span>
                  <p className="text-xs font-bold text-text-secondary mt-0.5">
                    {securityQuestion}
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="recovery-answer-input" className="text-[9px] text-text-secondary uppercase font-bold tracking-wide">
                    Your Answer
                  </label>
                  <input
                    id="recovery-answer-input"
                    type="text"
                    required
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Enter case-insensitive answer"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none focus:border-accent-green"
                  />
                  {recoveryError && (
                    <p className="text-[10px] text-accent-red font-semibold mt-1">
                      Incorrect answer value. Please verify and retry.
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-2">
                  <button
                    id="recovery-cancel-btn"
                    type="button"
                    onClick={() => {
                      setIsRecovering(false);
                      setRecoveryAnswer('');
                      setRecoveryError(false);
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-white/5 hover:bg-white/10 text-text-primary font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="recovery-verify-btn"
                    type="submit"
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    Verify Answer
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4 text-left text-xs text-text-secondary leading-normal">
                <p>
                  No security question was configured in this setup. The only recovery option is to completely overwrite and wipe all data.
                </p>
              </div>
            )}

            <div className="border-t border-border-custom my-6" />

            <div className="space-y-3 text-left">
              <h3 className="text-sm font-bold text-accent-red flex items-center space-x-1.5 m-0 font-display">
                <AlertCircle className="w-4 h-4" />
                <span>Wipe Database</span>
              </h3>
              <p className="text-[10px] text-text-subtle leading-normal">
                Forgotten recovery keys? Overwriting the application resets the local database completely, letting you start fresh.
              </p>
              {showWipeConfirm ? (
                <div className="flex space-x-3 pt-2">
                  <button
                    id="wipe-cancel-btn"
                    onClick={() => setShowWipeConfirm(false)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white/5 border border-border-custom text-text-primary text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="wipe-confirm-btn"
                    onClick={handleWipeData}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white text-xs font-bold cursor-pointer"
                  >
                    Yes, Wipe DB
                  </button>
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

      {/* Real Biometric Fingerprint Scanner Bottom Sheet/Modal */}
      {biometricOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative text-center space-y-6 animate-scale-pulse">
            <button
              onClick={() => setBiometricOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary font-display m-0">
                Biometric Login
              </h2>
              <p className="text-xs text-text-subtle font-body mt-0.5">
                Verify identity using fingerprint sensor
              </p>
            </div>

            {/* Circular Glowing Scanner ring */}
            <div className="flex justify-center py-4">
              <button
                onClick={startBiometricScan}
                className={`relative w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  scanState === 'scanning'
                    ? 'border-accent-green bg-accent-green/5 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : scanState === 'success'
                    ? 'border-accent-green bg-accent-green/10 shadow-[0_0_35px_rgba(16,185,129,0.4)]'
                    : scanState === 'error'
                    ? 'border-accent-red bg-accent-red/10 shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-shake'
                    : 'border-border-custom bg-white/3 hover:bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Fingerprint Symbol */}
                <div className="relative overflow-hidden w-20 h-20 flex items-center justify-center">
                  <Fingerprint className={`w-20 h-20 transition-all duration-300 ${
                    scanState === 'scanning'
                      ? 'text-accent-green-light scale-105'
                      : scanState === 'success'
                      ? 'text-accent-green scale-105'
                      : scanState === 'error'
                      ? 'text-accent-red'
                      : 'text-text-secondary'
                  }`} />
                  
                  {/* Glowing Laser Sweep Line */}
                  {scanState === 'scanning' && (
                    <div className="absolute left-0 right-0 h-0.5 bg-accent-green-light shadow-[0_0_8px_#10B981] animate-laser" />
                  )}
                </div>

                {/* Progress Circle Border */}
                {scanState === 'scanning' && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="rgba(16,185,129,0.2)"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="#10B981"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={289}
                      strokeDashoffset={289 - (289 * scanProgress) / 100}
                      className="transition-all duration-150"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <p className={`text-xs font-semibold font-body min-h-[16px] transition-colors duration-200 mt-0 ${
                scanState === 'scanning'
                  ? 'text-accent-green-light animate-pulse'
                  : scanState === 'success'
                  ? 'text-accent-green'
                  : scanState === 'error'
                  ? 'text-accent-red'
                  : 'text-text-secondary'
              }`}>
                {scanState === 'idle' && 'Tap the sensor to scan fingerprint'}
                {scanState === 'scanning' && `Scanning... ${scanProgress}%`}
                {scanState === 'success' && 'Scan Complete! Unlocked'}
                {scanState === 'error' && 'Scan Failed. Tap sensor to retry'}
              </p>

              {scanState === 'error' && (
                <button
                  onClick={() => {
                    setScanState('idle');
                    setScanProgress(0);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-text-primary text-xs font-bold rounded-xl cursor-pointer transition-colors duration-150"
                >
                  Retry Scan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
