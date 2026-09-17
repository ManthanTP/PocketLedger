import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Shield,
  Smartphone,
  FileText,
  Lock,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  HardDrive,
  EyeOff,
  BookOpen,
  Sliders,
  Share2,
  Globe
} from 'lucide-react';
import { AppIconFull } from '../components/AppIcon';
import { useScrollReveal, ScrollReveal } from '../hooks/useScrollReveal';

interface LandingPageProps {
  onLaunchApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [activeMockupTab, setActiveMockupTab] = useState<'dashboard' | 'reports' | 'cashbook' | 'security'>('dashboard');
  const [incomeSlider, setIncomeSlider] = useState<number>(65000);
  const [savingsRate, setSavingsRate] = useState<number>(30);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Scroll reveal refs for each section
  const heroBadgeRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 600, delay: 100 });
  const heroHeadlineRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up', duration: 800, delay: 200 });
  const heroSubtitleRef = useScrollReveal<HTMLParagraphElement>({ animation: 'fade-up', duration: 800, delay: 350 });
  const heroButtonsRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 800, delay: 500 });
  const heroMetaRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-in', duration: 1000, delay: 650 });
  const heroStatsRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 800, delay: 800 });
  const previewHeadingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 700 });
  const previewContentRef = useScrollReveal<HTMLDivElement>({ animation: 'scale-in', duration: 800, delay: 150 });
  const calculatorRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 800 });
  const featuresHeadingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 700 });
  const specsHeadingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 700 });
  const specsGridRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 800, delay: 150 });
  const sideloadRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 800, delay: 300 });
  const faqHeadingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', duration: 700 });
  const ctaRef = useScrollReveal<HTMLDivElement>({ animation: 'scale-in', duration: 900 });

  const calculatedSavings = Math.round(incomeSlider * (savingsRate / 100));
  const yearlyProjected = calculatedSavings * 12;

  const faqs = [
    {
      q: 'Is my financial data really 100% private and offline?',
      a: 'Yes. Pocket Ledger Pro does not use remote cloud databases or third-party tracking services. All your financial accounts, transactions, and security settings reside strictly in your device local encrypted storage.'
    },
    {
      q: 'What is the difference between the Web App and the Android APK?',
      a: 'Both versions offer the complete set of financial ledger tools, account statements, and analytics. The Android APK runs as a standalone native app with hardware back-button support, offline APK installation, and native file sharing integration.'
    },
    {
      q: 'Can I generate PDF reports for specific accounts?',
      a: 'Absolutely. You can generate professional, multi-page PDF statements and CSV files for any individual account or All Accounts combined, with Monthly, Yearly, or Custom date ranges and automatic text-wrapping.'
    },
    {
      q: 'How do I backup and restore my ledger data?',
      a: 'In Settings → Data Management, you can export a full JSON backup of your ledger anytime. You can store this backup anywhere (such as on an SD card or private USB drive) and restore it with a single tap.'
    },
    {
      q: 'What if I forget my PIN code?',
      a: 'During setup you configure a custom Security Recovery Question. If you ever forget your master PIN, you can reset it on your device using your recovery answer without requiring an internet connection.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-900 relative overflow-x-hidden">
      {/* Dynamic Background Aurora Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[15%] left-[10%] w-[650px] h-[650px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] -right-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/12 blur-[130px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-emerald-600/8 blur-[140px]" />
      </div>

      {/* Sticky Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B1220]/80 border-b border-white/[0.08] transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <AppIconFull size={44} className="rounded-xl shadow-lg shadow-emerald-500/20" />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg text-white tracking-tight">Pocket Ledger Pro</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  v1.0.0 PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Private Offline Personal Finance</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#preview" className="hover:text-emerald-400 transition-colors">Interactive Demo</a>
            <a href="#specs" className="hover:text-emerald-400 transition-colors">APK Specs</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onLaunchApp}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Launch Web App</span>
            </button>

            <a
              href="/PocketLedgerPRO.apk"
              download="PocketLedgerPRO.apk"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Download APK</span>
              <span className="text-[11px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">36.2 MB</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Status Badge */}
          <div ref={heroBadgeRef} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <Shield className="w-3.5 h-3.5" />
            <span>100% Offline • Zero Telemetry • True Financial Sovereignty</span>
          </div>

          {/* Hero Headline */}
          <h1 ref={heroHeadlineRef} className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            Your Money. Your Privacy.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              Zero Cloud.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p ref={heroSubtitleRef} className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            A high-performance personal finance ledger built entirely offline. Track accounts, generate professional PDF statements, monitor cash books, and protect your wealth with biometric PIN security.
          </p>

          {/* Dual Action Buttons */}
          <div ref={heroButtonsRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <a
              href="/PocketLedgerPRO.apk"
              download="PocketLedgerPRO.apk"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 flex items-center justify-center gap-3 group hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
              <span>Download Android APK</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950/20 font-mono font-bold">36.2 MB</span>
            </a>

            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Launch Web Version</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Metadata Specs Bar */}
          <div ref={heroMetaRef} className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              v1.0.0 PRO (Release)
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Size: <strong className="text-slate-200 font-semibold">36.2 MB</strong></span>
            <span className="hidden sm:inline">•</span>
            <span>Android 8.0+ & Web</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-emerald-400 font-semibold">Offline Verified</span>
          </div>

          {/* Trust Highlights */}
          <div ref={heroStatsRef} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="text-2xl font-display font-extrabold text-white">0 ms</div>
              <div className="text-xs text-slate-400 mt-1">Server Latency</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="text-2xl font-display font-extrabold text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 mt-1">Local & Private</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="text-2xl font-display font-extrabold text-white">PBKDF2</div>
              <div className="text-xs text-slate-400 mt-1">Cryptographic PIN</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="text-2xl font-display font-extrabold text-teal-400">PDF & CSV</div>
              <div className="text-xs text-slate-400 mt-1">Instant Statements</div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DEVICE PREVIEW & PLAYGROUND */}
        <section id="preview" className="py-20 bg-slate-900/40 border-y border-white/[0.06] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={previewHeadingRef} className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Interactive Showcase
              </span>
              <h2 className="mt-4 text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
                Designed for Absolute Clarity
              </h2>
              <p className="mt-3 text-slate-400 text-base">
                Explore key features with the interactive preview tabs below.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-10">
              {[
                { id: 'dashboard', label: 'Dashboard & Net Worth', icon: TrendingUp },
                { id: 'reports', label: 'Account PDF Statements', icon: FileText },
                { id: 'cashbook', label: 'Cash Book Ledger', icon: BookOpen },
                { id: 'security', label: 'Biometric PIN Vault', icon: Lock }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMockupTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMockupTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Preview Container */}
            <div ref={previewContentRef} className="max-w-4xl mx-auto rounded-3xl bg-[#111C30]/90 border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Tab 1: Dashboard View */}
              {activeMockupTab === 'dashboard' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Combined Financial Health</span>
                      <h3 className="text-2xl font-display font-extrabold text-white mt-1">Total Net Worth: ₹ 4,85,250.00</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        +14.2% this month
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-xs text-slate-400">Total Income</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">+₹ 1,12,000</div>
                      <div className="text-[10px] text-slate-500 mt-1">3 active cash flows</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-xs text-slate-400">Total Expenses</div>
                      <div className="text-xl font-bold text-rose-400 mt-1">-₹ 38,450</div>
                      <div className="text-[10px] text-slate-500 mt-1">Groceries, utilities, bills</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-xs text-slate-400">Net Monthly Savings</div>
                      <div className="text-xl font-bold text-teal-300 mt-1">+₹ 73,550</div>
                      <div className="text-[10px] text-emerald-400/80 mt-1">65.6% savings rate</div>
                    </div>
                  </div>

                  {/* Simulated Recent Transactions */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wider font-mono text-slate-400">Recent Activity</div>
                    <div className="space-y-2">
                      {[
                        { title: 'Freelance Design Retainer', account: 'HDFC Savings', amount: '+₹ 45,000.00', type: 'income', date: 'Today, 2:15 PM' },
                        { title: 'Monthly Grocery Restock', account: 'Cash Wallet', amount: '-₹ 4,820.00', type: 'expense', date: 'Yesterday' },
                        { title: 'Cloud Infrastructure Bill', account: 'Business Current', amount: '-₹ 2,350.00', type: 'expense', date: '15 Sep' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {item.type === 'income' ? '+' : '-'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white">{item.title}</div>
                              <div className="text-[10px] text-slate-400">{item.account} • {item.date}</div>
                            </div>
                          </div>
                          <div className={`text-xs font-mono font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Reports View */}
              {activeMockupTab === 'reports' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Account Statement Generator</span>
                      <h3 className="text-xl font-display font-bold text-white mt-1">Multi-Page PDF & CSV Export</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 text-xs font-bold border border-teal-500/30">
                      Auto-Wrap Formatting
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold">Specific Account: HDFC Salary</span>
                      <span className="px-3 py-1 rounded-lg bg-white/5 text-slate-300 text-xs font-semibold">Date Range: September 2026</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                        <div className="text-[10px] text-slate-400">Opening Balance</div>
                        <div className="text-xs font-bold text-slate-200 mt-0.5">₹ 1,24,000</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                        <div className="text-[10px] text-slate-400">Total Income</div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">+₹ 95,000</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                        <div className="text-[10px] text-slate-400">Total Expenses</div>
                        <div className="text-xs font-bold text-rose-400 mt-0.5">-₹ 26,400</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                        <div className="text-[10px] text-slate-400">Closing Balance</div>
                        <div className="text-xs font-bold text-teal-300 mt-0.5">₹ 1,92,600</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400">
                        Footer Attribution: <code className="text-slate-300 text-[11px]">© 2026 Manthan Patel • Pocket Ledger Pro</code>
                      </span>
                      <div className="flex gap-2">
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Download PDF
                        </span>
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white font-semibold flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Cash Book View */}
              {activeMockupTab === 'cashbook' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Daily Cash Register</span>
                      <h3 className="text-xl font-display font-bold text-white mt-1">Physical Cash In/Out Tracker</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      Physical Balance Match
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
                      <div className="text-xs text-emerald-400 font-semibold uppercase">Daily Cash Inflow</div>
                      <div className="text-2xl font-bold text-white mt-1">+₹ 14,500.00</div>
                      <div className="text-xs text-slate-400 mt-2">Cash received from retail sales & cash gifts</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20">
                      <div className="text-xs text-rose-400 font-semibold uppercase">Daily Cash Outflow</div>
                      <div className="text-2xl font-bold text-white mt-1">-₹ 3,250.00</div>
                      <div className="text-xs text-slate-400 mt-2">Petty cash, vendor tip, office stationery</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cash Drawer Closing Balance:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">₹ 21,850.00 (Verified)</span>
                  </div>
                </div>
              )}

              {/* Tab 4: Security View */}
              {activeMockupTab === 'security' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Bank-Grade Protection</span>
                      <h3 className="text-xl font-display font-bold text-white mt-1">Biometric Lock & PBKDF2 Master PIN</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs font-bold border border-violet-500/30">
                      Zero-Knowledge
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <Lock className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <div className="text-xs font-bold text-white">Encrypted PIN</div>
                      <div className="text-[11px] text-slate-400 mt-1">PBKDF2 SHA-256 with dynamic device salt</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <Smartphone className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                      <div className="text-xs font-bold text-white">Auto-Lock Timer</div>
                      <div className="text-[11px] text-slate-400 mt-1">Instant, 1 min, or 5 min background lock</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <Shield className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                      <div className="text-xs font-bold text-white">Offline Recovery</div>
                      <div className="text-[11px] text-slate-400 mt-1">Encrypted security question reset</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* INTERACTIVE CASHFLOW CALCULATOR */}
        <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={calculatorRef} className="rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/25 mb-4">
                <Sliders className="w-3.5 h-3.5" />
                <span>Interactive Wealth Projector</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-white">
                Calculate Your Projected 1-Year Reserve
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Simulate your financial growth. Pocket Ledger Pro keeps your real numbers 100% private on your device.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-2">
                    <span>Monthly Income</span>
                    <span className="font-mono text-emerald-400 font-bold">₹ {incomeSlider.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="15000"
                    max="300000"
                    step="5000"
                    value={incomeSlider}
                    onChange={(e) => setIncomeSlider(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-2">
                    <span>Target Monthly Savings Rate</span>
                    <span className="font-mono text-teal-300 font-bold">{savingsRate}% (₹ {calculatedSavings.toLocaleString()}/mo)</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="70"
                    step="5"
                    value={savingsRate}
                    onChange={(e) => setSavingsRate(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center sm:text-right">
                <div className="text-xs uppercase font-mono tracking-wider text-slate-400">1-Year Projected Accumulation</div>
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-400 mt-1">
                  ₹ {yearlyProjected.toLocaleString()}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Track every rupee towards this goal using Pocket Ledger Pro's Account Reports and Cash Book.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuresHeadingRef} className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              Crafted for True Financial Freedom
            </h2>
            <p className="mt-3 text-slate-400 text-base">
              Every tool you need to master your money without giving up your privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Account Reports & Statements',
                desc: 'Generate clean PDF and CSV account statements with opening and closing balances, auto-wrapped text formatting, and full transaction history.'
              },
              {
                icon: BarChart3,
                title: 'Reports & Analytics Filter',
                desc: 'Filter entire dashboards, cashflow metrics, and charts by a single account or view combined finances across All Accounts with one click.'
              },
              {
                icon: BookOpen,
                title: 'Daily Cash Book Ledger',
                desc: 'Specialized physical register for tracking cash in hand, daily retail inflow, outflow, and automated closing cash calculation.'
              },
              {
                icon: Lock,
                title: 'Biometric & PIN Vault',
                desc: 'Client-side PBKDF2 master PIN encryption, auto-lock timeout, and secure recovery question. No master passwords stored on remote servers.'
              },
              {
                icon: EyeOff,
                title: 'Zero Tracking & No Ads',
                desc: 'No user accounts, no email signups, no external analytic trackers, and zero advertisements. Your financial life remains yours alone.'
              },
              {
                icon: HardDrive,
                title: 'One-Tap Local Backups',
                desc: 'Export encrypted JSON backups anytime. Restore your complete ledger in seconds on any device without relying on internet servers.'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={i} animation="fade-up" duration={700} delay={i * 120}>
                <div className="p-8 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* TECHNICAL SPECS SECTION */}
        <section id="specs" className="py-20 bg-slate-900/40 border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={specsHeadingRef} className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase font-mono text-emerald-400 font-bold tracking-wider">Verified Release</span>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white mt-1">APK Specifications</h2>
            </div>

            <div ref={specsGridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">Application File</div>
                <div className="text-base font-bold text-white mt-1 font-mono">PocketLedgerPRO.apk</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">Build Size</div>
                <div className="text-base font-bold text-emerald-400 mt-1 font-mono">36.2 MB</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">Release Version</div>
                <div className="text-base font-bold text-white mt-1 font-mono">v1.0.0 PRO</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">OS Compatibility</div>
                <div className="text-base font-bold text-white mt-1">Android 8.0 & Above</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">Target Architecture</div>
                <div className="text-base font-bold text-white mt-1">ARM64 / Universal</div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-400">Required Permissions</div>
                <div className="text-base font-bold text-teal-300 mt-1">Zero Network Permissions</div>
              </div>
            </div>

            {/* Quick Sideload Steps */}
            <div ref={sideloadRef} className="mt-12 p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08]">
              <h3 className="text-lg font-bold text-white mb-6">How to Sideload & Install on Android:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Click <strong>Download Android APK (36.2 MB)</strong> to download the APK directly to your phone.
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Tap the downloaded file. If prompted, toggle <strong>"Allow from this source"</strong> in Chrome or your file manager.
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Tap <strong>Install</strong>. Launch Pocket Ledger Pro and create your private master PIN!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={faqHeadingRef} className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <ScrollReveal key={idx} animation="fade-up" duration={600} delay={idx * 100}>
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div ref={ctaRef} className="rounded-3xl bg-gradient-to-r from-emerald-900/30 via-slate-900 to-teal-900/30 border border-emerald-500/20 p-10 sm:p-16 max-w-4xl mx-auto">
            <AppIconFull size={80} className="mx-auto mb-6 rounded-2xl shadow-xl shadow-emerald-500/20" />
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              Ready to Take Back Control of Your Finances?
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
              Download the APK or launch the web ledger right now in your browser.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/PocketLedgerPRO.apk"
                download="PocketLedgerPRO.apk"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Download APK (36.2 MB)</span>
              </a>

              <button
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch Web Ledger</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER WITH PROFESSIONAL ATTRIBUTION */}
      <footer className="border-t border-white/[0.08] relative z-10 bg-[#080D17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section: Logo + Nav */}
          <div className="py-10 sm:py-12 flex flex-col items-center gap-8 md:flex-row md:justify-between">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-3">
                <AppIconFull size={36} className="rounded-xl shadow-lg shadow-emerald-500/10" />
                <div>
                  <span className="font-display font-extrabold text-lg text-white tracking-tight">Pocket Ledger Pro</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">v1.0 PRO</span>
                    <span className="text-[10px] text-slate-500 font-medium">Private Offline Finance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-center md:flex md:items-center md:gap-8">
              <a href="#features" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors font-medium">
                Features
              </a>
              <a href="#preview" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors font-medium">
                Demo
              </a>
              <a href="#specs" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors font-medium">
                Specs
              </a>
              <a href="#faq" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors font-medium">
                FAQ
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 hover:border-emerald-500/30 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Web App</span>
              </button>
              <a
                href="/PocketLedgerPRO.apk"
                download="PocketLedgerPRO.apk"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>APK</span>
                <span className="text-[10px] font-mono opacity-70">36.2 MB</span>
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Bottom Section: Copyright */}
          <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
              © {new Date().getFullYear()} Pocket Ledger Pro • Created by{' '}
              <a
                href="https://manthantp-portfolio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400/80 hover:text-emerald-300 font-semibold transition-colors"
              >
                Manthan Patel
              </a>
              . All rights reserved.
            </p>

            <a
              href="https://manthantp-portfolio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 hover:text-emerald-400 transition-colors font-medium"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
