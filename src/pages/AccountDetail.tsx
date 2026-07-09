import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { ArrowLeft, Edit2, Plus, Search, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Account, Transaction } from '../db/db';
import { AppIconFull } from '../components/AppIcon';

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

  const { showToast, showDialog } = useNotificationStore();

  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Edit account modal state
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editType, setEditType] = useState<Account['type']>('Cash');

  // Loading skeleton state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [dateRange, filterType]);

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
    showToast(`Account updated: "${editName.trim()}"`, "success");
  };

  const handleDelete = () => {
    showDialog({
      title: "Delete Account?",
      message: `Are you sure you want to delete this account? WARNING: This will permanently delete the account "${selectedAccount.name}" and ALL its transaction history. This cannot be undone.`,
      type: "confirm",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        await deleteAccount(selectedAccount.id);
        setIsEditOpen(false);
        showToast(`Account "${selectedAccount.name}" deleted`, "success");
      }
    });
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
  
  const initialDate = chronologicalTxs.length > 0 
    ? chronologicalTxs[0].date 
    : new Date().toISOString().split('T')[0];

  chartDataMap[initialDate] = runningBalance;

  chronologicalTxs.forEach((tx) => {
    let amtChange = 0;
    if (tx.type === 'income' && tx.accountId === selectedAccount.id) {
      amtChange = tx.amount;
    } else if (tx.type === 'expense' && tx.accountId === selectedAccount.id) {
      amtChange = -tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === selectedAccount.id) {
        amtChange = -tx.amount; // Transfer out of this account
      } else if (tx.toAccountId === selectedAccount.id) {
        amtChange = tx.amount; // Transfer into this account
      }
    }
    runningBalance += amtChange;
    chartDataMap[tx.date] = runningBalance;
  });

  const chartData = Object.keys(chartDataMap)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Balance: chartDataMap[date],
    }));

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTxClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    openAddModal(tx.accountId, tx.type);
  };

  return (
    <div className="pb-24 transition-all duration-300">
      
      {/* Sticky Header - Pushed Screen Back Arrow */}
      <header id="account-detail-header" className="sticky top-0 bg-bg-surface border-b border-border-custom z-20 flex justify-between items-center px-4 py-2 mx-auto max-w-lg">
        <button
          id="account-detail-back-btn"
          onClick={handleBack}
          aria-label="Go back to accounts list"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-white/5 text-text-primary cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-1.5 justify-center">
          <AppIconFull size={24} className="w-6 h-6 rounded-lg flex-shrink-0" />
          <h1 className="text-sm font-bold text-text-primary font-display">
            Account Details
          </h1>
        </div>
        <button
          id="account-detail-edit-btn"
          onClick={() => setIsEditOpen(true)}
          aria-label="Edit account settings"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-white/5 text-text-primary cursor-pointer"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-6">
        
        {/* Balance Summary Card */}
        <section id="account-detail-worth-card" aria-label="Account worth card" className="bento-card-elevated p-6 text-center">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body">
            {selectedAccount.name}
          </span>
          <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-display">
            {formatAmount(selectedAccount.currentBalance)}
          </h2>
          <span className="text-[10px] text-text-subtle font-semibold uppercase tracking-wider block mt-1 font-body">
            {selectedAccount.type} Ledger
          </span>
        </section>

        {/* Balance Trend Line Graph */}
        {chartData.length > 1 && (
          <section id="account-detail-trend-section" aria-labelledby="trend-title" className="bento-card p-5">
            <h2 id="trend-title" className="text-xs font-bold text-text-secondary mb-3 text-left">
              Balance Trend
            </h2>
            <div className="h-36 w-full text-text-subtle" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                  <Tooltip formatter={(value) => `${currency}${value}`} />
                  <Line
                    type="monotone"
                    dataKey="Balance"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Filters Area */}
        <section id="account-detail-filters-section" aria-label="Filters and Search" className="space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <label htmlFor="account-detail-search-input" className="sr-only">Search transactions</label>
              <input
                id="account-detail-search-input"
                type="text"
                placeholder="Search category, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-xl border border-border-custom bg-bg-surface text-text-primary text-xs focus:outline-none"
              />
              <Search className="w-4 h-4 text-text-subtle absolute left-3 top-3.5" aria-hidden="true" />
            </div>

            <select
              id="account-detail-type-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              aria-label="Filter by transaction type"
              className="px-3 py-2 min-h-[44px] rounded-xl border border-border-custom bg-bg-surface text-text-secondary text-xs focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Filter by date range">
            {(['all', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                aria-pressed={dateRange === range}
                className={`px-3 py-1.5 min-h-[36px] rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                  dateRange === range
                    ? 'bg-bg-elevated border-accent-green text-accent-green shadow-sm'
                    : 'bg-bg-surface border-border-custom text-text-subtle hover:text-text-secondary'
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
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
            <div className="h-16 w-full bg-bg-surface border border-border-custom rounded-2xl skeleton-shimmer" />
          </div>
        ) : (
          <section id="account-detail-tx-section" aria-labelledby="tx-records-title" className="space-y-3">
            <h2 id="tx-records-title" className="text-xs font-bold text-text-secondary uppercase tracking-wider text-left font-body">
              Transaction Records ({filteredTxs.length})
            </h2>

            {filteredTxs.length > 0 ? (
              <div className="bento-card divide-y divide-border-custom overflow-hidden p-0">
                {filteredTxs.map((tx, idx) => {
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
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="card-entrance flex items-center justify-between p-4 hover:bg-white/5 active:scale-99 transition-all cursor-pointer"
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
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isIncome
                            ? 'bg-accent-green/10 text-accent-green-light'
                            : isExpense || isTransferOut
                            ? 'bg-accent-red/10 text-accent-red'
                            : 'bg-accent-green/10 text-accent-green-light'
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
                          <h3 className="text-xs font-bold text-text-primary truncate">
                            {isTransfer
                              ? isTransferOut
                                ? `Transfer to ${toAcc?.name}`
                                : `Transfer from ${fromAcc?.name}`
                              : tx.category}
                          </h3>
                          <p className="text-[10px] text-text-subtle mt-0.5 truncate max-w-[170px]">
                            {tx.notes || 'No description'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-bold ${
                          isIncome
                            ? 'text-accent-green-light'
                            : isExpense || isTransferOut
                            ? 'text-accent-red'
                            : 'text-accent-green-light'
                        }`}>
                          {isIncome || (isTransfer && !isTransferOut) ? '+' : '-'}
                          {formatAmount(tx.amount)}
                        </p>
                        <span className="text-[9px] text-text-subtle mt-0.5 block">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bento-card p-6 text-center text-text-subtle text-xs">
                No matching transactions found.
              </div>
            )}
          </section>
        )}
      </div>

      {/* Floating Add Transaction Button for this account */}
      <button
        id="account-detail-fab-add"
        onClick={() => openAddModal(selectedAccount.id)}
        className="fixed bottom-20 right-4 z-20 w-12.5 h-12.5 rounded-2xl bg-accent-green text-bg-base flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:scale-105 transition cursor-pointer"
        aria-label="Add Transaction to Account"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Edit Account Modal */}
      {isEditOpen && (
        <div id="account-detail-edit-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-md bg-bg-surface border border-border-custom rounded-3xl p-6 shadow-2xl relative" aria-labelledby="edit-account-modal-title">
            <button
              id="account-detail-edit-close-btn"
              onClick={() => setIsEditOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-left">
              <h2 id="edit-account-modal-title" className="text-lg font-bold text-text-primary m-0 font-display">
                Edit Account
              </h2>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4 text-left">
              <div className="space-y-1">
                <label htmlFor="account-detail-name-input" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Name
                </label>
                <input
                  id="account-detail-name-input"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-sm font-medium focus:outline-none focus:border-accent-green"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="account-detail-type-select-modal" className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">
                  Account Type
                </label>
                <select
                  id="account-detail-type-select-modal"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as Account['type'])}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-green"
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
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>

                <button
                  id="account-detail-cancel-btn"
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-border-custom bg-white/5 hover:bg-white/10 text-text-primary font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  id="account-detail-save-btn"
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold text-xs shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
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
