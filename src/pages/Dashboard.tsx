import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft, ArrowRight, Layers, Bell, Sparkles, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction } from '../db/db';
import { AppIconFull } from '../components/AppIcon';

export const Dashboard: React.FC = () => {
  const {
    accounts,
    transactions,
    currency,
    hideBalance,
    setHideBalance,
    openAddModal,
    setActiveTab,
    setSelectedTransaction,
    budgets,
    reminders,
    goals
  } = useFinanceStore();

  const { triggerAndroidNotification, showToast } = useNotificationStore();

  // 1. Loading & Skeleton state
  const [loading, setLoading] = useState(true);

  // 2. Pulse state on balance change
  const [pulseBalance, setPulseBalance] = useState(false);
  const netBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

  // Trigger pulse animation when net worth changes
  useEffect(() => {
    if (netBalance !== 0) {
      setPulseBalance(true);
      const timer = setTimeout(() => setPulseBalance(false), 150);
      return () => clearTimeout(timer);
    }
  }, [netBalance]);

  // 3. Pull to Refresh State
  const [startY, setStartY] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !refreshing) {
      setStartY(e.touches[0].clientY);
      setPullY(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      // Pulling down
      setPullY(Math.min(100, diff * 0.4));
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 60) {
      setRefreshing(true);
      setPullY(60);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
        setStartY(0);
        setLoading(true);
        setTimeout(() => setLoading(false), 550);
        showToast('Ledger balance re-synchronized', 'success');
      }, 1000);
    } else {
      setPullY(0);
      setStartY(0);
    }
  };

  // Get current month dates
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Filter transactions for current month
  const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonthStr));

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

  const pieChartColors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6', '#EC4899'];
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

  const handleTxClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    openAddModal(tx.accountId, tx.type);
  };

  const getGreeting = () => {
    const hours = now.getHours();
    if (hours < 12) return 'Good morning, User';
    if (hours < 17) return 'Good afternoon, User';
    return 'Good evening, User';
  };

  const [notificationIndex, setNotificationIndex] = useState(0);

  const handleTriggerSimulatedNotification = () => {
    const list = reminders.length > 0
      ? reminders.map((rem) => ({
          id: rem.id + '-' + Date.now(),
          title: rem.title,
          body: `${currency}${rem.amount.toLocaleString('en-IN')} · ${rem.body}`,
          channel: rem.channel,
          actions: rem.channel === 'Bill Reminders' ? [
            { label: 'Mark Paid', isPrimary: true, actionId: 'mark-paid' },
            { label: 'Snooze', actionId: 'snooze' }
          ] : [
            { label: 'Snooze', actionId: 'snooze' }
          ]
        }))
      : [
          {
            id: 'bill-elec-' + Date.now(),
            title: 'Electricity bill due tomorrow',
            body: '₹1,240 · usually paid from Cash',
            channel: 'Bill Reminders' as const,
            actions: [
              { label: 'Mark Paid', isPrimary: true, actionId: 'mark-paid' },
              { label: 'Snooze', actionId: 'snooze' }
            ]
          },
          {
            id: 'loan-car-' + Date.now(),
            title: 'Car Loan repayment overdue',
            body: '₹12,500 · due 2 days ago',
            channel: 'Loan Repayments' as const,
            actions: [
              { label: 'Pay Now', isPrimary: true, actionId: 'snooze' },
              { label: 'Remind Me', actionId: 'snooze' }
            ]
          },
          {
            id: 'budget-ent-' + Date.now(),
            title: 'Entertainment Budget Exceeded 90%',
            body: '₹4,500 / ₹5,000 spent this month',
            channel: 'Budget Alerts' as const,
            actions: [
              { label: 'View Budgets', isPrimary: true, actionId: 'snooze' }
            ]
          },
          {
            id: 'backup-overdue-' + Date.now(),
            title: 'Database backup overdue',
            body: 'Last backup was created 7 days ago',
            channel: 'Backup Reminders' as const,
            actions: [
              { label: 'Backup Now', isPrimary: true, actionId: 'snooze' }
            ]
          }
        ];

    const currentNotification = list[notificationIndex % list.length];
    triggerAndroidNotification(currentNotification);
    showToast(`Triggered ${currentNotification.channel} simulated push`, 'info');
    setNotificationIndex((prev) => (prev + 1) % list.length);
  };

  // RENDER SKELETON SCREEN
  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2 text-left">
            <div className="h-3 w-24 bg-bg-elevated rounded-full skeleton-shimmer" />
            <div className="h-6 w-36 bg-bg-elevated rounded-full skeleton-shimmer" />
          </div>
          <div className="h-10 w-10 bg-bg-elevated rounded-2xl skeleton-shimmer" />
        </div>

        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-2 text-left">
              <div className="h-2.5 w-16 bg-bg-elevated rounded-full skeleton-shimmer" />
              <div className="h-7 w-28 bg-bg-elevated rounded-full skeleton-shimmer" />
            </div>
            <div className="h-5 w-20 bg-bg-elevated rounded-full skeleton-shimmer" />
          </div>
          <div className="col-span-1 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between skeleton-shimmer" />
          <div className="col-span-1 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between skeleton-shimmer" />
          <div className="col-span-1 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between skeleton-shimmer" />
          <div className="col-span-1 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between skeleton-shimmer" />
          <div className="col-span-2 h-[140px] bg-bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-To-Refresh Indicator */}
      {pullY > 0 && (
        <div 
          className="absolute left-0 right-0 z-40 flex items-center justify-center transition-all duration-100"
          style={{ 
            top: `${Math.min(30, pullY * 0.5)}px`,
            opacity: pullY / 60
          }}
        >
          <div className={`p-2 rounded-full bg-bg-elevated border border-border-custom shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
            <svg 
              className="w-5 h-5 text-accent-green" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
              style={{
                transform: refreshing ? 'none' : `rotate(${pullY * 4}deg)`
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </div>
      )}

      {/* Welcome & Tools */}
      <header className="flex justify-between items-center">
        <div className="flex items-center space-x-2.5 text-left">
          <AppIconFull size={36} className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-text-subtle uppercase tracking-wide">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <h1 id="dashboard-title" className="text-2xl font-bold text-text-primary font-display mt-0.5">
              {getGreeting()}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Simulated Push Notification Tester */}
          <button
            id="dashboard-trigger-sim-btn"
            onClick={handleTriggerSimulatedNotification}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-bg-surface border border-border-custom text-text-secondary hover:text-accent-green shadow-xs cursor-pointer transition-colors duration-150"
            aria-label="Test Simulated Android Push Notification"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          <button
            id="dashboard-balance-visibility-btn"
            onClick={() => setHideBalance(!hideBalance)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-bg-surface border border-border-custom text-text-secondary hover:text-text-primary shadow-xs cursor-pointer transition-colors duration-150"
            aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
          >
            {hideBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 4-Column Bento Grid Financial Overview Layout */}
      <section aria-label="Financial Overview" className="grid grid-cols-4 gap-4 auto-rows-[140px]">
        
        {/* Card 1: Net Balance Card - Bento Large (2x1) */}
        <div 
          id="dashboard-worth-card" 
          className={`col-span-2 row-span-1 bento-card-elevated flex flex-col justify-between p-5 relative overflow-hidden transition-transform duration-150 ${
            pulseBalance ? 'animate-scale-pulse' : ''
          }`}
        >
          {/* Subtle Radial Aurora Orbs inside hero balance card */}
          <div className="aurora-glow-orb -top-20 -left-20 bg-[#34D399] opacity-[0.06]" aria-hidden="true" />
          <div className="aurora-glow-orb -bottom-20 -right-20 bg-[#8B5CF6] opacity-[0.06]" aria-hidden="true" />
          
          <div className="relative z-10 flex flex-col justify-between h-full text-left">
            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body">
                Total Net Worth
              </span>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                <span className={`net-balance-text transition duration-200 ${hideBalance ? 'blur-balance' : ''}`}>
                  {formatAmount(netBalance)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs font-bold text-text-primary">
              <span className="text-[10px] text-text-subtle font-normal">Indexed Locally</span>
              <button
                onClick={() => setActiveTab('accounts')}
                className="px-3 py-1.5 min-h-[32px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-text-primary transition cursor-pointer text-[10px]"
              >
                Accounts
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Income Card - Bento Small (1x1) */}
        <button
          id="dashboard-income-card"
          onClick={() => setActiveTab('reports')}
          className="col-span-1 row-span-1 bento-card flex flex-col justify-between text-left cursor-pointer transition-all duration-200"
          aria-label={`Current month income ${formatAmount(thisMonthIncome)}. View Reports`}
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wide font-body">
              Income
            </span>
            <div className="p-1 rounded-lg bg-accent-green/10 text-accent-green-light" aria-hidden="true">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight truncate leading-none">
            {formatAmount(thisMonthIncome)}
          </span>
        </button>

        {/* Card 3: Expenses Card - Bento Small (1x1) */}
        <button
          id="dashboard-spend-card"
          onClick={() => setActiveTab('reports')}
          className="col-span-1 row-span-1 bento-card flex flex-col justify-between text-left cursor-pointer transition-all duration-200"
          aria-label={`Current month spend ${formatAmount(thisMonthExpense)}. View Reports`}
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wide font-body">
              Spend
            </span>
            <div className="p-1 rounded-lg bg-accent-red/10 text-accent-red" aria-hidden="true">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight truncate leading-none">
            {formatAmount(thisMonthExpense)}
          </span>
        </button>

        {/* Card 4: Cash in Hand Card - Bento Small (1x1) */}
        <button
          id="dashboard-cash-card"
          onClick={() => setActiveTab('accounts')}
          className="col-span-1 row-span-1 bento-card flex flex-col justify-between text-left cursor-pointer transition-all duration-200"
          aria-label={`Cash in hand ${formatAmount(cashInHand)}. View Accounts`}
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wide font-body">
              Cash
            </span>
            <div className="p-1 rounded-lg bg-accent-amber/10 text-accent-amber" aria-hidden="true">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight truncate leading-none">
            {formatAmount(cashInHand)}
          </span>
        </button>

        {/* Card 5: Active Wallets Card - Bento Small (1x1) */}
        <button
          id="dashboard-accounts-card"
          onClick={() => setActiveTab('accounts')}
          className="col-span-1 row-span-1 bento-card flex flex-col justify-between text-left cursor-pointer transition-all duration-200"
          aria-label={`Manage your ${accounts.length} active financial accounts.`}
        >
          <div className="flex justify-between items-start w-full">
            <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wide font-body">
              Wallets
            </span>
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400" aria-hidden="true">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight leading-none">
            {accounts.length}
          </span>
        </button>

        {/* Card 6: Income vs Expense Chart - Bento Wide (2x1) */}
        <div className="col-span-2 row-span-1 bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-1 text-left">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body">
              Cash Flow Trend
            </span>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-[10px] font-bold text-accent-green-light hover:underline cursor-pointer"
            >
              Reports
            </button>
          </div>
          <div className="h-24 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                <Tooltip formatter={(value) => `${currency}${value}`} />
                <Bar dataKey="Income" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={500} />
                <Bar dataKey="Expense" fill="#EF4444" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 7: Category Pie Chart - Bento Wide (2x1) */}
        <div className="col-span-2 row-span-1 bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-1 text-left">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body">
              Expenses Breakdown
            </span>
            <span className="text-[9px] text-text-subtle font-semibold">
              This Month
            </span>
          </div>

          {pieChartData.length > 0 ? (
            <div className="h-24 w-full flex items-center justify-between">
              <div className="w-[45%] h-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={18}
                      outerRadius={32}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={500}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${currency}${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="w-[55%] flex flex-col space-y-1 overflow-y-auto max-h-[84px] no-scrollbar text-left pr-1">
                {pieChartData.slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-text-secondary font-medium truncate max-w-[50px]">{entry.name}</span>
                    </div>
                    <span className="text-text-primary font-bold">{currency}{entry.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-[10px] text-text-subtle">
              No expenses logged
            </div>
          )}
        </div>

        {/* Card 7.5: Budgets Health Card - Bento Wide (2x1) */}
        <div className="col-span-2 row-span-1 bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-1 text-left">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body">
              Active Budgets
            </span>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-[10px] font-bold text-accent-green-light hover:underline cursor-pointer"
            >
              Configure
            </button>
          </div>

          {/* List of active budgets or fallback */}
          {Object.keys(budgets).some(key => budgets[key] > 0) ? (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pt-1 text-left">
              {Object.keys(budgets)
                .filter((catName) => budgets[catName] > 0)
                .slice(0, 2)
                .map((catName) => {
                  const limit = budgets[catName];
                  const spent = categoryDataMap[catName] || 0;
                  const pct = Math.min(100, (spent / limit) * 100);
                  const isOver = spent > limit;
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-text-secondary">{catName}</span>
                        <span className="font-bold text-text-primary">
                          {formatAmount(spent)} / <span className="text-text-subtle">{formatAmount(limit)}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-accent-red' : pct > 90 ? 'bg-accent-amber' : 'bg-accent-green'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-24 flex flex-col items-center justify-center text-center space-y-1.5">
              <p className="text-[10px] text-text-subtle font-medium leading-tight">
                No monthly budgets set. Plan your spending limits in Settings.
              </p>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-text-primary font-bold text-[9px] rounded-lg cursor-pointer transition-colors duration-150"
              >
                Set Budgets
              </button>
            </div>
          )}
        </div>

        {/* Card 7.6: Savings Targets - Bento Wide (2x1) */}
        <div className="col-span-2 row-span-1 bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-1 text-left">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-accent-green" aria-hidden="true" />
              <span>Savings Targets</span>
            </span>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-[10px] font-bold text-accent-green-light hover:underline cursor-pointer"
            >
              Configure
            </button>
          </div>

          {goals.length > 0 ? (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pt-1 text-left">
              {goals.slice(0, 2).map((goal) => {
                const pct = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));
                return (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-text-secondary">{goal.title}</span>
                      <span className="font-bold text-text-primary">
                        {pct}% ({currency}{goal.currentSaved.toLocaleString('en-IN')} / {currency}{goal.targetAmount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-accent-green-light to-accent-green"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex flex-col items-center justify-center text-center space-y-1.5">
              <p className="text-[10px] text-text-subtle font-medium leading-tight">
                No savings goals tracked yet. Plan targets in Settings.
              </p>
            </div>
          )}
        </div>

        {/* Card 7.7: Smart Insights - Bento Wide (2x1) */}
        <div className="col-span-2 row-span-1 bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-1 text-left">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-body flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-violet" aria-hidden="true" />
              <span>Smart Insights</span>
            </span>
            <span className="text-[9px] text-text-subtle font-semibold">AI Analytics</span>
          </div>

          <div className="flex-1 flex flex-col justify-center text-left py-1">
            {thisMonthIncome > 0 ? (
              (() => {
                const savingsRate = Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100);
                if (savingsRate > 20) {
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-primary font-bold">Excellent Savings Rate!</p>
                      <p className="text-[9px] text-text-subtle leading-normal font-body">
                        You saved <span className="text-accent-green-light font-bold">{savingsRate}%</span> of your income this month. Keep building your wealth!
                      </p>
                    </div>
                  );
                } else if (savingsRate >= 0) {
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-primary font-bold">Stable Budget Balance</p>
                      <p className="text-[9px] text-text-subtle leading-normal font-body">
                        Your savings rate is <span className="text-accent-amber font-bold">{savingsRate}%</span>. Consider cutting variable expenses to save more.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] text-accent-red font-bold">Deficit Alert</p>
                      <p className="text-[9px] text-text-subtle leading-normal font-body">
                        Outflows exceed inflows by <span className="text-accent-red font-bold">{Math.abs(savingsRate)}%</span>. Check category limits.
                      </p>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] text-text-primary font-bold">Awaiting Inflows</p>
                <p className="text-[9px] text-text-subtle leading-normal font-body">
                  Log your first monthly income transactions to unlock savings rate analysis and automated tips.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 8: Recent Activities List - Bento Extra Large (4x2, full width) */}
        <div className="col-span-4 row-span-2 bento-card flex flex-col justify-between p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-body">
              Recent Activities
            </h2>
            {transactions.length > 5 && (
              <button
                onClick={() => setActiveTab('transactions')}
                className="min-h-[32px] flex items-center text-xs font-bold text-accent-green-light hover:underline space-x-0.5 cursor-pointer"
              >
                <span>See all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, idx) => {
                const account = accounts.find(a => a.id === tx.accountId);
                const toAccount = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
                const isIncome = tx.type === 'income';
                const isExpense = tx.type === 'expense';
                const isTransfer = tx.type === 'transfer';

                return (
                  <article
                    key={tx.id}
                    onClick={() => handleTxClick(tx)}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="card-entrance flex items-center justify-between p-3 bg-bg-elevated border border-border-custom rounded-xl hover:bg-white/5 active:scale-99 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                        <h3 className="text-xs font-bold text-text-primary truncate">
                          {isTransfer ? 'Transfer' : tx.category}
                        </h3>
                        <p className="text-[9px] text-text-subtle mt-0.5 truncate max-w-[150px]">
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
                          ? 'text-accent-green-light'
                          : isExpense
                          ? 'text-accent-red'
                          : 'text-text-primary'
                      }`}>
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatAmount(tx.amount)}
                      </p>
                      <span className="text-[8px] text-text-subtle block mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-6 text-center text-text-subtle">
                <Wallet className="w-8 h-8 text-text-subtle opacity-50 mb-2" />
                <p className="text-xs font-bold">No transactions yet</p>
                <button
                  onClick={() => openAddModal()}
                  className="mt-2 text-[10px] font-bold text-accent-green-light hover:underline"
                >
                  Tap + to log your first transaction
                </button>
              </div>
            )}
          </div>
        </div>

      </section>

    </div>
  );
};
