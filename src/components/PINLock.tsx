import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Lock, Fingerprint, Delete, AlertCircle, HelpCircle } from 'lucide-react';

export const PINLock: React.FC = () => {
  const {
    pinHash,
    isLocked,
    unlockApp,
    securityQuestion,
    recoverPIN,
    wipeAllData
  } = useFinanceStore();

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<boolean>(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);

  // If app is not locked or PIN is not set, don't show
  if (!isLocked || !pinHash) {
    return null;
  }

  const handleKeyPress = (num: string) => {
    if (pin.length >= 6) return;
    setError(null);
    const newPin = pin + num;
    setPin(newPin);

    // Auto-verify if the length is 4 or 6 depending on config (or let's support 4-digit and verify on 4 if it matches, or let them input up to 6 digits)
    // To make it easy, we verify whenever it changes. Let's check when it hits 4 or 6.
    // If PIN is 4 digits, check at 4. If it's 6 digits, check at 6.
    // To support variable length cleanly, we'll verify when they reach 4 digits, and if it fails, let them go up to 6, or let's verify on 4 or 6 digits.
    if (newPin.length >= 4) {
      const success = unlockApp(newPin);
      if (success) {
        setPin('');
        setError(null);
      } else if (newPin.length >= 6) {
        // Only trigger error state once they hit 6 digits if 4 didn't work
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
  };

  const handleBiometricClick = () => {
    // Simulate fingerprint unlock
    setError(null);
    const notification = window.confirm("Simulate Biometric Fingerprint Unlock?");
    if (notification) {
      // Unlock using a dummy PIN by directly updating lock state in store or calling action
      // Since it's simulated, we'll just set store isLocked = false
      useFinanceStore.setState({ isLocked: false });
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(false);
    const success = recoverPIN(recoveryAnswer);
    if (success) {
      setIsRecovering(false);
      setRecoveryAnswer('');
      alert("PIN successfully cleared. Please set a new one in Settings.");
    } else {
      setRecoveryError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleWipeData = async () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete all your financial records, accounts, and settings. This action CANNOT be undone. Are you absolutely sure?")) {
      await wipeAllData();
      setIsRecovering(false);
      setShowWipeConfirm(false);
      alert("All data wiped. App reset successfully.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
      <div className={`w-full max-w-sm flex flex-col items-center justify-between min-h-[80vh] py-8 ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Header Section */}
        <div className="flex flex-col items-center mt-6 text-center">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Pocket Ledger Locked
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
            Enter PIN to secure your financial records
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="my-8 flex flex-col items-center w-full">
          <div className="flex space-x-4 mb-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 scale-110 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            ))}
          </div>
          <div className="h-6">
            {error && (
              <div className="flex items-center text-rose-500 text-xs font-medium space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="w-full grid grid-cols-3 gap-y-4 gap-x-6 px-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="key-press h-16 rounded-full flex items-center justify-center text-xl font-semibold bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBiometricClick}
            className="key-press h-16 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
          >
            <Fingerprint className="w-6 h-6 pulse-biometric" />
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="key-press h-16 rounded-full flex items-center justify-center text-xl font-semibold bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="key-press h-16 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN Flow Link */}
        <div className="mt-8">
          <button
            onClick={() => setIsRecovering(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot PIN? Recover Data</span>
          </button>
        </div>
      </div>

      {/* Recovery Modal */}
      {isRecovering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Recover / Reset Pocket Ledger
            </h3>
            
            {securityQuestion ? (
              <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">
                    Security Question
                  </span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {securityQuestion}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">
                    Your Answer
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Enter the answer you set"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {recoveryError && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      Incorrect answer. Please try again.
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovering(false);
                      setRecoveryAnswer('');
                      setRecoveryError(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition cursor-pointer"
                  >
                    Verify Answer
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No security question was set. The only way to unlock the app is to completely reset all data.
                </p>
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-700/50 my-6" />

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-rose-500 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>Danger Zone</span>
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Forgotten everything? Wiping data resets the database, allowing you to start fresh as a new user.
              </p>
              {showWipeConfirm ? (
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    No, Cancel
                  </button>
                  <button
                    onClick={handleWipeData}
                    className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    Yes, Wipe Everything
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowWipeConfirm(true)}
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-950 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                >
                  Wipe & Reset App
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
