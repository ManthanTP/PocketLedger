# Pocket Ledger — Page-Level Specification
## Detailed breakdown of every screen, its features, and how screens connect

**Companion doc to:** PocketLedger_PRD.md
**Scope:** All phases — MVP (Phase 1), Phase 2, and Phase 3

---

## Navigation Map (Overview)

```
                          ┌─────────────┐
                          │  PIN Lock   │ (on app open / after auto-lock)
                          └──────┬──────┘
                                 │ correct PIN / fingerprint
                                 ▼
                          ┌─────────────┐
              ┌───────────┤  DASHBOARD  ├───────────┐
              │           └──────┬──────┘           │
              │                  │                   │
    ┌─────────▼───────┐  ┌───────▼────────┐  ┌───────▼────────┐
    │    ACCOUNTS      │  │  ADD ENTRY     │  │    REPORTS      │
    │  (list + detail) │  │ (Income/Expense│  │                  │
    └─────────┬────────┘  │  /Transfer)    │  └───────┬────────┘
              │            └───────┬────────┘          │
              │                    │                   │
    ┌─────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
    │  ACCOUNT DETAIL   │  │  CASH BOOK      │  │  EXPORT (CSV)   │
    │  (txn history)    │  │                 │  │                 │
    └───────────────────┘  └─────────────────┘  └─────────────────┘

    Bottom nav (always visible, 5 tabs):
    Dashboard | Accounts | + (Add) | Reports | Settings

    Settings branches to: Categories, Security, Backup/Restore, Currency/Theme
```

Bottom nav is persistent across all main screens. The **+** button is a floating action that opens a bottom sheet with three choices: Add Income, Add Expense, Add Transfer — this is the single entry point for all money movement, so the user never has to think about which screen to go to first.

---

## 1. PIN Lock Screen

**Purpose:** Gate access to the app.

**Shown when:**
- App is opened cold
- App returns from background after the auto-lock timeout
- Immediately after Settings → Security → PIN is first set up

**Elements:**
- 4-6 digit numeric keypad (on-screen, not system keyboard)
- Fingerprint icon (if biometric available and enabled) — tapping triggers OS biometric prompt as a shortcut instead of typing PIN
- "Forgot PIN" — leads to a recovery flow (security question or full data reset, since there's no server-side recovery possible in an offline app)

**Linked to:**
- On success → Dashboard
- On "Forgot PIN" + reset → wipes local data, goes to fresh onboarding (only real option without a server)

**Notes:** This screen does not appear at all if the user never set up a PIN (Security is opt-in, not forced during onboarding).

---

## 2. Dashboard

**Purpose:** The home screen. One glance tells the user their financial position right now.

**Elements:**
- Greeting + current date
- Summary cards, horizontally scrollable or 2-column grid:
  - Net Balance (sum of all account balances)
  - Total Income (this month)
  - Total Expenses (this month)
  - Cash in Hand (Cash account balance specifically)
- Income vs Expense bar chart — current month, tappable to go to Reports
- Category pie chart — current month expenses only, tappable to go to Reports filtered by that category
- "Recent Transactions" list — last 5 entries across all accounts, each row tappable to open that transaction's edit view
- "See all" link at bottom of recent transactions → Transaction History (a filtered/searchable list, technically part of Reports module)

**Data dependencies:**
- Pulls live aggregates from `transactions` and `accounts` tables — must recalculate on every visit, not cached, since this is the trust anchor of the whole app

**Linked to:**
- Any summary card → relevant filtered list (e.g. tapping "Cash in Hand" → Account Detail for Cash)
- Charts → Reports
- Recent transaction row → Edit Transaction (same form as Add, pre-filled)
- Bottom nav → Accounts / Reports / Settings
- FAB (+) → Add Entry bottom sheet

---

## 3. Add Entry (Bottom Sheet: Income / Expense / Transfer)

**Purpose:** Single fast-entry point for every type of money movement. This is the screen used most often, so it's designed to be completed in under 10 seconds.

**Three tabs within the same sheet:** Income | Expense | Transfer

### 3a. Add Income
- Amount (numeric keypad, auto-focused)
- Account (dropdown, defaults to last-used account)
- Category (chip selector — Salary, Business, Freelancing, Interest, Cashback, Refund, Gift, Other)
- Date (defaults to today, tappable to change)
- Notes (optional, collapsed by default)
- Save button

### 3b. Add Expense
- Same layout as Income, but categories are: Food, Grocery, Fuel, Travel, Bills, Shopping, Entertainment, Education, Medical, Other
- Same fields: Amount, Account, Category, Date, Notes

### 3c. Add Transfer
- Amount
- From Account (dropdown)
- To Account (dropdown, cannot match From)
- Date
- Notes
- Does **not** show a category selector — transfers are excluded from income/expense totals by design (per PRD open question, resolved as: exclude)

**Validation:**
- Amount must be > 0
- Account is required
- If account balance would go negative on an Expense/Transfer, show a soft warning (not a hard block — user might be intentionally tracking a negative/overdraft cash position)

**Linked to:**
- Opened from: Dashboard FAB, Accounts screen FAB, Cash Book "+", Account Detail "+"
- On Save → closes sheet, returns to whichever screen it was opened from, with that screen's totals refreshed
- Category chip row has an "Edit categories" option at the end → Settings → Categories

---

## 4. Accounts (List)

**Purpose:** Overview of every account the user has set up, with balances.

**Elements:**
- List of account cards: name, type icon, current balance
- Total across all accounts shown at top
- "+ Add Account" button/row at bottom of list
- Each row tappable → Account Detail

**Linked to:**
- Account row → Account Detail
- Add Account → Add/Edit Account form
- Bottom nav → Dashboard / Reports / Settings
- FAB (+) → Add Entry sheet (same global entry point)

---

## 5. Add/Edit Account

**Purpose:** Create a new account or edit an existing one.

**Elements:**
- Name (text)
- Type (Cash / Bank / UPI Wallet / Credit Card / Other — affects icon shown)
- Opening Balance (numeric, only editable at creation — becomes locked after first transaction exists, to keep historical balance math consistent)
- Save / Delete (Delete only shown when editing, and only allowed if account has zero transactions, or requires explicit "delete all related transactions" confirmation)

**Linked to:**
- Opened from: Accounts list ("+ Add Account") or Account Detail ("Edit")
- On Save → back to Accounts list, new/updated card visible immediately

---

## 6. Account Detail

**Purpose:** Deep view into a single account — its full transaction history and running balance.

**Elements:**
- Header: account name, type, current balance
- Running balance chart (simple line, balance over time for this account only)
- Transaction list, filtered to this account, most recent first
- Each transaction row: category icon, amount (color-coded green/red), date, notes preview
- Filter/search bar (by date range, category, or amount)
- "Edit Account" icon in header → Add/Edit Account
- FAB (+) → Add Entry sheet, pre-filled with this account selected

**Linked to:**
- Opened from: Accounts list, or from Dashboard summary cards (e.g. tapping "Cash in Hand")
- Transaction row → Edit Transaction (Add Entry sheet, pre-filled, same form reused for editing)
- Edit Account icon → Add/Edit Account

---

## 7. Cash Book

**Purpose:** A dedicated, simplified ledger view specifically for the Cash account — because cash is the one account type without a digital trail, so it needs the tightest daily discipline.

**Elements:**
- Today's cash used (large, top of screen)
- Daily closing balance list — one row per day, expandable to see that day's individual cash transactions
- FAB (+) → Add Entry sheet, pre-filled to Cash account, Expense tab active by default

**Linked to:**
- Accessible from: Dashboard "Cash in Hand" card, or a dedicated bottom-nav-adjacent shortcut if the user has cash as their primary account (configurable in Settings)
- Functionally this is Account Detail filtered to Cash, but presented with the daily-closing-balance framing since that's how people naturally think about physical cash

---

## 8. Reports

**Purpose:** Look back and understand spending/income patterns over a period.

**Elements:**
- Period toggle: Weekly / Monthly / Yearly
- Summary row: Total In, Total Out, Net for selected period
- Category breakdown — horizontal bar list, sorted by amount, tappable to drill into that category's transactions
- Income vs Expense trend chart across the period
- "Export" button → generates CSV of the currently filtered view

**Linked to:**
- Opened from: Dashboard charts, bottom nav
- Category bar → Transaction History filtered to that category + period
- Export → system share sheet (save to Files, share via any app — no network call made by Pocket Ledger itself)

---

## 9. Transaction History (Full List)

**Purpose:** Every transaction, searchable and filterable — the "see everything" screen.

**Elements:**
- Search bar (searches notes, category, amount)
- Filter chips: date range, account, category, type (income/expense/transfer)
- Grouped list — by month, with sticky month headers
- Each row tappable → Edit Transaction

**Linked to:**
- Opened from: Dashboard "See all," Reports category drill-down
- Row → Add Entry sheet in edit mode

---

## 10. Settings

**Purpose:** Central hub for app configuration — not a feature screen itself, but the gateway to secondary flows.

**Elements (each a row leading to a sub-screen):**
- Categories (manage custom income/expense categories)
- Security (PIN, fingerprint, auto-lock timeout, hide-balance toggle)
- Backup & Restore
- Currency
- Theme (Dark/Light/System)
- About / App version

**Linked to:**
- Bottom nav → Settings
- Each row → its respective sub-screen (Categories, Security, Backup, etc.)

### 10a. Categories
- List of current categories (income and expense, separately tabbed)
- Add / rename / delete (delete only if no transactions use that category, otherwise offer to reassign)

### 10b. Security
- Set/change PIN
- Toggle fingerprint unlock
- Auto-lock timeout (Immediately / 1 min / 5 min / Never)
- Hide balance toggle (blurs all amounts app-wide until tapped)

### 10c. Backup & Restore
- "Create Backup" → generates JSON file, opens share sheet
- "Restore from Backup" → file picker → confirmation screen showing what will be overwritten → confirm
- Last backup date shown for reference

---

## 11. Onboarding (First Launch Only)

**Purpose:** Get a brand-new user to a usable state fast — no signup, just setup.

**Flow:**
1. Welcome screen — one-liner on what the app does, "no internet needed" reassurance
2. Add your first account (pre-filled suggestion: "Cash", opening balance 0, editable)
3. Optional: set up PIN (skippable, can be added later via Settings)
4. Lands on Dashboard (empty state: "No transactions yet" with a prompt pointing to the + button)

**Linked to:**
- Only shown once, on first-ever launch (checked via a flag in the `settings` table)
- Ends at → Dashboard

---

---

## PHASE 2 — Screens

These build on top of the MVP nav structure. Bottom nav stays the same (Dashboard | Accounts | + | Reports | Settings) — Phase 2 features are reached via the Dashboard, a new "More" row in Settings, or contextually from existing screens. No bottom nav tab is added, to avoid crowding.

### 12. Money Lent / Borrowed (combined module, two tabs)

**Purpose:** Track informal money owed to or by the user — the app's key differentiator over generic finance trackers.

**Elements:**
- Two tabs: "Lent" and "Borrowed"
- List of entries per tab: person name, amount, pending amount (if partially repaid), due date, status chip (Pending / Overdue / Settled)
- Sorted with Overdue at top
- FAB (+) → Add Lend/Borrow form

**Add Lend/Borrow form:**
- Person (searchable — pulls from existing People list or creates new)
- Amount
- Date given/borrowed
- Due date (optional)
- Interest (optional, simple % field)
- Notes
- Save

**Repayment flow:**
- Tapping an entry opens its detail view: original amount, amount repaid so far, remaining
- "Log Repayment" button → amount + date + which account the cash moved through (so it correctly updates that account's balance too)
- Full repayment auto-marks status as Settled

**Linked to:**
- Opened from: Dashboard "Money Lent" / "Money Borrowed" cards (re-added to Dashboard once this module exists), or Settings → More
- Person name → People detail screen (#14)
- Repayment logging → also creates a normal ledger entry so account balances stay accurate, but tagged as a loan repayment (excluded from income/expense totals, same treatment as Transfers)

### 13. Savings Goals

**Purpose:** Let the user set a target and track progress toward it.

**Elements:**
- List of goal cards: name, icon, progress bar, saved/target amount, target date
- FAB (+) → Add Goal form (Name, Target Amount, Target Date, optional linked account)
- Tapping a goal → Goal Detail: progress chart over time, "Add Contribution" button, edit/delete goal

**Linked to:**
- Opened from: Dashboard "Savings Progress" card, or Settings → More
- Add Contribution → mini version of Add Entry, logs a contribution against the goal

### 14. People

**Purpose:** Contact-style aggregation of all lending/borrowing history with a specific person.

**Elements:**
- List of people (auto-populated from Money Lent/Borrowed entries)
- Each row: name, net position ("owes you ₹X" or "you owe ₹X"), last activity date
- Tapping a person → their full history (all lend/borrow entries + repayments with that person), sorted by date

**Linked to:**
- Opened from: Money Lent/Borrowed module, or Settings → More
- Entry rows → Loan detail (#12)

### 15. Budget Planner

**Purpose:** Set monthly spending caps per category and get warned when close to or over.

**Elements:**
- List of categories with a budget set, each showing: budget amount, spent so far this month, progress bar (turns amber near 90%, red past 100%)
- "+ Set Budget" → pick category, set monthly amount
- Categories without a budget set are listed below, tappable to add one

**Linked to:**
- Opened from: Dashboard (a "Budget" summary strip once budgets exist), or Settings → More
- Category row → Transaction History filtered to that category, current month
- Warnings surface as a Dashboard banner when any budget crosses 90%

### 16. Bills & Reminders

**Purpose:** Track recurring bills (LIC, EMI, electricity, etc.) and get reminded before they're due.

**Elements:**
- List of bills: name, amount, due date, recurrence (monthly/yearly), status (Upcoming / Due / Paid)
- FAB (+) → Add Bill form: Name, Amount, Due Date, Recurrence, linked Account (optional), reminder lead time (e.g. 3 days before)
- Marking a bill "Paid" → auto-creates an Expense entry, pre-filled from the bill's details

**Linked to:**
- Opened from: Dashboard "Upcoming Bills" strip, or Settings → More
- "Mark Paid" → Add Entry sheet, pre-filled; saving both settles the bill and logs the expense
- Reminder notifications → tapping one deep-links straight to this bill's entry

### 17. Recurring Transactions

**Purpose:** Auto-log transactions that repeat on a schedule (salary, subscriptions, EMI) instead of manual re-entry every month.

**Elements:**
- List of active recurring rules: description, amount, account, frequency, next run date
- FAB (+) → Add Recurring form: same fields as Add Entry, plus Frequency (weekly/monthly/yearly) and End Date (optional, "never" by default)
- Each rule editable/pausable/deletable

**Linked to:**
- Opened from: Settings → More, or a shortcut from Add Entry ("Make this recurring" toggle at the bottom of the form)
- On its scheduled date, a rule silently creates a normal transaction, visible everywhere transactions normally show up (Dashboard, Reports, Account Detail)

### 18. Attachments (feature, not a standalone screen)

**Purpose:** Attach a photo (bill/receipt/screenshot) to any transaction.

**Elements:**
- Added as an optional field inside the Add Entry form: "Attach Photo" — camera or gallery picker
- Thumbnail shown on the transaction row in Transaction History / Account Detail if an attachment exists
- Tapping the thumbnail opens a full-screen image viewer

**Linked to:** Lives inside Add Entry (#3) and Transaction History/Account Detail rows — not a separate nav destination.

---

## PHASE 3 — Screens & Features

These are exploratory and lower priority. Kept lightweight here since they depend on Phase 1/2 being stable first.

### 19. OCR Bill Scan

**Purpose:** Point camera at a receipt, auto-fill the Expense amount/merchant instead of typing.

**Elements:**
- Camera icon added next to "Attach Photo" in Add Entry
- On capture, on-device OCR extracts a likely amount and date, pre-fills the form fields — user still confirms/edits before saving (never auto-saves without review)

**Linked to:** Add Entry form only — no new screen, just an enhanced input method.

### 20. Voice Entry

**Purpose:** "Spent 500 on groceries" → auto-fills Add Entry.

**Elements:**
- Mic icon on Dashboard FAB or Add Entry header
- On-device speech-to-text parses amount + category keyword, opens Add Entry pre-filled for confirmation

**Linked to:** Add Entry form, same pattern as OCR — assistive input, not a new destination.

### 21. Home Screen Widget

**Purpose:** Glanceable balance/spending without opening the app.

**Elements:**
- Shows: Net Balance, Today's Spending, Savings Goal progress (if any goals exist)
- Tapping widget → opens app directly to Dashboard

**Linked to:** Read-only, pulls same aggregates as Dashboard.

### 22. On-Device AI Insights

**Purpose:** Plain-language observations about spending, computed locally (no external API calls, keeping the offline/privacy promise intact).

**Elements:**
- A card on Dashboard (or its own "Insights" screen if the list grows) showing 2-3 short statements: e.g. spending up/down vs last month, top category, goal progress commentary
- Tapping an insight → relevant Reports/category drill-down

**Linked to:** Dashboard, Reports — surfaces existing data differently, doesn't introduce new data types.

### 23. Optional Cloud Backup

**Purpose:** For users who want cross-device sync, opt-in only — default remains fully offline.

**Elements:**
- Settings → Backup & Restore gets a new "Cloud Backup (optional)" section
- Explicit toggle + account connection (e.g. Google Drive) required before any network call is ever made by the app
- Clear copy explaining this is optional and off by default

**Linked to:** Settings → Backup & Restore (#10c), extends rather than replaces the existing JSON export/import flow.

---

## How Data Flows Between Screens (Summary)

- **Every screen that shows a balance** (Dashboard, Accounts, Account Detail, Cash Book) reads live from the `accounts.current_balance` field, which is recalculated whenever a transaction or transfer is saved, edited, or deleted — never hand-maintained per screen.
- **The Add Entry sheet is reused everywhere** — Dashboard, Accounts, Account Detail, Cash Book, Transaction History all open the same component, just with different pre-filled defaults (account, category tab). This keeps the entry logic in one place instead of duplicating forms.
- **Categories are global**, not per-account, so the same category list appears in Add Entry regardless of which account is selected. This was the open question in the PRD — resolved as global for simplicity.
- **Reports and Transaction History both read from the same underlying query layer** (filtered transaction list) — Reports adds aggregation/charts on top, History is the raw filtered list. They're not separate data paths.
