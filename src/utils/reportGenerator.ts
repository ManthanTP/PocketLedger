import { jsPDF } from 'jspdf';
import type { Account, Transaction } from '../db/db.ts';
import { exportFile } from './nativeFileExport.ts';

export type ReportDatePreset = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all' | 'custom';

export interface AccountReportOptions {
  accountId: string; // 'all' or specific account id
  preset: ReportDatePreset;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  accounts: Account[];
  transactions: Transaction[];
  currency: string;
}

export interface CategoryStat {
  category: string;
  amount: number;
  percentage: number;
}

export interface AccountReportData {
  accountId: string;
  accountName: string;
  accountType?: Account['type'] | 'All Accounts';
  periodLabel: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  closingBalance: number;
  categoryBreakdown: CategoryStat[];
  transactions: Transaction[];
  currency: string;
}

/**
 * Accurately fits text within a given column width in jsPDF by measuring actual rendered width.
 * Appends ellipsis (...) if the text exceeds maxWidth.
 */
export function fitTextToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid) + '...';
    if (doc.getTextWidth(candidate) <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best || text.slice(0, 1);
}

/**
 * Computes date range strings from preset or custom dates
 */
export function computeReportDateRange(preset: ReportDatePreset, customStart?: string, customEnd?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let startDate = '1970-01-01';
  let endDate = formatYMD(now);
  let label = 'All Time';

  if (preset === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startDate = formatYMD(start);
    endDate = formatYMD(end);
    label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  } else if (preset === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = formatYMD(start);
    endDate = formatYMD(end);
    label = start.toLocaleString('default', { month: 'long', year: 'numeric' });
  } else if (preset === 'this-year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    startDate = formatYMD(start);
    endDate = formatYMD(end);
    label = `Year ${now.getFullYear()}`;
  } else if (preset === 'last-year') {
    const lastY = now.getFullYear() - 1;
    const start = new Date(lastY, 0, 1);
    const end = new Date(lastY, 11, 31);
    startDate = formatYMD(start);
    endDate = formatYMD(end);
    label = `Year ${lastY}`;
  } else if (preset === 'custom' && customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
    label = `${customStart} to ${customEnd}`;
  }

  return { startDate, endDate, label };
}

/**
 * Computes all financial metrics, opening/closing balance, categories, and filtered transactions
 */
export function compileAccountReportData(options: AccountReportOptions): AccountReportData {
  const { accountId, preset, customStartDate, customEndDate, accounts, transactions, currency } = options;
  const { startDate, endDate, label: periodLabel } = computeReportDateRange(preset, customStartDate, customEndDate);

  const isAll = accountId === 'all';
  const targetAccount = accounts.find(a => a.id === accountId);
  const accountName = isAll ? 'All Accounts' : (targetAccount?.name || 'Account');
  const accountType = isAll ? 'All Accounts' : targetAccount?.type;

  // 1. Calculate Opening Balance before startDate
  let openingBalance = 0;
  if (isAll) {
    openingBalance = accounts.reduce((acc, a) => acc + (a.openingBalance || 0), 0);
  } else if (targetAccount) {
    openingBalance = targetAccount.openingBalance || 0;
  }

  // Factor in all transactions strictly before startDate
  transactions.forEach(tx => {
    if (tx.date < startDate) {
      if (isAll) {
        if (tx.type === 'income') openingBalance += tx.amount;
        else if (tx.type === 'expense') openingBalance -= tx.amount;
      } else {
        if (tx.accountId === accountId) {
          if (tx.type === 'income') openingBalance += tx.amount;
          else if (tx.type === 'expense') openingBalance -= tx.amount;
          else if (tx.type === 'transfer') openingBalance -= tx.amount; // transfer out
        }
        if (tx.type === 'transfer' && tx.toAccountId === accountId) {
          openingBalance += tx.amount; // transfer in
        }
      }
    }
  });

  // 2. Filter transactions strictly within [startDate, endDate]
  const periodTxs = transactions.filter(tx => {
    if (tx.date < startDate || tx.date > endDate) return false;
    if (isAll) return true;
    return tx.accountId === accountId || (tx.type === 'transfer' && tx.toAccountId === accountId);
  });

  // Sort chronologically (newest first for table, or oldest first)
  const sortedTxs = [...periodTxs].sort((a, b) => b.date.localeCompare(a.date));

  // 3. Compute Totals & Category Breakdown during the period
  let totalIncome = 0;
  let totalExpense = 0;
  const catMap: { [cat: string]: number } = {};

  periodTxs.forEach(tx => {
    if (isAll) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
        const cat = tx.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + tx.amount;
      }
    } else {
      if (tx.accountId === accountId) {
        if (tx.type === 'income') {
          totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
          totalExpense += tx.amount;
          const cat = tx.category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + tx.amount;
        } else if (tx.type === 'transfer') {
          // Transfer out counted in expense/outflow for single account
          totalExpense += tx.amount;
          catMap['Transfer Out'] = (catMap['Transfer Out'] || 0) + tx.amount;
        }
      } else if (tx.type === 'transfer' && tx.toAccountId === accountId) {
        // Transfer into this account
        totalIncome += tx.amount;
        catMap['Transfer In'] = (catMap['Transfer In'] || 0) + tx.amount;
      }
    }
  });

  const categoryBreakdown: CategoryStat[] = Object.entries(catMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const netSavings = totalIncome - totalExpense;
  const closingBalance = openingBalance + netSavings;

  return {
    accountId,
    accountName,
    accountType,
    periodLabel,
    startDate,
    endDate,
    openingBalance,
    totalIncome,
    totalExpense,
    netSavings,
    closingBalance,
    categoryBreakdown,
    transactions: sortedTxs,
    currency,
  };
}

/**
 * Exports complete PDF report with opening/closing balances, KPI boxes, category breakdown,
 * and a styled transactions table with guaranteed text wrapping and boundaries.
 */
export async function exportAccountReportPDF(
  report: AccountReportData,
  accounts: Account[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const safeCurrency = report.currency === '₹' ? 'Rs. ' : `${report.currency} `;
  const formatAmt = (val: number) => `${safeCurrency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const addPageHeaderAndFooter = (pageNumber: number) => {
    // Header Banner
    doc.setFillColor(11, 18, 32); // Deep navy #0B1220
    doc.rect(0, 0, 210, 36, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald #10B981
    doc.text('Pocket-Ledger.pro', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(220, 225, 235);
    doc.text(`Account Statement: ${report.accountName}`, 15, 26);

    doc.setFontSize(8);
    doc.setTextColor(150, 160, 180);
    doc.text(`Type: ${report.accountType || 'Account'} | Period: ${report.periodLabel}`, 15, 32);

    // Right-aligned Metadata
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 205);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 195, 18, { align: 'right' });
    doc.text(`Page ${pageNumber}`, 195, 26, { align: 'right' });

    // Footer
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 284, 210, 13, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text('Private & Confidential • Generated Offline by Pocket-Ledger.pro', 105, 290, { align: 'center' });

    // Subtle creator attribution
    const currentYear = new Date().getFullYear();
    doc.setFontSize(6.5);
    doc.setTextColor(165, 175, 190);
    doc.text(`© ${currentYear} Manthan Patel • Pocket Ledger Pro`, 105, 294.5, { align: 'center' });
  };

  let pageNumber = 1;
  addPageHeaderAndFooter(pageNumber);

  let curY = 46;

  // 1. Balance Summary Card / Metric Boxes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Financial Summary', 15, curY);
  curY += 5;

  const cardWidth = 34;
  const cardHeight = 22;
  const gap = 2.5;
  const startX = 15;

  const cards = [
    { label: 'Opening Balance', val: report.openingBalance, color: [71, 85, 105] },
    { label: 'Total Income', val: report.totalIncome, color: [16, 185, 129] },
    { label: 'Total Expenses', val: report.totalExpense, color: [239, 68, 68] },
    { label: 'Net Change', val: report.netSavings, color: report.netSavings >= 0 ? [16, 185, 129] : [239, 68, 68] },
    { label: 'Closing Balance', val: report.closingBalance, color: [99, 102, 241] },
  ];

  cards.forEach((card, idx) => {
    const x = startX + idx * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, curY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 2, curY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    const formatted = fitTextToWidth(doc, formatAmt(card.val), cardWidth - 4);
    doc.text(formatted, x + 2, curY + 16);
  });

  curY += cardHeight + 8;

  // 2. Top Expense Categories Breakdown (if any expenses exist)
  if (report.categoryBreakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Top Category Breakdown', 15, curY);
    curY += 5;

    const topCats = report.categoryBreakdown.slice(0, 5);
    const catColW = 36;
    topCats.forEach((cat, idx) => {
      const cx = 15 + idx * catColW;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(cx, curY, catColW - 2, 12, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const catTitle = fitTextToWidth(doc, cat.category, catColW - 6);
      doc.text(catTitle, cx + 2, curY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const sub = `${safeCurrency}${cat.amount.toLocaleString('en-IN')} (${cat.percentage.toFixed(0)}%)`;
      doc.text(fitTextToWidth(doc, sub, catColW - 6), cx + 2, curY + 10);
    });

    curY += 18;
  }

  // 3. Transactions Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Transaction History (${report.transactions.length} records)`, 15, curY);
  curY += 5;

  const tableCols = [
    { id: 'date', label: 'Date', width: 24 },
    { id: 'type', label: 'Type', width: 22 },
    { id: 'category', label: 'Category', width: 34 },
    { id: 'account', label: 'Account / Detail', width: 36 },
    { id: 'notes', label: 'Notes', width: 36 },
    { id: 'amount', label: 'Amount', width: 28, align: 'right' as const },
  ];

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let txX = 17;
    tableCols.forEach(c => {
      if (c.align === 'right') {
        doc.text(c.label, txX + c.width - 4, y + 4.8, { align: 'right' });
      } else {
        doc.text(c.label, txX, y + 4.8);
      }
      txX += c.width;
    });
  };

  drawTableHeader(curY);
  curY += 7;

  // 4. Transaction Rows with exact boundary check and word wrapping
  let isAlt = false;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const checkPageBreak = (neededHeight: number = 7) => {
    if (curY + neededHeight > 275) {
      doc.addPage();
      pageNumber++;
      addPageHeaderAndFooter(pageNumber);
      curY = 46;
      drawTableHeader(curY);
      curY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }
  };

  if (report.transactions.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(15, curY, 180, 10, 'F');
    doc.setTextColor(140, 150, 165);
    doc.text('No transactions recorded in this period.', 105, curY + 6.5, { align: 'center' });
    curY += 12;
  } else {
    report.transactions.forEach(tx => {
      checkPageBreak(7);

      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, curY, 180, 6.5, 'F');
      }
      isAlt = !isAlt;

      let colX = 17;

      // Date
      doc.setTextColor(71, 85, 105);
      doc.text(tx.date, colX, curY + 4.5);
      colX += 24;

      // Type with color badge
      if (tx.type === 'income') doc.setTextColor(16, 185, 129);
      else if (tx.type === 'expense') doc.setTextColor(239, 68, 68);
      else doc.setTextColor(99, 102, 241);
      doc.text(tx.type.toUpperCase(), colX, curY + 4.5);
      colX += 22;

      // Category
      doc.setTextColor(51, 65, 85);
      const catStr = fitTextToWidth(doc, tx.category || (tx.type === 'transfer' ? 'Transfer' : 'General'), 32);
      doc.text(catStr, colX, curY + 4.5);
      colX += 34;

      // Account detail
      const acc = accounts.find(a => a.id === tx.accountId);
      const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
      let accDesc = acc?.name || '';
      if (tx.type === 'transfer' && toAcc) {
        accDesc = `${acc?.name || ''} -> ${toAcc.name}`;
      }
      doc.text(fitTextToWidth(doc, accDesc, 34), colX, curY + 4.5);
      colX += 36;

      // Notes (GUARANTEED NO OVERFLOW)
      doc.setTextColor(100, 116, 139);
      const noteStr = fitTextToWidth(doc, tx.notes || '—', 34);
      doc.text(noteStr, colX, curY + 4.5);
      colX += 36;

      // Amount (Right aligned)
      if (tx.type === 'income') doc.setTextColor(16, 185, 129);
      else if (tx.type === 'expense') doc.setTextColor(239, 68, 68);
      else doc.setTextColor(99, 102, 241);

      const sign = tx.type === 'income' ? '+' : (tx.type === 'expense' ? '-' : '');
      const amtStr = fitTextToWidth(doc, `${sign}${safeCurrency}${tx.amount.toLocaleString('en-IN')}`, 26);
      doc.text(amtStr, colX + 28 - 4, curY + 4.5, { align: 'right' });

      curY += 6.5;
    });
  }

  // Save / Share via nativeFileExport
  const safeFilename = `${report.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report_${report.startDate}_to_${report.endDate}.pdf`;
  const dataUri = doc.output('datauristring');

  await exportFile({
    filename: safeFilename,
    data: dataUri,
    mimeType: 'application/pdf',
    isBase64: true,
    dialogTitle: `Share ${report.accountName} Statement`,
  });
}

/**
 * Exports complete CSV report with metadata, balances, and line items
 */
export async function exportAccountReportCSV(
  report: AccountReportData,
  accounts: Account[]
): Promise<void> {
  const lines: string[] = [];

  lines.push(`"Pocket-Ledger.pro - Account Statement"`);
  lines.push(`"Account","${report.accountName}"`);
  lines.push(`"Period","${report.periodLabel} (${report.startDate} to ${report.endDate})"`);
  lines.push(`"Generated","${new Date().toLocaleString()}"`);
  lines.push('');
  lines.push(`"Summary Metrics"`);
  lines.push(`"Opening Balance","${report.openingBalance.toFixed(2)}"`);
  lines.push(`"Total Income","${report.totalIncome.toFixed(2)}"`);
  lines.push(`"Total Expense","${report.totalExpense.toFixed(2)}"`);
  lines.push(`"Net Change","${report.netSavings.toFixed(2)}"`);
  lines.push(`"Closing Balance","${report.closingBalance.toFixed(2)}"`);
  lines.push('');

  if (report.categoryBreakdown.length > 0) {
    lines.push(`"Category Breakdown"`);
    lines.push(`"Category","Amount","Percentage"`);
    report.categoryBreakdown.forEach(cat => {
      lines.push(`"${cat.category}","${cat.amount.toFixed(2)}","${cat.percentage.toFixed(1)}%"`);
    });
    lines.push('');
  }

  lines.push(`"Transaction History"`);
  lines.push(`"Date","Type","Category","From Account","To Account","Amount","Notes"`);

  report.transactions.forEach(tx => {
    const fromAcc = accounts.find(a => a.id === tx.accountId)?.name || '';
    const toAcc = tx.toAccountId ? (accounts.find(a => a.id === tx.toAccountId)?.name || '') : '';
    const safeNotes = (tx.notes || '').replace(/"/g, '""');
    lines.push(
      `"${tx.date}","${tx.type}","${tx.category || ''}","${fromAcc}","${toAcc}","${tx.amount.toFixed(2)}","${safeNotes}"`
    );
  });

  const csvContent = lines.join('\r\n');
  const safeFilename = `${report.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report_${report.startDate}_to_${report.endDate}.csv`;

  await exportFile({
    filename: safeFilename,
    data: csvContent,
    mimeType: 'text/csv;charset=utf-8;',
    dialogTitle: `Export ${report.accountName} CSV`,
  });
}
