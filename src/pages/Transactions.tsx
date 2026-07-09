import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Search, X, SlidersHorizontal, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import type { Transaction } from '../db/db';

export const Transactions: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    openAddModal,
    setSelectedTransaction,
    currency,
    hideBalance
  } = useFinanceStore();

  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Apply filters
  const filteredTxs = transactions.filter((tx) => {
    // 1. Search notes/category/amount
    const amountStr = String(tx.amount);
    const searchMatch =
      tx.notes.toLowerCase().includes(search.toLowerCase()) ||
      (tx.category && tx.category.toLowerCase().includes(search.toLowerCase())) ||
      amountStr.includes(search);

    // 2. Type filter
    const typeMatch = filterType === 'all' || tx.type === filterType;

    // 3. Account filter
    const accountMatch =
      filterAccount === 'all' ||
      tx.accountId === filterAccount ||
      tx.toAccountId === filterAccount;

    // 4. Category filter
    const categoryMatch =
      filterCategory === 'all' ||
      (tx.category && tx.category.toLowerCase() === filterCategory.toLowerCase());

    return searchMatch && typeMatch && accountMatch && categoryMatch;
  });

  // Group transactions by month (YYYY-MM)
  const groupedTxs: { [monthStr: string]: Transaction[] } = {};
  filteredTxs.forEach((tx) => {
    // Format YYYY-MM from date string YYYY-MM-DD
    const monthKey = tx.date.substring(0, 7);
    if (!groupedTxs[monthKey]) {
      groupedTxs[monthKey] = [];
    }
    groupedTxs[monthKey].push(tx);
  });

  // Sort months descending
  const sortedMonths = Object.keys(groupedTxs).sort((a, b) => b.localeCompare(a));

  const formatMonthHeader = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTxClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    openAddModal(tx.accountId, tx.type);
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setSearch('');
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-5 transition-all duration-300">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">
            Pocket Ledger
          </span>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Transaction Ledger
          </h2>
        </div>
        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
            showFiltersPanel || filterType !== 'all' || filterAccount !== 'all' || filterCategory !== 'all'
              ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-650 dark:text-indigo-400'
              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 text-slate-400 hover:text-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by note, category or amount..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFiltersPanel && (
        <div className="glass-panel rounded-2xl p-4 shadow-sm space-y-4 border border-slate-200/50 dark:border-slate-750">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-750 dark:text-slate-300">
              Advanced Filters
            </h4>
            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Filter Type */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-305 text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {/* Filter Account */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                Account
              </label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-305 text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Category */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-305 text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Records */}
      <div className="space-y-6">
        {sortedMonths.length > 0 ? (
          sortedMonths.map((monthStr) => (
            <div key={monthStr} className="space-y-2">
              
              {/* Sticky Month Header */}
              <div className="sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs py-1.5 z-10 text-left border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  {formatMonthHeader(monthStr)}
                </span>
              </div>

              {/* Transactions List */}
              <div className="glass-panel rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/30 overflow-hidden shadow-xs">
                {groupedTxs[monthStr].map((tx) => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  const toAccount = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
                  
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const isTransfer = tx.type === 'transfer';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleTxClick(tx)}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 active:scale-99 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isIncome
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                            : isExpense
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455'
                            : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : isExpense ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate">
                            {isTransfer ? 'Transfer' : tx.category}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[170px]">
                            {isTransfer
                              ? `${account?.name} → ${toAccount?.name}`
                              : account?.name}
                            {tx.notes && ` • ${tx.notes}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-bold ${
                          isIncome
                            ? 'text-green-600 dark:text-green-400'
                            : isExpense
                            ? 'text-rose-600 dark:text-rose-455'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatAmount(tx.amount)}
                        </p>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 dark:text-slate-550 text-xs">
            No matching transactions found.
          </div>
        )}
      </div>

    </div>
  );
};
