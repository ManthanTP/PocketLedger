import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Wallet, ShieldCheck, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import type { Account } from '../db/db';

export const Onboarding: React.FC = () => {
  const { accounts, addAccount, setSecurityPIN } = useFinanceStore();
  const [slide, setSlide] = useState<number>(0);

  // Account creation form
  const [accName, setAccName] = useState<string>('Cash');
  const [accType, setAccType] = useState<Account['type']>('Cash');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Security setup form
  const [enablePin, setEnablePin] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [question, setQuestion] = useState<string>('What was the name of your first pet?');
  const [answer, setAnswer] = useState<string>('');
  const [secError, setSecError] = useState<string | null>(null);

  // If we already have accounts, we don't show onboarding
  if (accounts.length > 0) {
    return null;
  }

  const handleNext = () => {
    if (slide === 0) {
      setSlide(1);
    } else if (slide === 1) {
      if (!accName.trim()) {
        alert("Please enter a valid account name.");
        return;
      }
      setSlide(2);
    }
  };

  const handleFinish = async () => {
    setSecError(null);
    
    // If PIN is enabled, validate
    if (enablePin) {
      if (pin.length < 4 || pin.length > 6) {
        setSecError("PIN must be between 4 and 6 digits.");
        return;
      }
      if (pin !== confirmPin) {
        setSecError("PINs do not match.");
        return;
      }
      if (!answer.trim()) {
        setSecError("Please provide an answer to the security question.");
        return;
      }

      // Save PIN
      setSecurityPIN(pin, question, answer);
    }

    // Add first account
    const balNum = parseFloat(openingBalance) || 0;
    await addAccount(accName, accType, balNum);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between min-h-[550px] relative overflow-hidden">
        
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Slide 0: Welcome Screen */}
        {slide === 0 && (
          <div className="flex-1 flex flex-col justify-center text-center py-6">
            <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl text-indigo-600 dark:text-indigo-400 mx-auto mb-6 shadow-sm">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 id="onboarding-welcome-title" className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 m-0">
              Pocket Ledger
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-[280px] mx-auto font-medium">
              Offline-first, client-only ledger. Zero servers, absolute privacy.
            </p>
            <div className="mt-8 space-y-4 text-left max-w-[290px] mx-auto">
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-1 bg-green-50 dark:bg-green-950/30 rounded-lg text-green-600 dark:text-green-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">100% Private</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                    Everything is stored directly in your local browser database.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">No Integrations Needed</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                    Log cash, digital wallets, bank balances, and transfers manually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide 1: Create First Account */}
        {slide === 1 && (
          <div className="flex-1 flex flex-col justify-center py-4">
            <h1 id="onboarding-account-title" className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Add Your First Account</span>
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Create an account to start logging transactions. E.g., Cash or Bank.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="first-account-name-input" className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  id="first-account-name-input"
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Cash In Hand, Main Bank"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="first-account-type-select" className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  id="first-account-type-select"
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as Account['type'])}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Cash">Cash (Physical Currency)</option>
                  <option value="Bank">Bank Account (Savings/Current)</option>
                  <option value="UPI Wallet">UPI Wallet (GPay, PhonePe, Paytm)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="first-account-balance-input" className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Opening Balance
                </label>
                <input
                  id="first-account-balance-input"
                  type="number"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Set up Security PIN */}
        {slide === 2 && (
          <div className="flex-1 flex flex-col justify-center py-2">
            <h1 id="onboarding-security-title" className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Enable PIN Lock</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Add a lock screen to protect your financials from prying eyes.
            </p>

            <div className="mt-4 flex items-center justify-between p-3 bg-slate-55 dark:bg-slate-800 rounded-xl border border-slate-200/55 dark:border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                  Secure with PIN
                </span>
                <span className="text-[10px] text-slate-400">
                  Requires PIN on app cold starts
                </span>
              </div>
              <button
                id="enable-pin-toggle-btn"
                type="button"
                aria-label="Toggle Secure with PIN option"
                onClick={() => setEnablePin(!enablePin)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enablePin ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enablePin ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enablePin && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="onboarding-pin-input" className="text-[10px] text-slate-400 uppercase font-bold">
                      PIN Code
                    </label>
                    <input
                      id="onboarding-pin-input"
                      type="password"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4-6 digits"
                      className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="onboarding-confirm-pin-input" className="text-[10px] text-slate-400 uppercase font-bold">
                      Confirm PIN
                    </label>
                    <input
                      id="onboarding-confirm-pin-input"
                      type="password"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Repeat PIN"
                      className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="onboarding-security-question-select" className="text-[10px] text-slate-400 uppercase font-bold">
                    Security Question
                  </label>
                  <select
                    id="onboarding-security-question-select"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was your first car?">What was your first car?</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="onboarding-security-answer-input" className="text-[10px] text-slate-400 uppercase font-bold">
                    Recovery Answer
                  </label>
                  <input
                    id="onboarding-security-answer-input"
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Case-insensitive answer"
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                {secError && (
                  <p className="text-[11px] text-rose-500 font-semibold text-center">
                    {secError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer controls */}
        <div className="mt-8 flex items-center justify-between w-full">
          {/* Progress dots */}
          <div className="flex space-x-2" role="group" aria-label="Slide indicators">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-current={slide === i ? 'step' : undefined}
                className={`h-1.5 rounded-full transition-all duration-350 ${
                  slide === i ? 'w-5 bg-indigo-600 dark:bg-indigo-500' : 'w-1.5 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {slide < 2 ? (
            <button
              id="onboarding-continue-btn"
              onClick={handleNext}
              className="min-h-[44px] inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish-btn"
              onClick={handleFinish}
              className="min-h-[44px] inline-flex items-center space-x-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
