# Product Requirements Document
## Personal Finance Manager (Offline-First)

**Working Name:** Pocket Ledger
**Author:** Manthan Patel
**Version:** 1.0
**Date:** July 2026
**Status:** Draft — for build

---

## 1. Why This App Exists

Most finance apps on the Play Store want a bank login, an internet connection, or your phone number before you can log a single expense. That's a dealbreaker for a lot of people — especially anyone tracking cash, informal loans to friends, or multiple UPI wallets (PhonePe, GPay, Paytm) alongside actual bank accounts. There's no single place that treats "cash in hand" and "money I lent my cousin" with the same seriousness as a bank balance.

Pocket Ledger is a fully offline personal finance tracker. Everything lives on the device in SQLite. No signup, no server, no data leaving the phone unless the user explicitly exports a backup. The goal is a tool that's fast enough to use every single day — logging an expense should take under 10 seconds.

---

## 2. Goals

- Let a user track income, expenses, and cash flow across unlimited accounts (bank, wallets, cash) without an internet connection.
- Make daily logging fast — add expense in 3 taps or less.
- Give a clear, honest picture of where money is going, without needing the user to categorize everything perfectly.
- Track informal lending/borrowing, which most finance apps ignore entirely.
- Be genuinely private: no analytics SDKs, no cloud sync by default, no ads.

## 3. Non-Goals (for now)

- No bank account linking / auto-sync via Account Aggregator or SMS reading. This is manual entry by design — it keeps the app permission-light and privacy-first.
- No investment portfolio tracking (stocks, mutual funds, SIPs) in v1. Different problem, different app.
- No multi-device cloud sync in v1. Backup/restore via file export covers the "I got a new phone" case.
- No OCR bill scanning or voice entry in v1 — listed under future enhancements, not core.

---

## 4. Target User

Someone who:
- Handles a mix of cash and 2-3 digital payment methods day to day
- Occasionally lends or borrows small amounts from friends/family and loses track of who owes what
- Wants a monthly picture of spending without setting up a full budgeting system
- Doesn't want another app asking for their bank credentials

This is primarily a personal-use app first, built for the author's own money tracking, structured cleanly enough to release publicly as an APK afterward.

---

## 5. Scope — MVP (Phase 1)

Everything below is what actually ships first. Anything not listed here is Phase 2 or later (see Section 9).

### 5.1 Dashboard
- Summary cards: Total Income, Total Expenses, Net Balance, Cash in Hand, This Month Spending
- One income-vs-expense bar chart (current month)
- One category-wise pie chart (current month expenses)
- Tapping any card jumps to the relevant module

### 5.2 Accounts
- Create unlimited accounts (Cash, Bank, PhonePe, GPay, Paytm, Credit Card, custom)
- Each account: name, type, opening balance, current balance (auto-calculated)
- Edit / delete account
- Transfer money between two accounts (this replaces a standalone "Transfers" module — it's an action inside Accounts, not its own section)
- Account detail view shows running balance + transaction history for that account only

### 5.3 Income
- Fields: Amount, Date, Category, Account, Notes
- Preset categories: Salary, Business, Freelancing, Interest, Cashback, Refund, Gift, Other
- Edit / delete / search / filter by category or date range

### 5.4 Expenses
- Fields: Amount, Category, Account, Date, Notes
- Preset categories: Food, Grocery, Fuel, Travel, Bills, Shopping, Entertainment, Education, Medical, Other
- Edit / delete / search / filter by category or date range
- Categories are editable — user can add their own

### 5.5 Cash Book
- Dedicated ledger view filtered to Cash account only
- Daily closing balance
- "Cash used today" quick stat on dashboard

### 5.6 Reports
- Monthly report: total in, total out, net, category breakdown
- Switch between Weekly / Monthly / Yearly view
- Export current report as CSV

### 5.7 Backup & Restore
- Manual backup to a local JSON file
- Restore from a JSON file
- Share backup file via system share sheet (so user can move it to Drive/email manually if they choose — app itself doesn't touch the network)

### 5.8 Security
- PIN lock on app open
- Fingerprint unlock (if device supports it)
- Auto-lock after X minutes in background (configurable)

### 5.9 Settings
- Dark / Light mode
- Currency selector (default ₹ INR)
- Manage categories
- Backup & Security shortcuts

---

## 6. Phase 2 (Post-MVP)

Once the core loop (log → view → report) is solid and actually used daily for a few weeks, add:

- **Money Lent / Borrowed** — person, amount, due date, partial repayment tracking, reminders. This is a genuinely useful differentiator but adds real complexity (partial payment states, per-person history) so it's not blocking v1.
- **Savings Goals** — goal amount, saved so far, progress bar, target date
- **Budget Planner** — per-category monthly caps with over-budget warnings
- **Bills & Reminders** — recurring bill tracking (LIC, EMI, electricity, etc.) with due-date notifications
- **People** — contact-style view aggregating all lending/borrowing history per person
- **Recurring transactions** — auto-log salary, EMI, subscriptions on a schedule
- **Attachments** — attach a photo of a bill/receipt to any transaction

## 7. Phase 3 (Nice to Have / Exploratory)

- OCR bill scanning to auto-fill expense amount
- Voice entry ("spent 500 on groceries")
- Home screen widget (balance + today's spending)
- On-device AI spending insights (e.g. "you spent 30% more on food this month") — no external API calls, so it stays offline-safe
- Optional cloud backup (Google Drive) as an opt-in, not default

---

## 8. Data Model (High Level)

Local SQLite database. Rough table structure:

- `accounts` — id, name, type, opening_balance, current_balance, created_at
- `transactions` — id, type (income/expense), amount, category_id, account_id, date, notes
- `categories` — id, name, type (income/expense), is_custom
- `transfers` — id, from_account_id, to_account_id, amount, date, notes
- `settings` — key-value store for currency, theme, PIN hash, auto-lock timeout

Phase 2 adds: `people`, `loans`, `goals`, `budgets`, `bills`.

SQLite over AsyncStorage/local JSON because transaction history and filtered reports need real queries (sum by category, date range, per-account) — doing that by hand over a flat file gets slow and messy fast.

---

## 9. Tech Stack

- **Frontend:** React + Vite
- **Mobile:** Capacitor (single codebase → web + Android)
- **Local DB:** SQLite via `@capacitor-community/sqlite`
- **Styling:** Tailwind CSS
- **State:** Zustand (lightweight, matches prior project pattern)
- **Charts:** Recharts
- **No backend, no auth server, no external API calls** — fully self-contained

This keeps the app installable directly as an APK with zero recurring hosting cost, matching the offline-first pitch.

---

## 10. Non-Functional Requirements

- App must be fully usable in airplane mode — this is the core promise, not an edge case
- Add-expense flow: 3 taps max from dashboard to saved
- Cold start under 2 seconds on a mid-range device
- Database operations should not block the UI thread — use async queries
- No third-party analytics or crash-reporting SDKs that phone home without explicit user consent
- Backup files must be human-readable JSON, so a user can recover data manually even without the app if needed

---

## 11. Security & Privacy

- PIN stored as a hash, not plaintext, in local settings table
- No data ever leaves the device automatically — export/share is always a manual, explicit user action
- Optional "hide balance" mode (blurs amounts) for using the app in public
- No permissions requested beyond what's strictly needed (storage for backup export, biometric for fingerprint unlock)

---

## 12. Success Criteria for MVP

The MVP is "done" when:
- Every transaction type (income, expense, transfer) can be added, edited, deleted
- Dashboard reflects real-time totals with no manual refresh needed
- A full month can be tracked and reported on without a single crash
- Backup → wipe app data → restore results in an identical dataset
- The author personally uses it daily for 2 weeks without wanting to fall back to a notes app

---

## 13. Open Questions

- Should categories be per-account or global? (Leaning global — simpler, matches how people actually think about spending)
- Multi-currency support — worth building into the schema now even if UI only shows one currency in v1?
- Should transfers count toward "Total Expenses" on the dashboard, or be excluded since money isn't actually leaving the user's net worth? (Leaning: exclude — a transfer is not a spend)

---

## 14. Risks

- **Scope creep** — the original brainstorm had 28 modules; discipline is needed to actually stop at the MVP list above
- **SQLite + Capacitor plugin reliability on older Android versions** — needs early testing on a real low-end device, not just emulator
- **Category sprawl** — if users can freely add categories, reports get messy fast; may need a soft cap or merge-categories feature later
