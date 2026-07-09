import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Wallet, CreditCard, Landmark, Coins, HelpCircle, Plus, ChevronRight, X } from 'lucide-react';
import type { Account } from '../db/db';
import { AccountDetail } from './AccountDetail';
import { AppIconFull } from '../components/AppIcon';

export const Accounts: React.FC = () => {
  const {
    accounts,
    selectedAccount,
    setSelectedAccount,
    addAccount,
    currency,
    hideBalance
  } = useFinanceStore();

  const { showToast } = useNotificationStore();

  const [isOpenAddModal, setIsOpenAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<Account['type']>('Cash');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Loading & Skeleton state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // If an account is selected, render its detail page instead
  if (selectedAccount) {
    return <AccountDetail />;
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a valid account name.", "error");
      return;
    }
    const balanceNum = parseFloat(openingBalance) || 0;
    await addAccount(name.trim(), type, balanceNum);
    setName('');
    setType('Cash');
    setOpeningBalance('0');
    setIsOpenAddModal(false);
    showToast(`Account "${name.trim()}" created`, "success");
  };

  const getAccountIcon = (accType: Account['type']) => {
    const classStr = "w-5 h-5";
    switch (accType) {
      case 'Cash':
        return <Coins className={`${classStr} text-accent-amber`} />;
      case 'Bank':
        return <Landmark className={`${classStr} text-indigo-400`} />;
      case 'UPI Wallet':
        return <Wallet className={`${classStr} text-accent-green-light`} />;
      case 'Credit Card':
        return <CreditCard className={`${classStr} text-accent-red`} />;
      default:
        return <HelpCircle className={`${classStr} text-text-subtle`} />;
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2 text-left">
            <div className="h-3 w-16 bg-bg-elevated rounded-full skeleton-shimmer" />
            <div className="h-6 w-28 bg-bg-elevated rounded-full skeleton-shimmer" />
          </div>
          <div className="h-10 w-24 bg-bg-elevated rounded-2xl skeleton-shimmer" />
        </div>
        <div className="h-[96px] w-full bg-bg-surface border border-border-custom rounded-3xl skeleton-shimmer" />
        <div className="space-y-3">
          <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
          <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Page Header */}
      <header id="accounts-header" className="flex justify-between items-center">
        <div className="flex items-center space-x-2.5 text-left">
          <AppIconFull size={36} className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-text-subtle uppercase tracking-wide">
              Pocket Ledger
            </span>
            <h1 id="accounts-title" className="text-2xl font-bold text-text-primary font-display mt-0.5">
              Accounts
            </h1>
          </div>
        </div>
        <button
          id="accounts-add-btn"
          onClick={() => setIsOpenAddModal(true)}
          className="min-h-[44px] inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-accent-green hover:bg-accent-green/90 text-bg-base text-xs font-bold shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Account</span>
        </button>
      </header>

      {/* Aggregate Balance Panel */}
      <section id="accounts-worth-card" aria-labelledby="worth-card-label" className="bento-card-elevated p-6 text-center">
        <span id="worth-card-label" className="text-xs font-bold text-text-secondary uppercase tracking-wide font-body">
          Total Net Worth
        </span>
        <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-display">
          {formatAmount(totalBalance)}
        </h2>
      </section>

      {/* Accounts List */}
      <section id="accounts-list-section" aria-label="Account list" className="space-y-3">
        {accounts.map((acc, idx) => (
          <article
            key={acc.id}
            onClick={() => setSelectedAccount(acc)}
            style={{ animationDelay: `${idx * 40}ms` }}
            className="card-entrance bento-card p-4 flex items-center justify-between hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${acc.name} (${acc.type}) balance is ${formatAmount(acc.currentBalance)}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedAccount(acc);
              }
            }}
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="p-3 bg-bg-elevated rounded-2xl flex-shrink-0" aria-hidden="true">
                {getAccountIcon(acc.type)}
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-sm font-bold text-text-primary truncate">
                  {acc.name}
                </h2>
                <span className="text-[10px] text-text-subtle font-semibold uppercase tracking-wider block mt-0.5 font-body">
                  {acc.type}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-text-primary">
                {formatAmount(acc.currentBalance)}
              </span>
              <ChevronRight className="w-4 h-4 text-text-subtle" aria-hidden="true" />
            </div>
          </article>
        ))}
      </section>

      {/* Add Account Modal */}
      {isOpenAddModal && (
        <div id="accounts-add-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-md bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative" aria-labelledby="add-account-modal-title">
            <button
              id="accounts-modal-close-btn"
              onClick={() => setIsOpenAddModal(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-left">
              <h2 id="add-account-modal-title" className="text-lg font-bold text-text-primary m-0 font-display">
                Create New Account
              </h2>
              <p className="text-xs text-text-subtle mt-1 font-body">
                Add a ledger for tracking transactions in this account.
              </p>
            </div>

            <form onSubmit={handleAdd} className="mt-6 space-y-4 text-left">
              <div className="space-y-1">
                <label htmlFor="accounts-name-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  id="accounts-name-input"
                  type="text"
                  required
                  placeholder="e.g. Bank Savings, Paytm Wallet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-sm font-medium focus:outline-none focus:border-accent-green"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="accounts-type-select" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  id="accounts-type-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as Account['type'])}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
                >
                  <option value="Cash">Cash (Physical Cash In Hand)</option>
                  <option value="Bank">Bank Account (Savings/Checking)</option>
                  <option value="UPI Wallet">UPI Wallet (PhonePe, Paytm, etc.)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="accounts-balance-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Opening Balance ({currency})
                </label>
                <input
                  id="accounts-balance-input"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-sm font-medium focus:outline-none focus:border-accent-green"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  id="accounts-cancel-btn"
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-white/5 hover:bg-white/10 text-text-primary font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="accounts-submit-btn"
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
