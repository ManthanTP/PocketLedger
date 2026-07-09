import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Wallet, CreditCard, Landmark, Coins, HelpCircle, Plus, ChevronRight, X } from 'lucide-react';
import type { Account } from '../db/db';
import { AccountDetail } from './AccountDetail';

export const Accounts: React.FC = () => {
  const {
    accounts,
    selectedAccount,
    setSelectedAccount,
    addAccount,
    currency,
    hideBalance
  } = useFinanceStore();

  const [isOpenAddModal, setIsOpenAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<Account['type']>('Cash');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // If an account is selected, render its detail page instead
  if (selectedAccount) {
    return <AccountDetail />;
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a valid account name.");
      return;
    }
    const balanceNum = parseFloat(openingBalance) || 0;
    await addAccount(name.trim(), type, balanceNum);
    setName('');
    setType('Cash');
    setOpeningBalance('0');
    setIsOpenAddModal(false);
  };

  const getAccountIcon = (accType: Account['type']) => {
    const classStr = "w-5 h-5";
    switch (accType) {
      case 'Cash':
        return <Coins className={`${classStr} text-amber-500`} />;
      case 'Bank':
        return <Landmark className={`${classStr} text-blue-500`} />;
      case 'UPI Wallet':
        return <Wallet className={`${classStr} text-green-500`} />;
      case 'Credit Card':
        return <CreditCard className={`${classStr} text-rose-500`} />;
      default:
        return <HelpCircle className={`${classStr} text-slate-500`} />;
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Pocket Ledger
          </span>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Accounts
          </h2>
        </div>
        <button
          onClick={() => setIsOpenAddModal(true)}
          className="inline-flex items-center space-x-1 px-4 py-2.5 rounded-2xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Account</span>
        </button>
      </div>

      {/* Aggregate Balance Panel */}
      <div className="glass-panel rounded-3xl p-6 text-center shadow-xs">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">
          Total Net Worth
        </span>
        <h3 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight mt-1">
          {formatAmount(totalBalance)}
        </h3>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccount(acc)}
            className="glass-panel rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/10 hover:border-slate-350 dark:hover:border-slate-700 active:scale-99 transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex-shrink-0">
                {getAccountIcon(acc.type)}
              </div>
              <div className="min-w-0 text-left">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-150 truncate">
                  {acc.name}
                </h4>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                  {acc.type}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {formatAmount(acc.currentBalance)}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-405 dark:text-slate-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700/50 relative">
            <button
              onClick={() => setIsOpenAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">
              Create New Account
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-1">
              Add a ledger for tracking transactions in this account.
            </p>

            <form onSubmit={handleAdd} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank Savings, Paytm Wallet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Account['type'])}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-150 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Cash">Cash (Physical Cash In Hand)</option>
                  <option value="Bank">Bank Account (Savings/Checking)</option>
                  <option value="UPI Wallet">UPI Wallet (PhonePe, Paytm, etc.)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Opening Balance ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
