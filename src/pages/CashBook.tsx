import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Plus, ArrowLeft, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import type { Transaction } from '../db/db';

interface DailySummary {
  date: string;
  closingBalance: number;
  spent: number;
  received: number;
  transactions: Transaction[];
}

export const CashBook: React.FC = () => {
  const {
    accounts,
    transactions,
    openAddModal,
    setActiveTab,
    setSelectedTransaction,
    currency,
    hideBalance
  } = useFinanceStore();

  const [expandedDates, setExpandedDates] = useState<{ [date: string]: boolean }>({});

  const cashAccount = accounts.find(a => a.type === 'Cash');

  if (!cashAccount) {
    return (
      <div className="pb-24 pt-6 px-4 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center mx-auto">
          <Coins className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          No Cash Account Found
        </h3>
        <p className="text-xs text-slate-450 dark:text-slate-500 max-w-xs mx-auto">
          The Cash Book requires an account of type "Cash" to track physical money.
        </p>
        <button
          onClick={() => setActiveTab('accounts')}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
        >
          Go to Accounts
        </button>
      </div>
    );
  }

  // Toggle expand/collapse for a date
  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // 1. Gather all transactions affecting this Cash account
  const cashTxs = transactions.filter(
    (tx) => tx.accountId === cashAccount.id || tx.toAccountId === cashAccount.id
  );

  // 2. Sort chronologically (oldest first) to compute running daily closing balances
  const chronologicalTxs = [...cashTxs].reverse();
  
  const dailySummaries: { [date: string]: DailySummary } = {};
  let runningBalance = cashAccount.openingBalance;

  // Track daily numbers
  chronologicalTxs.forEach((tx) => {
    let amtChange = 0;
    let isSpend = false;
    let isReceive = false;

    if (tx.type === 'income' && tx.accountId === cashAccount.id) {
      amtChange = tx.amount;
      isReceive = true;
    } else if (tx.type === 'expense' && tx.accountId === cashAccount.id) {
      amtChange = -tx.amount;
      isSpend = true;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === cashAccount.id) {
        amtChange = -tx.amount; // Transfer out of cash
        isSpend = true;
      }
      if (tx.toAccountId === cashAccount.id) {
        amtChange = tx.amount; // Transfer into cash
        isReceive = true;
      }
    }

    runningBalance += amtChange;

    const txDate = tx.date;
    if (!dailySummaries[txDate]) {
      dailySummaries[txDate] = {
        date: txDate,
        closingBalance: 0,
        spent: 0,
        received: 0,
        transactions: []
      };
    }

    dailySummaries[txDate].closingBalance = runningBalance;
    dailySummaries[txDate].transactions.push(tx);
    
    if (isSpend) {
      dailySummaries[txDate].spent += tx.amount;
    }
    if (isReceive) {
      dailySummaries[txDate].received += tx.amount;
    }
  });

  // Convert to sorted array (newest date first)
  const summariesList = Object.values(dailySummaries).sort((a, b) => b.date.localeCompare(a.date));

  // Compute Today's cash spent
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySummary = dailySummaries[todayStr];
  const todayCashSpent = todaySummary ? todaySummary.spent : 0;

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTxClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    openAddModal(cashAccount.id, tx.type);
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-850 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Cash Book Ledger
        </h3>
        <div className="w-9 h-9" /> {/* Spacer */}
      </div>

      {/* Today's Cash Outflow & Closing balance */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cash Used Today Card */}
        <div className="glass-panel rounded-3xl p-5 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Cash Spent Today
          </span>
          <h3 className="text-2xl font-extrabold text-rose-500 tracking-tight mt-1">
            {formatAmount(todayCashSpent)}
          </h3>
        </div>

        {/* Closing Balance Card */}
        <div className="glass-panel rounded-3xl p-5 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Closing Cash Balance
          </span>
          <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mt-1">
            {formatAmount(cashAccount.currentBalance)}
          </h3>
        </div>
      </div>

      {/* Daily Records List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-left">
          Daily Records
        </h4>

        {summariesList.length > 0 ? (
          <div className="space-y-3">
            {summariesList.map((day) => {
              const isExpanded = expandedDates[day.date];
              const dateObj = new Date(day.date);
              
              return (
                <div
                  key={day.date}
                  className="glass-panel rounded-2xl overflow-hidden shadow-xs border border-slate-200/50 dark:border-slate-850"
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleDate(day.date)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-750/15 cursor-pointer"
                  >
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-205">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex space-x-2 text-[10px] mt-0.5 font-bold">
                        <span className="text-green-600 dark:text-green-400">In: {formatAmount(day.received)}</span>
                        <span className="text-rose-500">Out: {formatAmount(day.spent)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">
                          Closing Balance
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {formatAmount(day.closingBalance)}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Transactions list */}
                  {isExpanded && (
                    <div className="bg-slate-50/40 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/40 divide-y divide-slate-100 dark:divide-slate-800/30">
                      {day.transactions.map((tx) => {
                        const isIncome = tx.type === 'income' && tx.accountId === cashAccount.id;
                        const isTransferOut = tx.type === 'transfer' && tx.accountId === cashAccount.id;
                        const otherAccId = tx.accountId === cashAccount.id ? tx.toAccountId : tx.accountId;
                        const otherAcc = accounts.find(a => a.id === otherAccId);

                        return (
                          <div
                            key={tx.id}
                            onClick={() => handleTxClick(tx)}
                            className="flex items-center justify-between p-3.5 pl-6 hover:bg-slate-100/40 dark:hover:bg-slate-800/10 cursor-pointer text-xs transition"
                          >
                            <div className="text-left min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {tx.type === 'transfer'
                                  ? isTransferOut
                                    ? `Transfer to ${otherAcc?.name || 'Other Account'}`
                                    : `Transfer from ${otherAcc?.name || 'Other Account'}`
                                  : tx.category}
                              </p>
                              {tx.notes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                                  {tx.notes}
                                </p>
                              )}
                            </div>

                            <div className={`font-bold ${
                              isIncome || (tx.type === 'transfer' && !isTransferOut)
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-rose-500'
                            }`}>
                              {isIncome || (tx.type === 'transfer' && !isTransferOut) ? '+' : '-'}
                              {formatAmount(tx.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No physical cash transactions logged yet.
          </div>
        )}
      </div>

      {/* Floating Plus button for Cash Book */}
      <button
        onClick={() => openAddModal(cashAccount.id, 'expense')}
        className="fixed bottom-20 right-4 z-20 w-11 h-11 rounded-full bg-indigo-650 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer"
        aria-label="Log Cash Expense"
      >
        <Plus className="w-5 h-5" />
      </button>

    </div>
  );
};
