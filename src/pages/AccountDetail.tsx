import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { ArrowLeft, Edit2, Plus, Search, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Account, Transaction } from '../db/db';

export const AccountDetail: React.FC = () => {
  const {
    accounts,
    selectedAccount,
    setSelectedAccount,
    transactions,
    updateAccount,
    deleteAccount,
    openAddModal,
    setSelectedTransaction,
    currency,
    hideBalance
  } = useFinanceStore();

  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Edit account modal state
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editType, setEditType] = useState<Account['type']>('Cash');

  useEffect(() => {
    if (selectedAccount) {
      setEditName(selectedAccount.name);
      setEditType(selectedAccount.type);
    }
  }, [selectedAccount]);

  if (!selectedAccount) return null;

  const handleBack = () => {
    setSelectedAccount(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await updateAccount(selectedAccount.id, editName.trim(), editType);
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete this account? WARNING: This will permanently delete the account "${selectedAccount.name}" and ALL its transaction history. This cannot be undone.`)) {
      await deleteAccount(selectedAccount.id);
      setIsEditOpen(false);
    }
  };

  // Filter transactions for this account
  const accountTxs = transactions.filter(
    (tx) => tx.accountId === selectedAccount.id || tx.toAccountId === selectedAccount.id
  );

  // Apply filters
  const filteredTxs = accountTxs.filter((tx) => {
    // 1. Search text
    const searchMatch =
      tx.notes.toLowerCase().includes(search.toLowerCase()) ||
      (tx.category && tx.category.toLowerCase().includes(search.toLowerCase()));

    // 2. Type filter
    let typeMatch = true;
    if (filterType === 'income') typeMatch = tx.type === 'income' && tx.accountId === selectedAccount.id;
    if (filterType === 'expense') typeMatch = tx.type === 'expense' && tx.accountId === selectedAccount.id;
    if (filterType === 'transfer') typeMatch = tx.type === 'transfer';

    // 3. Date range filter
    let dateMatch = true;
    if (dateRange !== 'all') {
      const txDate = new Date(tx.date);
      const limitDate = new Date();
      if (dateRange === 'week') limitDate.setDate(limitDate.getDate() - 7);
      if (dateRange === 'month') limitDate.setMonth(limitDate.getMonth() - 1);
      if (dateRange === 'year') limitDate.setFullYear(limitDate.getFullYear() - 1);
      dateMatch = txDate >= limitDate;
    }

    return searchMatch && typeMatch && dateMatch;
  });

  // Calculate Running Balance Trend data for chart
  // Sort oldest first to calculate progressive balance
  const chronologicalTxs = [...accountTxs].reverse();
  
  let runningBalance = selectedAccount.openingBalance;
  const chartDataMap: { [date: string]: number } = {};
  
  // Set initial opening balance date (or use first transaction date if available)
  const initialDate = chronologicalTxs.length > 0 
    ? chronologicalTxs[0].date 
    : new Date().toISOString().split('T')[0];

  chartDataMap[initialDate] = runningBalance;

  chronologicalTxs.forEach((tx) => {
    if (tx.type === 'income' && tx.accountId === selectedAccount.id) {
      runningBalance += tx.amount;
    } else if (tx.type === 'expense' && tx.accountId === selectedAccount.id) {
      runningBalance -= tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === selectedAccount.id) {
        runningBalance -= tx.amount; // Transferred out
      }
      if (tx.toAccountId === selectedAccount.id) {
        runningBalance += tx.amount; // Transferred in
      }
    }
    // Record balance at this transaction's date
    chartDataMap[tx.date] = runningBalance;
  });

  const chartData = Object.keys(chartDataMap).map((date) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Balance: chartDataMap[date],
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTxClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    openAddModal(selectedAccount.id, tx.type);
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Header Panel */}
      <header id="account-detail-header" className="flex justify-between items-center">
        <button
          id="account-detail-back-btn"
          onClick={handleBack}
          aria-label="Go back to accounts list"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Account Details
        </h1>
        <button
          id="account-detail-edit-btn"
          onClick={() => setIsEditOpen(true)}
          aria-label="Edit account settings"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 cursor-pointer"
        >
          <Edit2 className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Balance Summary Card */}
      <section id="account-detail-worth-card" aria-label="Account worth card" className="glass-panel rounded-3xl p-6 text-center shadow-xs bg-gradient-to-tr from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {selectedAccount.name}
        </span>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mt-1">
          {formatAmount(selectedAccount.currentBalance)}
        </h2>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block mt-1">
          {selectedAccount.type} Ledger
        </span>
      </section>

      {/* Balance Trend Line Graph */}
      {chartData.length > 1 && (
        <section id="account-detail-trend-section" aria-labelledby="trend-title" className="glass-panel rounded-3xl p-5 shadow-xs">
          <h2 id="trend-title" className="text-xs font-bold text-slate-700 dark:text-slate-400 mb-3 text-left">
            Balance Trend
          </h2>
          <div className="h-36 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip formatter={(value) => `${currency}${value}`} />
                <Line
                  type="monotone"
                  dataKey="Balance"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Filters Area */}
      <section id="account-detail-filters-section" aria-label="Filters and Search" className="space-y-3">
        <div className="flex space-x-2">
          {/* Search bar */}
          <div className="flex-1 relative">
            <label htmlFor="account-detail-search-input" className="sr-only">Search transactions</label>
            <input
              id="account-detail-search-input"
              type="text"
              placeholder="Search category, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
          </div>

          {/* Type Filter */}
          <select
            id="account-detail-type-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            aria-label="Filter by transaction type"
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {/* Date chips */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Filter by date range">
          {(['all', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              aria-pressed={dateRange === range}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                dateRange === range
                  ? 'bg-slate-800 dark:bg-slate-100 border-slate-800 dark:border-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              {range === 'all' && 'All Time'}
              {range === 'week' && 'Last 7 Days'}
              {range === 'month' && 'Last 30 Days'}
              {range === 'year' && 'Last 1 Year'}
            </button>
          ))}
        </div>
      </section>

      {/* Transaction List */}
      <section id="account-detail-tx-section" aria-labelledby="tx-records-title" className="space-y-3">
        <h2 id="tx-records-title" className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-left">
          Transaction Records ({filteredTxs.length})
        </h2>

        {filteredTxs.length > 0 ? (
          <div className="glass-panel rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/30 overflow-hidden shadow-xs">
            {filteredTxs.map((tx) => {
              const fromAcc = accounts.find(a => a.id === tx.accountId);
              const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
              
              const isIncome = tx.type === 'income' && tx.accountId === selectedAccount.id;
              const isExpense = tx.type === 'expense' && tx.accountId === selectedAccount.id;
              const isTransfer = tx.type === 'transfer';
              const isTransferOut = isTransfer && tx.accountId === selectedAccount.id;

              return (
                <article
                  key={tx.id}
                  onClick={() => handleTxClick(tx)}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 active:scale-99 transition-all cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${isTransfer ? 'Transfer' : tx.category} of ${formatAmount(tx.amount)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleTxClick(tx);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isIncome
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                        : isExpense || isTransferOut
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                        : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                    }`} aria-hidden="true">
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 text-left">
                      <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {isTransfer
                          ? isTransferOut
                            ? `Transfer to ${toAcc?.name}`
                            : `Transfer from ${fromAcc?.name}`
                          : tx.category}
                      </h2>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[170px]">
                        {tx.notes || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs font-bold ${
                      isIncome
                        ? 'text-green-600 dark:text-green-400'
                        : isExpense || isTransferOut
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {isIncome || (isTransfer && !isTransferOut) ? '+' : '-'}
                      {formatAmount(tx.amount)}
                    </p>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            No matching transactions found.
          </div>
        )}
      </section>

      {/* Floating Add Transaction Button for this account */}
      <button
        id="account-detail-fab-add"
        onClick={() => openAddModal(selectedAccount.id)}
        className="fixed bottom-20 right-4 z-20 w-12.5 h-12.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer"
        aria-label="Add Transaction to Account"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Edit Account Modal */}
      {isEditOpen && (
        <div id="account-detail-edit-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700/50 relative" aria-labelledby="edit-account-modal-title">
            <button
              id="account-detail-edit-close-btn"
              onClick={() => setIsEditOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 id="edit-account-modal-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 m-0">
              Edit Account
            </h2>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="account-detail-name-input" className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  id="account-detail-name-input"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="account-detail-type-select-modal" className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  id="account-detail-type-select-modal"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as Account['type'])}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Cash">Cash (Physical Cash In Hand)</option>
                  <option value="Bank">Bank Account (Savings/Checking)</option>
                  <option value="UPI Wallet">UPI Wallet (PhonePe, GPay, Paytm)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  id="account-detail-delete-btn"
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>

                <button
                  id="account-detail-cancel-btn"
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  id="account-detail-save-btn"
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
