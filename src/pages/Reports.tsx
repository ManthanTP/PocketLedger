import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Reports: React.FC = () => {
  const { transactions, accounts, currency, hideBalance } = useFinanceStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // 1. Filter transactions by period
  const filteredTxs = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    const limitDate = new Date();
    
    if (period === 'week') {
      limitDate.setDate(limitDate.getDate() - 7);
    } else if (period === 'month') {
      limitDate.setMonth(limitDate.getMonth() - 1);
    } else if (period === 'year') {
      limitDate.setFullYear(limitDate.getFullYear() - 1);
    }
    
    return txDate >= limitDate;
  });

  // Sort chronological for charts
  const chronologicalTxs = [...filteredTxs].reverse();

  // 2. Compute Summary Row
  const totalIn = filteredTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOut = filteredTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netFlow = totalIn - totalOut;

  // 3. Compute Category Breakdowns for Expenses
  const categorySummary: { [cat: string]: number } = {};
  filteredTxs
    .filter(tx => tx.type === 'expense')
    .forEach((tx) => {
      const cat = tx.category || 'Other';
      categorySummary[cat] = (categorySummary[cat] || 0) + tx.amount;
    });

  const sortedCategories = Object.keys(categorySummary)
    .map((name) => ({
      name,
      amount: categorySummary[name],
    }))
    .sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0].amount : 1;

  // 4. Trend Chart Data (Grouped by date dynamically depending on period)
  const trendDataMap: { [dateStr: string]: { date: string; Income: number; Expense: number } } = {};

  if (period === 'week') {
    // Show last 7 days individually
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendDataMap[dateStr] = {
        date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        Income: 0,
        Expense: 0,
      };
    }
  } else if (period === 'month') {
    // Group into 4 weeks
    for (let i = 3; i >= 0; i--) {
      const label = `Week ${4 - i}`;
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      const key = `w_${i}`;
      trendDataMap[key] = {
        date: label,
        Income: 0,
        Expense: 0,
      };
    }
  } else {
    // Group by month
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendDataMap[key] = {
        date: d.toLocaleString('default', { month: 'short' }),
        Income: 0,
        Expense: 0,
      };
    }
  }

  // Populate data
  chronologicalTxs.forEach((tx) => {
    const txDate = new Date(tx.date);
    let key = '';

    if (period === 'week') {
      key = tx.date;
    } else if (period === 'month') {
      const diffTime = Math.abs(new Date().getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(diffDays / 7));
      key = `w_${weekIndex}`;
    } else {
      key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    }

    if (trendDataMap[key]) {
      if (tx.type === 'income') {
        trendDataMap[key].Income += tx.amount;
      } else if (tx.type === 'expense') {
        trendDataMap[key].Expense += tx.amount;
      }
    }
  });

  const chartData = Object.values(trendDataMap);

  // 5. CSV Export Helper
  const handleExportCSV = () => {
    if (filteredTxs.length === 0) {
      alert("No data available for export.");
      return;
    }

    const headers = ['Transaction ID', 'Date', 'Type', 'Amount', 'Category', 'Account', 'Destination Account', 'Notes'];
    const rows = filteredTxs.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || '';
      const toAcc = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId)?.name || '' : '';
      return [
        tx.id,
        tx.date,
        tx.type,
        tx.amount.toString(),
        tx.category || '',
        acc,
        toAcc,
        tx.notes
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pocket_ledger_${period}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Pocket Ledger
          </span>
          <h1 id="reports-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Reports & Analytics
          </h1>
        </div>
        <button
          id="reports-export-csv-btn"
          onClick={handleExportCSV}
          aria-label="Export report as CSV spreadsheet"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 hover:scale-101 text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </header>

      {/* Period Selector Tabs */}
      <nav aria-label="Period selector" className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            id={`reports-period-${p}`}
            onClick={() => setPeriod(p)}
            aria-current={period === p ? 'page' : undefined}
            className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition cursor-pointer ${
              period === p
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
          </button>
        ))}
      </nav>

      {/* Summary Dashboard Block */}
      <section aria-label="Flow aggregates" className="glass-panel rounded-3xl p-5 shadow-xs grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-700/30">
        <div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Inflow
          </span>
          <span className="text-xs font-extrabold text-green-600 dark:text-green-400 mt-1 block">
            {formatAmount(totalIn)}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Outflow
          </span>
          <span className="text-xs font-extrabold text-rose-500 mt-1 block">
            {formatAmount(totalOut)}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Net Balance
          </span>
          <span className={`text-xs font-extrabold mt-1 block ${netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-500'}`}>
            {formatAmount(netFlow)}
          </span>
        </div>
      </section>

      {/* Area Line Trend Chart */}
      {filteredTxs.length > 0 && (
        <section id="reports-trend-section" aria-labelledby="trend-title" className="glass-panel rounded-3xl p-5 shadow-xs">
          <h2 id="trend-title" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 text-left">
            Inflow vs Outflow Trend
          </h2>
          <div className="h-44 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip formatter={(value) => `${currency}${value}`} />
                <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Expense Category Breakdown Progress Bars */}
      <section id="reports-category-section" aria-labelledby="category-breakdown-title" className="space-y-4">
        <h2 id="category-breakdown-title" className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-left">
          Expense Category Breakdown
        </h2>

        {sortedCategories.length > 0 ? (
          <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4.5">
            {sortedCategories.map((cat, index) => {
              const pct = (cat.amount / maxCategoryAmount) * 100;
              
              return (
                <article key={index} className="space-y-1 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {formatAmount(cat.amount)}
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No expenses logged during this period.
          </div>
        )}
      </section>

    </div>
  );
};
