import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Search, X, SlidersHorizontal, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import type { Transaction } from '../db/db';
import { AppIconFull } from '../components/AppIcon';

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

  // Loading & Skeleton state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [filterType, filterAccount, filterCategory, search]);

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
      <header className="flex justify-between items-center text-left">
        <div className="flex items-center space-x-2.5">
          <AppIconFull size={36} className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-text-subtle uppercase tracking-wide">
              Pocket Ledger
            </span>
            <h1 id="transactions-title" className="text-2xl font-bold text-text-primary font-display mt-0.5">
              Transaction Ledger
            </h1>
          </div>
        </div>
        <button
          id="tx-filters-toggle-btn"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          aria-expanded={showFiltersPanel}
          aria-label="Toggle advanced filters panel"
          className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition-all cursor-pointer ${
            showFiltersPanel || filterType !== 'all' || filterAccount !== 'all' || filterCategory !== 'all'
              ? 'bg-accent-green/10 border-accent-green/30 text-accent-green-light'
              : 'bg-bg-surface border-border-custom text-text-secondary hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Search Input */}
      <section aria-label="Search Bar" className="relative">
        <label htmlFor="tx-search-input" className="sr-only">Search transactions</label>
        <input
          id="tx-search-input"
          type="text"
          placeholder="Search by note, category or amount..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-[44px] pl-9 pr-10 py-2.5 rounded-xl border border-border-custom bg-bg-surface text-text-primary text-xs focus:outline-none focus:border-accent-green"
        />
        <Search className="w-4 h-4 text-text-subtle absolute left-3 top-3.5" aria-hidden="true" />
        {search && (
          <button
            id="tx-search-clear-btn"
            onClick={() => setSearch('')}
            aria-label="Clear search input"
            className="absolute right-2 top-1.5 p-2 rounded-full hover:bg-white/5 text-text-subtle hover:text-text-primary cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </section>

      {/* Advanced Filters Panel */}
      {showFiltersPanel && (
        <section id="tx-filters-panel" aria-labelledby="filters-title" className="bento-card p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 id="filters-title" className="text-xs font-bold text-text-secondary">
              Advanced Filters
            </h2>
            <button
              id="tx-filters-clear-btn"
              onClick={clearFilters}
              className="text-[10px] font-bold text-accent-green-light hover:underline cursor-pointer min-h-[32px]"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left">
            {/* Filter Type */}
            <div className="space-y-1">
              <label htmlFor="tx-filter-type-select" className="text-[9px] text-text-subtle uppercase font-bold">
                Type
              </label>
              <select
                id="tx-filter-type-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full min-h-[40px] p-2 rounded-lg border border-border-custom bg-bg-base text-text-primary text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {/* Filter Account */}
            <div className="space-y-1">
              <label htmlFor="tx-filter-account-select" className="text-[9px] text-text-subtle uppercase font-bold">
                Account
              </label>
              <select
                id="tx-filter-account-select"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full min-h-[40px] p-2 rounded-lg border border-border-custom bg-bg-base text-text-primary text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Category */}
            <div className="space-y-1">
              <label htmlFor="tx-filter-category-select" className="text-[9px] text-text-subtle uppercase font-bold">
                Category
              </label>
              <select
                id="tx-filter-category-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full min-h-[40px] p-2 rounded-lg border border-border-custom bg-bg-base text-text-primary text-[10px] focus:outline-none"
              >
                <option value="all">All</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Ledger Records */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-6 w-24 bg-bg-elevated rounded-full skeleton-shimmer" />
          <div className="h-[200px] w-full bg-bg-surface border border-border-custom rounded-3xl skeleton-shimmer" />
        </div>
      ) : (
        <section aria-label="Chronological Ledger Records" className="space-y-6">
          {sortedMonths.length > 0 ? (
            sortedMonths.map((monthStr) => (
              <div key={monthStr} className="space-y-2">
                
                {/* Sticky Month Header */}
                <div className="sticky top-0 bg-bg-base/90 backdrop-blur-md py-2 z-10 text-left border-b border-border-custom">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">
                    {formatMonthHeader(monthStr)}
                  </span>
                </div>

                {/* Transactions List */}
                <div className="bento-card divide-y divide-border-custom overflow-hidden shadow-xs p-0">
                  {groupedTxs[monthStr].map((tx, idx) => {
                    const account = accounts.find(a => a.id === tx.accountId);
                    const toAccount = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
                    
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';

                    return (
                      <article
                        key={tx.id}
                        onClick={() => handleTxClick(tx)}
                        role="button"
                        tabIndex={0}
                        style={{ animationDelay: `${idx * 45}ms` }}
                        aria-label={`${tx.type} of ${formatAmount(tx.amount)} on account ${account?.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleTxClick(tx);
                          }
                        }}
                        className="card-entrance flex items-center justify-between p-4 hover:bg-white/5 active:scale-99 transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isIncome
                              ? 'bg-accent-green/10 text-accent-green-light'
                              : isExpense
                              ? 'bg-accent-red/10 text-accent-red'
                              : 'bg-indigo-500/10 text-indigo-400'
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
                            <h2 className="text-xs font-bold text-text-primary truncate">
                              {tx.type === 'transfer' ? 'Transfer' : tx.category}
                            </h2>
                            <p className="text-[10px] text-text-subtle mt-0.5 truncate max-w-[170px]">
                              {tx.type === 'transfer'
                                ? `${account?.name} → ${toAccount?.name}`
                                : account?.name}
                              {tx.notes && ` • ${tx.notes}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-xs font-bold ${
                            isIncome
                              ? 'text-accent-green-light'
                              : isExpense
                              ? 'text-accent-red'
                              : 'text-text-primary'
                          }`}>
                            {isIncome ? '+' : isExpense ? '-' : ''}
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

              </div>
            ))
          ) : (
            <div className="bento-card p-8 text-center text-text-subtle text-xs">
              No matching transactions found.
            </div>
          )}
        </section>
      )}

    </div>
  );
};
