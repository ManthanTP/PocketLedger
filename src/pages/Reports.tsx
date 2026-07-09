import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { BannerRenderer } from '../components/NotificationManager';
import { Download, FileText, Calendar, Check, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import { AppIconFull } from '../components/AppIcon';

export const Reports: React.FC = () => {
  const { transactions, accounts, currency, hideBalance, budgets } = useFinanceStore();
  const { showToast } = useNotificationStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // 1. Loading Skeleton state
  const [loading, setLoading] = useState(true);

  // Custom Export States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [exportColumns, setExportColumns] = useState({
    date: true,
    category: true,
    account: true,
    type: true,
    amount: true,
    notes: true
  });

  const exportFilteredTxs = transactions.filter((tx) => {
    return tx.date >= exportStartDate && tx.date <= exportEndDate;
  });

  // Trigger loading skeleton on period change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [period]);

  // 2. Filter transactions by period
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

  // 3. Compute Summary Row
  const totalIn = filteredTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOut = filteredTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netFlow = totalIn - totalOut;

  // 4. Compute Category Breakdowns for Expenses
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

  // 5. Trend Chart Data (Grouped by date dynamically depending on period)
  const trendDataMap: { [dateStr: string]: { date: string; Income: number; Expense: number } } = {};

  if (period === 'week') {
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

  // 6. CSV Export Helper
  const handleExportCSV = () => {
    if (exportFilteredTxs.length === 0) {
      showToast("No transactions found in this date range.", "error");
      return;
    }

    const activeCols = [
      { id: 'date', label: 'Date' },
      { id: 'category', label: 'Category' },
      { id: 'account', label: 'Account' },
      { id: 'type', label: 'Type' },
      { id: 'amount', label: 'Amount' },
      { id: 'notes', label: 'Notes' },
    ].filter(col => exportColumns[col.id as keyof typeof exportColumns]);

    if (activeCols.length === 0) {
      showToast("Please select at least one column to export.", "error");
      return;
    }

    const headers = activeCols.map(c => c.label);
    const rows = exportFilteredTxs.map((tx) => {
      const row: string[] = [];
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || '';
      if (exportColumns.date) row.push(tx.date);
      if (exportColumns.category) row.push(tx.category || (tx.type === 'transfer' ? 'Transfer' : 'Other'));
      if (exportColumns.account) row.push(acc);
      if (exportColumns.type) row.push(tx.type.toUpperCase());
      if (exportColumns.amount) row.push(tx.amount.toString());
      if (exportColumns.notes) row.push(tx.notes || '');
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pocket_ledger_custom_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
    showToast("CSV report downloaded", "success");
  };

  // 7. jsPDF Exporter helper
  const handleExportPDF = () => {
    if (exportFilteredTxs.length === 0) {
      showToast("No transactions found in this date range.", "error");
      return;
    }

    const activeCols = [
      { id: 'date', label: 'Date', weight: 25 },
      { id: 'category', label: 'Category', weight: 30 },
      { id: 'account', label: 'Account', weight: 30 },
      { id: 'type', label: 'Type', weight: 20 },
      { id: 'amount', label: 'Amount', weight: 30 },
      { id: 'notes', label: 'Notes', weight: 45 },
    ].filter(col => exportColumns[col.id as keyof typeof exportColumns]);

    if (activeCols.length === 0) {
      showToast("Please select at least one column to export.", "error");
      return;
    }

    const totalWeight = activeCols.reduce((sum, c) => sum + c.weight, 0);
    let currentX = 15;
    const cols = activeCols.map(col => {
      const width = (col.weight / totalWeight) * 180;
      const x = currentX;
      currentX += width;
      return { ...col, x, width };
    });

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(11, 18, 32);
    doc.text('Pocket Ledger', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Custom Financial Summary Report', 15, 26);
    doc.text(`Range: ${exportStartDate} to ${exportEndDate} · Generated on ${new Date().toLocaleDateString()}`, 15, 31);

    let totalIn = 0;
    let totalOut = 0;
    exportFilteredTxs.forEach(tx => {
      if (tx.type === 'income') totalIn += tx.amount;
      else if (tx.type === 'expense') totalOut += tx.amount;
    });
    const netFlow = totalIn - totalOut;

    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 36, 180, 28, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 18, 32);
    doc.text('Aggregated Flow Summary:', 20, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Inflows:    ${currency}${totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 49);
    doc.text(`Total Outflows:   ${currency}${totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 54);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Balance:      ${currency}${netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, 59);

    doc.setDrawColor(11, 18, 32);
    doc.line(15, 72, 195, 72);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    cols.forEach(col => {
      doc.text(col.label, col.x + 2, 77);
    });

    doc.line(15, 81, 195, 81);

    doc.setFont('helvetica', 'normal');
    let y = 87;

    exportFilteredTxs.slice(0, 50).forEach((tx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFont('helvetica', 'bold');
        cols.forEach(col => {
          doc.text(col.label, col.x + 2, y);
        });
        doc.line(15, y + 4, 195, y + 4);
        y += 10;
        doc.setFont('helvetica', 'normal');
      }

      const accountName = accounts.find((a) => a.id === tx.accountId)?.name || '';

      cols.forEach(col => {
        let text = '';
        if (col.id === 'date') text = tx.date;
        else if (col.id === 'category') text = tx.category || (tx.type === 'transfer' ? 'Transfer' : 'Other');
        else if (col.id === 'account') text = accountName;
        else if (col.id === 'type') text = tx.type.toUpperCase();
        else if (col.id === 'amount') text = `${currency}${tx.amount.toLocaleString('en-IN')}`;
        else if (col.id === 'notes') text = tx.notes || '';

        const maxChars = Math.floor(col.width * 2.1);
        if (text.length > maxChars) {
          text = text.substring(0, maxChars - 3) + '...';
        }
        doc.text(text, col.x + 2, y);
      });

      y += 8;
    });

    if (exportFilteredTxs.length > 50) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`... and ${exportFilteredTxs.length - 50} other records. Check in-app ledger.`, 17, y);
    }

    doc.save(`pocket_ledger_custom_report.pdf`);
    setIsExportOpen(false);
    showToast("PDF report exported successfully", "success");
  };

  const openPdfExport = () => {
    setExportFormat('pdf');
    setIsExportOpen(true);
  };

  const openCsvExport = () => {
    setExportFormat('csv');
    setIsExportOpen(true);
  };

  const formatAmount = (val: number) => {
    if (hideBalance) return '••••••';
    return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 transition-all duration-300">
      
      {/* Header */}
      <header className="flex justify-between items-center text-left">
        <div className="flex items-center space-x-2.5">
          <AppIconFull size={36} className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-text-subtle uppercase tracking-wide">
              Pocket Ledger
            </span>
            <h1 id="reports-title" className="text-2xl font-bold text-text-primary font-display mt-0.5">
              Reports & Analytics
            </h1>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* Export PDF */}
          <button
            id="reports-export-pdf-btn"
            onClick={openPdfExport}
            aria-label="Export report as PDF document"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-bg-surface border border-border-custom text-text-secondary hover:text-accent-green shadow-xs cursor-pointer transition-colors"
          >
            <FileText className="w-5 h-5" />
          </button>
          
          {/* Export CSV */}
          <button
            id="reports-export-csv-btn"
            onClick={openCsvExport}
            aria-label="Export report as CSV spreadsheet"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-bg-surface border border-border-custom text-text-secondary hover:text-accent-green shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Persistent Warning Banner Alert */}
      <BannerRenderer id="reports-budget-alert" />

      {/* Period Selector Tabs */}
      <nav aria-label="Period selector" className="flex p-1 bg-bg-surface border border-border-custom rounded-2xl">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            id={`reports-period-${p}`}
            onClick={() => setPeriod(p)}
            aria-current={period === p ? 'page' : undefined}
            className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition cursor-pointer ${
              period === p
                ? 'bg-bg-elevated text-accent-green shadow-sm border border-white/5'
                : 'text-text-subtle hover:text-text-secondary'
            }`}
          >
            {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
          </button>
        ))}
      </nav>

      {loading ? (
        // Skeleton Loaders
        <div className="space-y-6">
          <div className="h-[76px] w-full bg-bg-surface border border-border-custom rounded-3xl skeleton-shimmer" />
          <div className="h-[216px] w-full bg-bg-surface border border-border-custom rounded-3xl skeleton-shimmer" />
          <div className="h-[180px] w-full bg-bg-surface border border-border-custom rounded-3xl skeleton-shimmer" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Dashboard Block */}
          <section aria-label="Flow aggregates" className="glass-panel rounded-3xl p-5 shadow-xs grid grid-cols-3 gap-2 text-center divide-x divide-border-custom">
            <div>
              <span className="text-[9px] font-bold text-text-subtle uppercase tracking-wider block">
                Total Inflow
              </span>
              <span className="text-xs font-extrabold text-accent-green-light mt-1 block">
                {formatAmount(totalIn)}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-text-subtle uppercase tracking-wider block">
                Total Outflow
              </span>
              <span className="text-xs font-extrabold text-accent-red mt-1 block">
                {formatAmount(totalOut)}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-text-subtle uppercase tracking-wider block">
                Net Balance
              </span>
              <span className={`text-xs font-extrabold mt-1 block ${netFlow >= 0 ? 'text-accent-green-light' : 'text-accent-red'}`}>
                {formatAmount(netFlow)}
              </span>
            </div>
          </section>

          {/* Area Line Trend Chart */}
          {filteredTxs.length > 0 && (
            <section id="reports-trend-section" aria-labelledby="trend-title" className="glass-panel rounded-3xl p-5 shadow-xs">
              <h2 id="trend-title" className="text-xs font-bold text-text-secondary mb-3 text-left">
                Inflow vs Outflow Trend
              </h2>
              <div className="h-44 w-full text-text-subtle" aria-hidden="true">
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
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                    <Tooltip formatter={(value) => `${currency}${value}`} />
                    <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} isAnimationActive={true} animationDuration={500} />
                    <Area type="monotone" dataKey="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} isAnimationActive={true} animationDuration={500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Expense Category Breakdown Progress Bars */}
          <section id="reports-category-section" aria-labelledby="category-breakdown-title" className="space-y-4">
            <h2 id="category-breakdown-title" className="text-xs font-bold text-text-secondary uppercase tracking-wider text-left">
              Expense Category Breakdown
            </h2>

            {sortedCategories.length > 0 ? (
              <div className="glass-panel rounded-3xl p-5 shadow-xs space-y-4.5">
                {sortedCategories.map((cat, index) => {
                  const limit = budgets[cat.name] || 0;
                  const isBudgetSet = limit > 0;
                  const pct = isBudgetSet ? Math.min(100, (cat.amount / limit) * 100) : (cat.amount / maxCategoryAmount) * 100;
                  const isOverBudget = isBudgetSet && cat.amount > limit;
                  
                  return (
                    <article key={index} className="space-y-1 text-left">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-text-secondary">
                          {cat.name}
                        </span>
                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className="text-text-primary">
                            {formatAmount(cat.amount)}
                          </span>
                          {isBudgetSet && (
                            <span className="text-[10px] text-text-subtle">
                              / {formatAmount(limit)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Progress Line */}
                      <div className="w-full h-2.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverBudget
                              ? 'bg-accent-red shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              : 'bg-gradient-to-r from-accent-green-light to-accent-green'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-8 text-center text-text-subtle text-xs">
                No expenses logged during this period.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Custom Export Bottom Sheet / Modal */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <div 
            className="w-full max-w-lg bg-bg-surface border-t border-border-custom rounded-t-[32px] p-6 space-y-6 glass-modal animate-slide-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-panel-title"
          >
            {/* Drag Handle Decoration */}
            <div className="mx-auto w-12 h-1 bg-white/20 rounded-full" aria-hidden="true" />

            <div className="flex justify-between items-center">
              <div className="text-left">
                <h2 id="export-panel-title" className="text-base font-bold text-text-primary font-display">
                  Configure Custom Export
                </h2>
                <p className="text-[10px] text-text-subtle uppercase tracking-widest font-bold mt-0.5">
                  Format: {exportFormat.toUpperCase()}
                </p>
              </div>
              <button
                id="export-panel-close-btn"
                onClick={() => setIsExportOpen(false)}
                aria-label="Close export customizer"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-white/5 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date range picker */}
              <div className="space-y-2 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-body flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-accent-green" />
                  <span>Custom Date Range</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="export-start-date" className="text-[10px] text-text-subtle font-semibold">Start Date</label>
                    <input
                      id="export-start-date"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="export-end-date" className="text-[10px] text-text-subtle font-semibold">End Date</label>
                    <input
                      id="export-end-date"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-border-custom bg-bg-base text-text-primary text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Column checkboxes */}
              <div className="space-y-2 text-left">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-body">
                  Columns to Include
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(exportColumns) as Array<keyof typeof exportColumns>).map((col) => {
                    const active = exportColumns[col];
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setExportColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                        className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition flex items-center justify-between cursor-pointer ${
                          active
                            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green-light'
                            : 'bg-bg-base border-border-custom text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span>{col}</span>
                        {active && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transactions count preview */}
              <div className="p-3 bg-white/5 border border-border-custom rounded-xl flex justify-between items-center text-xs">
                <span className="text-text-secondary">Matching Records</span>
                <span className="font-extrabold text-text-primary">
                  {exportFilteredTxs.length} {exportFilteredTxs.length === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>
            </div>

            <button
              onClick={exportFormat === 'pdf' ? handleExportPDF : handleExportCSV}
              className="w-full py-3 bg-accent-green hover:bg-accent-green/90 text-bg-base font-bold rounded-xl text-xs shadow-md transition duration-150 cursor-pointer text-center"
            >
              Generate & Download {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
