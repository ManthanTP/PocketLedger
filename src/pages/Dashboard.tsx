import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft, ArrowRight, Bell, Sparkles, Target, AlertCircle } from 'lucide-react';
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
    setSettingsActivePanel,
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

  const [activeChart, setActiveChart] = useState<'flow' | 'category'>('flow');

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

  // Check if any budget category has spent >= 90%
  const budgetAlerts = Object.keys(budgets)
    .filter((cat) => budgets[cat] > 0)
    .map((cat) => {
      const limit = budgets[cat];
      const spent = categoryDataMap[cat] || 0;
      const pct = Math.round((spent / limit) * 100);
      return { cat, spent, limit, pct };
    })
    .filter((item) => item.pct >= 90)
    .sort((a, b) => b.pct - a.pct);

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
    if (reminders.length === 0) {
      showToast('No active notification reminders configured. Set them up in Settings.', 'info');
      return;
    }

    const list = reminders.map((rem) => ({
      id: rem.id + '-' + Date.now(),
      title: rem.title,
      body: `${currency}${rem.amount.toLocaleString('en-IN')} · ${rem.body}`,
      channel: rem.channel,
      amount: rem.amount,
      category: rem.category,
      actions: rem.channel === 'Bill Reminders' ? [
        { label: 'Mark Paid', isPrimary: true, actionId: 'mark-paid' },
        { label: 'Snooze', actionId: 'snooze' }
      ] : [
        { label: 'Snooze', actionId: 'snooze' }
      ]
    }));

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
      className="pb-24 pt-6 px-4 max-w-lg mx-auto space-y-6 relative touch-pan-y"
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

      {/* Spacious Bento Grid Financial Overview Layout */}
      <section aria-label="Financial Overview" className="grid grid-cols-4 gap-4">
        
        {/* Card 1: Net Balance Card - Bento Hero (4x1) */}
        <div 
          id="dashboard-worth-card" 
          className={`col-span-4 h-[160px] bento-card-elevated flex flex-col justify-between p-5 relative overflow-hidden transition-all duration-150 ${
            pulseBalance ? 'animate-scale-pulse' : ''
          }`}
        >
          {/* Subtle Radial Aurora Orbs inside hero balance card */}
          <div className="aurora-glow-orb -top-20 -left-20 bg-[#34D399] opacity-[0.06]" aria-hidden="true" />
          <div className="aurora-glow-orb -bottom-20 -right-20 bg-[#8B5CF6] opacity-[0.06]" aria-hidden="true" />
          
          <div className="relative z-10 flex flex-col justify-between h-full text-left">
            <div className="flex justify-between items-start">
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
              <button
                onClick={() => setActiveTab('accounts')}
                className="px-3.5 py-1.5 min-h-[32px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-text-primary transition cursor-pointer text-[10px] font-bold"
              >
                Manage Wallets
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-accent-green/10 text-accent-green-light">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-text-subtle font-semibold uppercase font-body leading-none tracking-wider">Income This Month</p>
                  <p className="text-sm font-bold text-text-primary mt-1">{formatAmount(thisMonthIncome)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-accent-red/10 text-accent-red">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-text-subtle font-semibold uppercase font-body leading-none tracking-wider">Spend This Month</p>
                  <p className="text-sm font-bold text-text-primary mt-1">{formatAmount(thisMonthExpense)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Warnings Banner (Rendered if any category limit is >= 90%) */}
        {budgetAlerts.length > 0 && (
          <div className="col-span-4 bg-accent-red/10 border border-accent-red/20 rounded-2xl p-4 flex items-center justify-between transition-all">
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2.5 rounded-xl bg-accent-red/10 text-accent-red flex-shrink-0 animate-pulse">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-accent-red font-bold uppercase tracking-wider font-body">Limit Warning</span>
                <p className="text-[10px] text-text-primary leading-normal font-body font-medium">
                  Warning: <span className="font-bold">{budgetAlerts[0].cat}</span> budget is at <span className="text-accent-red font-bold">{budgetAlerts[0].pct}%</span> of monthly limit.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsActivePanel('budgets');
              }}
              className="text-[10px] font-bold text-accent-red hover:underline flex-shrink-0 cursor-pointer"
            >
              Adjust limits
            </button>
          </div>
        )}

        {/* Card 2: Smart Insights Banner (4x1) */}
        <div className="col-span-4 h-[76px] bento-card flex items-center justify-between p-4 relative overflow-hidden">
          <div className="flex items-center space-x-3.5 text-left">
            <div className="p-2.5 rounded-xl bg-accent-violet/10 text-accent-violet flex-shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-text-subtle font-bold uppercase tracking-wider font-body">Smart Insights</span>
              <div className="text-[10px] text-text-secondary leading-normal font-body font-medium max-w-sm">
                {thisMonthIncome > 0 ? (
                  (() => {
                    const savingsRate = Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100);
                    if (savingsRate > 20) {
                      return <>Excellent! You saved <span className="text-accent-green-light font-bold">{savingsRate}%</span> of your income this month. Keep it up!</>;
                    } else if (savingsRate >= 0) {
                      return <>Your savings rate is <span className="text-accent-amber font-bold">{savingsRate}%</span>. Consider trimming expenses to build reserves.</>;
                    } else {
                      return <><span className="text-accent-red font-bold">Deficit Warning:</span> Outflows exceed inflows by <span className="text-accent-red font-bold">{Math.abs(savingsRate)}%</span>. Limit variable spending.</>;
                    }
                  })()
                ) : (
                  <>Log your first monthly income transactions to unlock dynamic savings analytics and automated suggestions.</>
                )}
              </div>
            </div>
          </div>
          <span className="text-[9px] text-text-subtle font-semibold flex-shrink-0">AI Advisor</span>
        </div>

        {/* Card 3: Interactive Financial Charts Card (4x1) */}
        <div className="col-span-4 h-[210px] bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-1.5 bg-bg-elevated/45 border border-border-custom p-0.5 rounded-xl">
              <button
                onClick={() => setActiveChart('flow')}
                className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                  activeChart === 'flow' 
                    ? 'bg-bg-surface text-text-primary shadow-xs border border-border-custom' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Cash Flow Trend
              </button>
              <button
                onClick={() => setActiveChart('category')}
                className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                  activeChart === 'category' 
                    ? 'bg-bg-surface text-text-primary shadow-xs border border-border-custom' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Expense Breakdown
              </button>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-[10px] font-bold text-accent-green-light hover:underline cursor-pointer"
            >
              Reports Detail
            </button>
          </div>

          <div className="flex-1 w-full relative flex items-center justify-center">
            {activeChart === 'flow' ? (
              <div className="h-full w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.38)" fontSize={9} tickLine={false} />
                    <Tooltip formatter={(value) => `${currency}${value}`} />
                    <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={400} />
                    <Bar dataKey="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={400} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              pieChartData.length > 0 ? (
                <div className="h-full w-full flex items-center justify-between">
                  <div className="w-[40%] h-full" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={22}
                          outerRadius={36}
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={true}
                          animationDuration={400}
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
                  <div className="w-[60%] flex flex-col space-y-1.5 overflow-y-auto max-h-[110px] no-scrollbar text-left pr-2">
                    {pieChartData.slice(0, 4).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-text-secondary font-medium truncate max-w-[80px]">{entry.name}</span>
                        </div>
                        <span className="text-text-primary font-bold">{currency}{entry.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-text-subtle">
                  No expenses logged this month
                </div>
              )
            )}
          </div>
        </div>

        {/* Card 8: Recent Activities List - Bento Extra Large (4x2, full width) - Highlighted! */}
        <div className="col-span-4 h-[290px] bento-card flex flex-col justify-between p-4 overflow-hidden border-l-2 border-l-accent-green">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2 text-left">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
              </span>
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-body">
                Recent Activities
              </h2>
            </div>
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

        {/* Card 4: Budgets Health Card - Bento Half (col-span-4 sm:col-span-2) */}
        <div className="col-span-4 sm:col-span-2 h-[130px] bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-2 text-left">
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
                        <span className="font-bold text-text-secondary truncate max-w-[80px]">{catName}</span>
                        <span className="font-bold text-text-primary text-[9px]">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-1">
              <p className="text-[9px] text-text-subtle font-medium leading-tight">
                No monthly spending limits set.
              </p>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-text-primary font-bold text-[8px] rounded-lg cursor-pointer transition-colors duration-150"
              >
                Set Budgets
              </button>
            </div>
          )}
        </div>

        {/* Card 5: Savings Targets - Bento Half (col-span-4 sm:col-span-2) */}
        <div className="col-span-4 sm:col-span-2 h-[130px] bento-card flex flex-col justify-between p-4">
          <div className="flex justify-between items-center mb-2 text-left">
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
                      <span className="font-bold text-text-secondary truncate max-w-[80px]">{goal.title}</span>
                      <span className="font-bold text-text-primary text-[9px]">
                        {pct}% ({currency}{goal.currentSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
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
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] text-text-subtle font-medium leading-tight">
                No savings goals tracked yet.
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
