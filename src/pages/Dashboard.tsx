import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const {
    accounts,
    transactions,
    currency,
    hideBalance,
    setHideBalance,
    openAddModal,
    setActiveTab,
    setSelectedTransaction
  } = useFinanceStore();

  // Get current month dates
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Filter transactions for current month
  const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonthStr));

  // Compute aggregates
  const netBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  const thisMonthIncome = currentMonthTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const thisMonthExpense = currentMonthTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const cashAccount = accounts.find(a => a.type === 'Cash');
  const cashInHand = cashAccount ? cashAccount.currentBalance : 0;

  // Chart 1 Data: Income vs Expense (Current Month)
  const barChartData = [
    {
      name: now.toLocaleString('default', { month: 'short' }),
      Income: thisMonthIncome,
      Expense: thisMonthExpense
    }
  ];

  // Chart 2 Data: Category-wise Expense Breakdown
  const categoryDataMap: { [key: string]: number } = {};
  currentMonthTxs
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const catName = tx.category || 'Other';
      categoryDataMap[catName] = (categoryDataMap[catName] || 0) + tx.amount;
    });

  const pieChartColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];
  const pieChartData = Object.keys(categoryDataMap).map((name, index) => ({
    name,
    value: categoryDataMap[name],
    color: pieChartColors[index % pieChartColors.length]
  })).sort((a, b) => b.value - a.value);

  // Recent 5 Transactions
  const recentTransactions = transactions.slice(0, 5);

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTxClick = (tx: any) => {
    setSelectedTransaction(tx);
    openAddModal(tx.accountId, tx.type);
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Welcome & Blur Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Hello, User
          </h2>
        </div>
        <button
          onClick={() => setHideBalance(!hideBalance)}
          className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shadow-xs cursor-pointer"
          aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
        >
          {hideBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Net Balance Card */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-tr from-indigo-600 via-indigo-650 to-violet-650 dark:from-indigo-950 dark:via-indigo-900 dark:to-violet-950 text-white p-6 shadow-lg shadow-indigo-500/15 dark:shadow-none">
        {/* Glow circles */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-white/10 blur-xl" />
        
        <div className="relative flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
              Total Net Worth
            </span>
            <div className="text-3xl font-extrabold tracking-tight mt-1 flex items-center">
              <span className={`transition duration-200 ${hideBalance ? 'blur-balance' : ''}`}>
                {formatAmount(netBalance)}
              </span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center text-xs font-bold text-white/95">
            <div className="flex space-x-1.5 items-center">
              <div className="p-1 rounded-lg bg-white/10">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span>Cash In Hand: {formatAmount(cashInHand)}</span>
            </div>
            <button
              onClick={() => setActiveTab('accounts')}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 transition cursor-pointer"
            >
              My Accounts
            </button>
          </div>
        </div>
      </div>

      {/* Mini Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Income Card */}
        <button
          onClick={() => setActiveTab('reports')}
          className="glass-panel rounded-2xl p-4 flex flex-col text-left shadow-xs hover:scale-101 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
              Income (Month)
            </span>
            <div className="p-1 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-bold mt-2 text-slate-800 dark:text-slate-100">
            {formatAmount(thisMonthIncome)}
          </span>
        </button>

        {/* Expenses Card */}
        <button
          onClick={() => setActiveTab('reports')}
          className="glass-panel rounded-2xl p-4 flex flex-col text-left shadow-xs hover:scale-101 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide">
              Spend (Month)
            </span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-455">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-bold mt-2 text-slate-800 dark:text-slate-100">
            {formatAmount(thisMonthExpense)}
          </span>
        </button>
      </div>

      {/* Analytics Charts Row */}
      {transactions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income vs Expenses Bar Chart */}
          <div className="glass-panel rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">
                Cash Flow
              </h4>
              <button onClick={() => setActiveTab('reports')} className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer">
                View Reports
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => `${currency}${value}`} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown Pie Chart */}
          {pieChartData.length > 0 && (
            <div className="glass-panel rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  Top Expenses
                </h4>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
                  This Month
                </span>
              </div>
              <div className="h-44 w-full flex items-center justify-between">
                <div className="w-[50%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${currency}${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="w-[50%] flex flex-col space-y-1.5 overflow-y-auto max-h-36 no-scrollbar pr-1">
                  {pieChartData.slice(0, 4).map((entry, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-left">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-650 dark:text-slate-300 truncate">
                          {entry.name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {currency}{entry.value.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {pieChartData.length > 4 && (
                    <span className="text-[8px] text-slate-400 font-semibold text-center italic">
                      +{pieChartData.length - 4} more categories
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Card */
        <div className="glass-panel rounded-3xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700/80">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-750 dark:text-slate-250">
            No Transactions Yet
          </h4>
          <p className="text-xs text-slate-450 dark:text-slate-450 mt-1 max-w-[200px] mx-auto">
            Log your income and expenses to view financial breakdown charts.
          </p>
          <button
            onClick={() => openAddModal()}
            className="mt-4 inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Entry</span>
          </button>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
            Recent Activities
          </h3>
          {transactions.length > 5 && (
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 cursor-pointer"
            >
              <span>See all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentTransactions.length > 0 ? (
          <div className="glass-panel rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/30 overflow-hidden shadow-xs">
            {recentTransactions.map((tx) => {
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
                  <div className="flex items-center space-x-3 min-w-0">
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
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">
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
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            No logged transactions yet.
          </p>
        )}
      </div>

    </div>
  );
};
