import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Wallet, ShieldCheck, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import type { Account } from '../db/db';
import { AppIconFull } from './AppIcon';

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-md bg-bg-surface rounded-3xl p-8 shadow-2xl border border-border-custom flex flex-col justify-between min-h-[580px] relative overflow-hidden text-left">
        
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-accent-green/5 blur-3xl pulse-biometric" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-accent-violet/5 blur-3xl pulse-biometric" style={{ animationDelay: '1s' }} />

        {/* Slide 0: Welcome Screen */}
        {slide === 0 && (
          <div className="flex-1 flex flex-col justify-center text-center py-6">
            <AppIconFull size={120} className="mx-auto mb-6 pulse-biometric" />
            <h1 id="onboarding-welcome-title" className="text-3xl font-extrabold tracking-tight text-text-primary font-display m-0">
              Pocket Ledger
            </h1>
            <p className="text-xs text-text-secondary mt-2 max-w-[280px] mx-auto font-medium font-body leading-relaxed">
              Offline-first, client-only ledger. Zero servers, absolute privacy.
            </p>
            <div className="mt-8 space-y-4 text-left max-w-[290px] mx-auto">
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-1 bg-accent-green/10 rounded-lg text-accent-green-light">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-text-primary font-display">100% Private</h2>
                  <p className="text-[10px] text-text-secondary leading-normal font-body">
                    Everything is stored directly in your local browser database.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-1 bg-accent-green/10 rounded-lg text-accent-green-light">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-text-primary font-display">No Integrations Needed</h2>
                  <p className="text-[10px] text-text-secondary leading-normal font-body">
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
            <h1 id="onboarding-account-title" className="text-xl font-bold text-text-primary font-display flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-accent-green-light" />
              <span>Add Your First Account</span>
            </h1>
            <p className="text-xs text-text-secondary mt-1 font-body">
              Create an account to start logging transactions. E.g., Cash or Bank.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="first-account-name-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  id="first-account-name-input"
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Cash In Hand, Main Bank"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="first-account-type-select" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  id="first-account-type-select"
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as Account['type'])}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                >
                  <option value="Cash">Cash (Physical Currency)</option>
                  <option value="Bank">Bank Account (Savings/Current)</option>
                  <option value="UPI Wallet">UPI Wallet (GPay, PhonePe, Paytm)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="first-account-balance-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Opening Balance
                </label>
                <input
                  id="first-account-balance-input"
                  type="number"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Set up Security PIN */}
        {slide === 2 && (
          <div className="flex-1 flex flex-col justify-center py-2">
            <h1 id="onboarding-security-title" className="text-xl font-bold text-text-primary font-display flex items-center space-x-2">
              <KeyRound className="w-6 h-6 text-accent-green-light" />
              <span>Enable PIN Lock</span>
            </h1>
            <p className="text-xs text-text-secondary mt-1 font-body">
              Add a lock screen to protect your financials from prying eyes.
            </p>

            <div className="mt-4 flex items-center justify-between p-3.5 bg-bg-base rounded-xl border border-border-custom">
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-text-primary">
                  Secure with PIN
                </span>
                <span className="text-[10px] text-text-secondary font-body">
                  Requires PIN on app cold starts
                </span>
              </div>
              <button
                id="enable-pin-toggle-btn"
                type="button"
                aria-label="Toggle Secure with PIN option"
                onClick={() => setEnablePin(!enablePin)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enablePin ? 'bg-accent-green' : 'bg-bg-elevated'
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
                    <label htmlFor="onboarding-pin-input" className="text-[10px] text-text-secondary uppercase font-bold">
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
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs text-center focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="onboarding-confirm-pin-input" className="text-[10px] text-text-secondary uppercase font-bold">
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
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="onboarding-security-question-select" className="text-[10px] text-text-secondary uppercase font-bold">
                    Security Question
                  </label>
                  <select
                    id="onboarding-security-question-select"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                  >
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was your first car?">What was your first car?</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="onboarding-security-answer-input" className="text-[10px] text-text-secondary uppercase font-bold">
                    Recovery Answer
                  </label>
                  <input
                    id="onboarding-security-answer-input"
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Case-insensitive answer"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                  />
                </div>

                {secError && (
                  <p className="text-[11px] text-accent-red font-semibold text-center font-body">
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
                  slide === i ? 'w-5 bg-accent-green' : 'w-1.5 bg-bg-elevated'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {slide < 2 ? (
            <button
              id="onboarding-continue-btn"
              onClick={handleNext}
              className="min-h-[44px] inline-flex items-center space-x-1.5 bg-accent-green hover:bg-accent-green/90 text-bg-base px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish-btn"
              onClick={handleFinish}
              className="min-h-[44px] inline-flex items-center space-x-1.5 bg-accent-green hover:bg-accent-green/90 text-bg-base px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
