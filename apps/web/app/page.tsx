"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import { supabaseBudgetRepository } from "./lib/supabase-budget-repository";
import * as budgetDomain from "./lib/budget";
import { localBudgetRepository } from "./lib/budget-repository";

type Transaction = budgetDomain.Transaction;
type Budget = budgetDomain.Budget;
type BalanceCheck = budgetDomain.BalanceCheck;
type EntryMode = Transaction["type"] | "planned";
type Account = budgetDomain.Account;

const initialTransactions: Transaction[] = [
  { id: 1, name: "Monthly salary", category: "Income", amount: 82000, date: "2026-08-01", type: "income", icon: "✦" },
  { id: 2, name: "Grocery run", category: "Food & groceries", amount: 4280, date: "2026-08-06", type: "expense", icon: "🛒" },
  { id: 3, name: "Electric bill", category: "Bills & utilities", amount: 3240, date: "2026-08-05", type: "expense", icon: "⚡" },
  { id: 4, name: "Cafe with friends", category: "Dining out", amount: 960, date: "2026-08-04", type: "expense", icon: "☕" },
  { id: 5, name: "Jeepney & train", category: "Transport", amount: 680, date: "2026-08-03", type: "expense", icon: "◈" },
  { id: 6, name: "Streaming services", category: "Subscriptions", amount: 549, date: "2026-08-02", type: "expense", icon: "▶" },
  { id: 7, name: "Freelance payment", category: "Income", amount: 12500, date: "2026-07-22", type: "income", icon: "✦" },
  { id: 8, name: "Market groceries", category: "Food & groceries", amount: 3160, date: "2026-07-18", type: "expense", icon: "🛒" },
  { id: 9, name: "Phone plan", category: "Bills & utilities", amount: 1499, date: "2026-06-28", type: "expense", icon: "◌" },
];

const defaultCategories = ["Food & groceries", "Dining out", "Transport", "Bills & utilities", "Subscriptions", "Shopping", "Health", "Other", "Untracked spending"];
let categories = [...defaultCategories];
const initialBudgets: Budget[] = [
  { id: 1, category: "Dining out", limit: 3000, icon: "☕", tone: "peach" },
  { id: 2, category: "Transport", limit: 4500, icon: "◈", tone: "blue" },
  { id: 3, category: "Food & groceries", limit: 7500, icon: "🛒", tone: "purple" },
];
const initialAccounts: Account[] = [
  { id: 1, name: "Main bank", kind: "bank", openingBalance: 0 },
  { id: 2, name: "Cash", kind: "cash", openingBalance: 0 },
  { id: 3, name: "Credit card", kind: "credit_card", openingBalance: 0, creditLimit: 50000 },
];
const periodOptions = [
  ["today", "Today"], ["week", "This week"], ["biweekly", "Bi-weekly"], ["month", "This month"], ["year", "This year"], ["custom", "Custom"],
] as const;
let displayedCurrency = "PHP";

function peso(value: number) {
  return budgetDomain.formatCurrency(value, displayedCurrency);
}

function displayDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(parsed);
}

function describeCloudError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const details = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    return [details.message, details.code, details.details, details.hint].filter((value) => typeof value === "string" && value.trim()).join(" — ") || "please try again.";
  }
  return "please try again.";
}

export default function Home() {
  const [profileName, setProfileName] = useState("Alex Morgan");
  const [currencyCode, setCurrencyCode] = useState("PHP");
  const [startingBalance, setStartingBalance] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState<number | null>(null);
  const [period, setPeriod] = useState<(typeof periodOptions)[number][0]>("month");
  useEffect(() => { displayedCurrency = currencyCode; }, [currencyCode]);
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const saved = localBudgetRepository.loadProfile();
    if (typeof saved.name === "string" && saved.name.trim()) setProfileName(saved.name);
    if (saved.currency === "PHP" || saved.currency === "USD") setCurrencyCode(saved.currency);
    if (periodOptions.some(([value]) => value === saved.period)) setPeriod(saved.period as (typeof periodOptions)[number][0]);
    if (typeof saved.startingBalance === "number" && Number.isFinite(saved.startingBalance)) setStartingBalance(saved.startingBalance);
    setSavingsGoal(localBudgetRepository.loadSavingsGoal());
  }, []);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [categoryVersion, setCategoryVersion] = useState(0);
  const [storageNotice, setStorageNotice] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [accountsReady, setAccountsReady] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [budgetsReady, setBudgetsReady] = useState(false);
  const [customStart, setCustomStart] = useState("2026-08-01");
  const [customEnd, setCustomEnd] = useState("2026-08-07");
  const [activeTab, setActiveTab] = useState("Overview");
  const [modalType, setModalType] = useState<EntryMode | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [balanceCheckDialogOpen, setBalanceCheckDialogOpen] = useState(false);
  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null);
  const [balanceChecks, setBalanceChecks] = useState<BalanceCheck[]>([]);
  const [categoryDialog, setCategoryDialog] = useState<{ mode: "create" | "rename"; category?: string } | null>(null);
  const [toast, setToast] = useState("");
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  useEffect(() => { if (!isSupabaseConfigured) setSavingsGoal(localBudgetRepository.loadSavingsGoal()); }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const restoreTimer = window.setTimeout(() => {
      try {
        const parsedTransactions = localBudgetRepository.loadTransactions();
        if (parsedTransactions.length) {
            setTransactions(parsedTransactions.map((item) => {
              const transaction = item as Transaction;
              return { ...transaction, date: /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ? transaction.date : "2026-08-07" };
            }));
          }
      } catch {
        setStorageNotice("We could not read saved transactions, so WIW started with a fresh local view.");
      } finally {
        setTransactionsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (transactionsReady && !isSupabaseConfigured) localBudgetRepository.saveTransactions(transactions);
  }, [transactions, transactionsReady]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const storedCategories = localBudgetRepository.loadCategories();
    if (storedCategories.length) categories = storedCategories;
    setCategoryVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedBudgets = localBudgetRepository.loadBudgets();
        if (storedBudgets.length) setBudgets(storedBudgets as Budget[]);
      } catch {
        setStorageNotice("We could not read one or more saved budgets, so WIW started with a fresh local view.");
      } finally {
        setBudgetsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (budgetsReady && !isSupabaseConfigured) localBudgetRepository.saveBudgets(budgets);
  }, [budgets, budgetsReady]);

  useEffect(() => { if (!isSupabaseConfigured) setBalanceChecks(localBudgetRepository.loadBalanceChecks()); }, []);
  useEffect(() => { if (!isSupabaseConfigured) localBudgetRepository.saveBalanceChecks(balanceChecks); }, [balanceChecks]);
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const storedAccounts = localBudgetRepository.loadAccounts();
    if (storedAccounts.length) setAccounts(storedAccounts);
    setAccountsReady(true);
  }, []);
  useEffect(() => { if (accountsReady && !isSupabaseConfigured) localBudgetRepository.saveAccounts(accounts); }, [accounts, accountsReady]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !authenticated) return;
    let active = true;
    void supabaseBudgetRepository.load().then((snapshot) => {
      if (!active) return;
      if (snapshot.profile) {
        setProfileName(snapshot.profile.name);
        setCurrencyCode(snapshot.profile.currency);
        setPeriod(snapshot.profile.period);
        setStartingBalance(snapshot.profile.startingBalance);
        setSavingsGoal(snapshot.profile.savingsGoal);
      }
      categories = snapshot.categories.length ? snapshot.categories : [...defaultCategories];
      setCategoryVersion((version) => version + 1);
      setTransactions(snapshot.transactions);
      setBudgets(snapshot.budgets);
      setBalanceChecks(snapshot.balanceChecks);
      setAccounts(snapshot.accounts.length ? snapshot.accounts : initialAccounts);
      setTransactionsReady(true);
      setBudgetsReady(true);
      setAccountsReady(true);
      setCloudReady(true);
    }).catch((error: unknown) => {
      if (active) setStorageNotice(`We could not load your cloud data: ${describeCloudError(error)}`);
    });
    return () => { active = false; };
  }, [authenticated]);

  useEffect(() => {
    if (!isSupabaseConfigured || !cloudReady) return;
    void supabaseBudgetRepository.save({
      profile: { name: profileName, currency: currencyCode, period, startingBalance, savingsGoal },
      categories,
      transactions,
      budgets,
      balanceChecks,
      accounts,
    }).catch((error: unknown) => setStorageNotice(`We could not save your latest cloud changes: ${describeCloudError(error)}`));
  }, [cloudReady, profileName, currencyCode, period, startingBalance, savingsGoal, categoryVersion, transactions, budgets, balanceChecks, accounts]);

  const activeRange = useMemo(() => budgetDomain.reportRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const periodTransactions = useMemo(() => budgetDomain.transactionsInRange(transactions, activeRange), [transactions, activeRange]);
  const previousPeriodTransactions = useMemo(() => budgetDomain.transactionsInRange(transactions, budgetDomain.previousRange(activeRange)), [transactions, activeRange]);
  const totals = useMemo(() => budgetDomain.totalsFor(periodTransactions), [periodTransactions]);
  const spendingByCategory = useMemo(() => budgetDomain.spendingByCategoryFor(periodTransactions), [periodTransactions]);
  const budgetProgress = useMemo(() => budgetDomain.budgetProgressFor(budgets, spendingByCategory), [budgets, spendingByCategory]);
  const accountBalances = useMemo(() => budgetDomain.accountBalancesFor(accounts, transactions), [accounts, transactions]);
  const plannedTransactions = useMemo(() => periodTransactions.filter((item) => item.status === "planned"), [periodTransactions]);
  const plannedTotal = useMemo(() => plannedTransactions.reduce((sum, item) => sum + item.amount, 0), [plannedTransactions]);

  const previousSpending = budgetDomain.totalsFor(previousPeriodTransactions).spending;
  const spendingComparison = budgetDomain.spendingChange(totals.spending, previousSpending);
  const trendPoints = useMemo(() => budgetDomain.trendFor(transactions, activeRange), [transactions, activeRange]);
  const rangeKey = `${budgetDomain.isoDate(activeRange.start)}:${budgetDomain.isoDate(activeRange.end)}`;
  const savedBalanceCheck = balanceChecks.find((check) => check.accountId === undefined && `${check.periodStart}:${check.periodEnd}` === rangeKey);
  const balanceExpectation = budgetDomain.balanceExpectationFor(startingBalance, transactions, activeRange);
  const reconciliation = savedBalanceCheck ? budgetDomain.reconciliationFor(savedBalanceCheck.actualBalance, balanceExpectation) : null;
  const dashboardInsights = budgetDomain.insightsFor(periodTransactions, { range: activeRange, period, previousTransactions: previousPeriodTransactions, budgets, allTransactions: transactions, reconciliation });
  const dashboardInsight = dashboardInsights[0];

  function saveBalanceCheck(actualBalance: number) {
    const check = { id: savedBalanceCheck?.id || activeRange.start.getTime() + activeRange.end.getTime(), periodStart: budgetDomain.isoDate(activeRange.start), periodEnd: budgetDomain.isoDate(activeRange.end), actualBalance };
    setBalanceChecks((items) => [...items.filter((item) => item.id !== check.id && `${item.periodStart}:${item.periodEnd}` !== rangeKey), check]);
    setBalanceCheckDialogOpen(false);
    setToast("Balance check saved");
    window.setTimeout(() => setToast(""), 2800);
  }

  function saveAccountBalanceCheck(actualBalance: number) {
    if (!reconcilingAccount) return;
    const today = budgetDomain.isoDate(new Date());
    const check = { id: Date.now(), periodStart: today, periodEnd: today, actualBalance, accountId: reconcilingAccount.id };
    setBalanceChecks((items) => [...items.filter((item) => item.accountId !== check.accountId || item.periodStart !== today), check]);
    setReconcilingAccount(null);
    setToast(`${reconcilingAccount.name} checked`);
    window.setTimeout(() => setToast(""), 2800);
  }

  function addUntrackedSpending() {
    if (!reconciliation || reconciliation.difference >= 0) return;
    setTransactions((items) => [{ id: Date.now(), name: "Untracked spending adjustment", category: "Untracked spending", amount: Math.abs(reconciliation.difference), date: budgetDomain.isoDate(activeRange.end), type: "expense", icon: "?" }, ...items]);
    setToast("Untracked spending recorded");
    window.setTimeout(() => setToast(""), 2800);
  }

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const description = String(data.get("description") || "New transaction");
    const planned = modalType === "planned";
    const transactionType: Transaction["type"] = modalType === "planned" ? "expense" : modalType!;
    const category = modalType === "income" ? "Income" : modalType === "transfer" ? "Transfer" : String(data.get("category"));
    if (!amount || amount < 1 || !modalType) return;
    const accountId = Number(data.get("accountId"));
    setTransactions((items) => [{ id: Date.now(), name: description, category, amount, date: String(data.get("date") || new Date().toISOString().slice(0, 10)), type: transactionType, status: planned ? "planned" : "posted", accountId: Number.isFinite(accountId) ? accountId : undefined, icon: modalType === "income" ? "✦" : "●" }, ...items]);
    setModalType(null);
    setToast(planned ? "Planned expense added" : `${modalType === "income" ? "Income" : "Expense"} added successfully`);
    window.setTimeout(() => setToast(""), 2800);
  }

  function deleteTransaction(id: number) {
    if (!window.confirm("Delete this transaction? This cannot be undone in the current prototype.")) return;
    setTransactions((items) => items.filter((item) => item.id !== id));
    setToast("Transaction deleted");
    window.setTimeout(() => setToast(""), 2800);
  }

  function markPlannedExpensePaid(id: number) {
    setTransactions((items) => items.map((item) => item.id === id ? { ...item, status: "posted" } : item));
    setToast("Planned expense marked as paid");
    window.setTimeout(() => setToast(""), 2800);
  }

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const kind = String(data.get("kind")) as Account["kind"];
    const openingBalance = Number(data.get("openingBalance"));
    const creditLimit = Number(data.get("creditLimit"));
    const duplicateName = accounts.some((item) => item.id !== editingAccount?.id && item.name.toLowerCase() === name.toLowerCase());
    if (!name || duplicateName || !Number.isFinite(openingBalance) || !["cash", "bank", "credit_card"].includes(kind)) {
      setToast(duplicateName ? "An account with that name already exists" : "Enter a valid account");
      window.setTimeout(() => setToast(""), 2800);
      return;
    }
    const account = { id: editingAccount?.id || Date.now(), name, kind, openingBalance, creditLimit: kind === "credit_card" && Number.isFinite(creditLimit) ? Math.max(creditLimit, 0) : undefined };
    setAccounts((items) => editingAccount ? items.map((item) => item.id === editingAccount.id ? account : item) : [...items, account]);
    setAccountModalOpen(false);
    setEditingAccount(null);
    setToast(editingAccount ? "Account updated" : "Account added");
    window.setTimeout(() => setToast(""), 2800);
  }

  function deleteAccount(id: number) {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    const linked = transactions.some((item) => item.accountId === id || item.fromAccountId === id || item.toAccountId === id);
    if (linked) {
      setToast("Remove or reassign this account's transactions before deleting it");
      window.setTimeout(() => setToast(""), 3600);
      return;
    }
    if (!window.confirm(`Delete ${account.name}?`)) return;
    setAccounts((items) => items.filter((item) => item.id !== id));
    setToast("Account deleted");
    window.setTimeout(() => setToast(""), 2800);
  }

  function addTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const fromAccountId = Number(data.get("fromAccountId"));
    const toAccountId = Number(data.get("toAccountId"));
    if (!Number.isFinite(amount) || amount < 1 || fromAccountId === toAccountId) return;
    setTransactions((items) => [{ id: Date.now(), name: String(data.get("description") || "Transfer"), category: "Transfer", amount, date: String(data.get("date") || new Date().toISOString().slice(0, 10)), type: "transfer", status: "posted", fromAccountId, toAccountId, icon: "↔" }, ...items]);
    setModalType(null);
    setToast("Transfer recorded");
    window.setTimeout(() => setToast(""), 2800);
  }

  function updateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTransaction) return;
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const description = String(data.get("description") || "New transaction");
    const category = editingTransaction.type === "income" ? "Income" : editingTransaction.type === "transfer" ? "Transfer" : String(data.get("category"));
    if (!amount || amount < 1) return;
    const accountId = Number(data.get("accountId"));
    setTransactions((items) => items.map((item) => item.id === editingTransaction.id ? { ...item, name: description, amount, category, date: String(data.get("date") || item.date), accountId: Number.isFinite(accountId) ? accountId : undefined } : item));
    setEditingTransaction(null);
    setToast("Transaction updated");
    window.setTimeout(() => setToast(""), 2800);
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const category = String(data.get("category"));
    const limit = Number(data.get("limit"));
    if (!category || !Number.isFinite(limit) || limit < 1) return;
    const existing = budgets.find((budget) => budget.category === category && budget.id !== editingBudget?.id);
    if (existing) {
      setToast("A budget for that category already exists");
      window.setTimeout(() => setToast(""), 2800);
      return;
    }
    if (editingBudget) {
      setBudgets((items) => items.map((item) => item.id === editingBudget.id ? { ...item, category, limit } : item));
      setToast("Budget updated");
    } else {
      const visual = initialBudgets.find((item) => item.category === category);
      setBudgets((items) => [...items, { id: Date.now(), category, limit, icon: visual?.icon || "●", tone: visual?.tone || "blue" }]);
      setToast("Budget created");
    }
    setBudgetModalOpen(false);
    setEditingBudget(null);
    window.setTimeout(() => setToast(""), 2800);
  }

  function deleteBudget(id: number) {
    if (!window.confirm("Delete this budget?")) return;
    setBudgets((items) => items.filter((item) => item.id !== id));
    setToast("Budget deleted");
    window.setTimeout(() => setToast(""), 2800);
  }

  function saveCategory(name: string) {
    const cleanName = name.trim();
    if (!categoryDialog || !cleanName) return;
    if (categoryDialog.mode === "create") {
      categories = [...categories, cleanName];
      setToast(`${cleanName} category created`);
    } else if (categoryDialog.category) {
      categories = categories.map((item) => item === categoryDialog.category ? cleanName : item);
      setTransactions((items) => items.map((item) => item.category === categoryDialog.category ? { ...item, category: cleanName } : item));
      setToast("Category renamed");
    }
    localBudgetRepository.saveCategories(categories);
    setCategoryVersion((version) => version + 1);
    setCategoryDialog(null);
    window.setTimeout(() => setToast(""), 2800);
  }

  function deleteCategory(category: string) {
    if (defaultCategories.includes(category)) { setToast("Default categories cannot be deleted"); return; }
    if (transactions.some((item) => item.category === category)) { setToast("Move or rename existing transactions before deleting this category"); return; }
    if (!window.confirm(`Delete ${category}?`)) return;
    categories = categories.filter((item) => item !== category);
    localBudgetRepository.saveCategories(categories);
    setCategoryVersion((version) => version + 1);
  }

  async function signOut() {
    if (isSupabaseConfigured) await getSupabaseClient().auth.signOut();
    setAuthenticated(false);
  }

  if (!authenticated) return <AuthScreen mode={authMode} onModeChange={setAuthMode} onAuthenticate={() => setAuthenticated(true)} />;
  if (!transactionsReady || !budgetsReady || !accountsReady) return <LoadingScreen />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><small>Where It Went</small></div>
        <div className="workspace-label">YOUR MONEY</div>
        <nav aria-label="Main navigation">
          {[ ["Overview", "⌂"], ["Transactions", "↕"], ["Accounts", "▣"], ["Budgets", "◌"], ["Insights", "✦"] ].map(([name, icon]) => (
            <button className={`nav-item ${activeTab === name ? "active" : ""}`} aria-current={activeTab === name ? "page" : undefined} key={name} onClick={() => setActiveTab(name)}><span>{icon}</span>{name}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setActiveTab("Settings")}><span>⚙</span>Settings</button>
          <div className="profile"><div className="avatar">{profileName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{profileName}</strong><small>alex@email.com</small></div><button aria-label="Account options" onClick={() => setActiveTab("Settings")}>···</button></div>
        </div>
      </aside>

      <section className="content">
        {storageNotice && <div className="storage-notice" role="alert"><span>{storageNotice}</span><button onClick={() => setStorageNotice("")} aria-label="Dismiss message">×</button></div>}
        <header className="topbar">
          <div><p className="eyebrow">{activeTab === "Overview" ? "AUGUST 2026" : "YOUR MONEY"}</p><h1>{activeTab === "Overview" ? `Hello, ${profileName.split(" ")[0]}!` : activeTab}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications">♢<i /></button><button className="avatar mobile-avatar">AM</button></div>
        </header>

        {activeTab === "Overview" ? <>
          <section className="hero-row">
            <div><p className="intro">Here is how your money is looking.</p><div className="period-toggle" aria-label="Budget period">{periodOptions.map(([value, label]) => <button key={value} className={period === value ? "selected" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div>{period === "custom" && <div className="custom-range"><label>From<input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} /></label></div>}</div>
            <div className="add-actions"><button className="secondary-button" onClick={() => setModalType("income")}><span>＋</span>Add income</button><button className="secondary-button" onClick={() => setModalType("planned")}>＋ Plan expense</button><button className="primary-button" onClick={() => setModalType("expense")}><span>＋</span>Add expense</button></div>
          </section>

          <section className="summary-grid" aria-label="Financial summary">
            <article className="balance-card"><div className="card-kicker">AVAILABLE TO SPEND <span className="trend positive">↑ 12%</span></div><div className="balance-value">{peso(totals.balance)}</div><p>After your income and spending</p><div className="progress-track"><span style={{ width: `${Math.min(totals.savingsRate, 100)}%` }} /></div><div className="progress-label"><span>{totals.savingsRate}% saved</span><span>Goal: 30%</span></div></article>
            <article className="stat-card"><div className="stat-icon income-icon">↗</div><p>Income</p><strong>{peso(totals.income)}</strong><small className="positive">+5.2% <em>vs. last month</em></small></article>
            <article className="stat-card"><div className="stat-icon expense-icon">↘</div><p>Spent</p><strong>{peso(totals.spending)}</strong><small className={spendingComparison !== null && spendingComparison <= 0 ? "positive" : "negative"}>{spendingComparison === null ? "No prior-period data" : `${spendingComparison > 0 ? "+" : ""}${spendingComparison}%`} <em>{spendingComparison === null ? "to compare" : "vs. previous period"}</em></small></article>
            <article className="stat-card planned-stat"><div className="stat-icon">◌</div><p>Planned</p><strong>{peso(plannedTotal)}</strong><small>{plannedTransactions.length} upcoming · {peso(totals.balance - plannedTotal)} after plans</small></article>
          </section>

          <section className="panel balance-check-panel"><div className="panel-heading"><div><p className="eyebrow">BALANCE CHECK</p><h2>{reconciliation ? (reconciliation.difference === 0 ? "Everything matches" : "Money to reconcile") : "Check your real balance"}</h2></div><button className="secondary-button" onClick={() => setBalanceCheckDialogOpen(true)}>{reconciliation ? "Update" : "Check balance"}</button></div>{reconciliation ? <div><p className={reconciliation.difference === 0 ? "positive" : "negative"}>{reconciliation.difference === 0 ? "Your recorded and actual balances match." : `${peso(Math.abs(reconciliation.difference))} ${reconciliation.difference < 0 ? "is unaccounted for" : "more than expected"}.`}</p><p className="balance-check-copy">Expected {peso(reconciliation.expectedBalance)} · Actual {peso(reconciliation.actualBalance)}</p>{reconciliation.difference < 0 && <div className="add-actions"><button className="quiet-button" onClick={addUntrackedSpending}>Record untracked spending</button><button className="quiet-button" onClick={() => setModalType("expense")}>Add missed expense</button></div>}{reconciliation.difference > 0 && <button className="quiet-button" onClick={() => setModalType("income")}>Add missed income</button>}</div> : <p className="balance-check-copy">Tell WIW how much money you actually have. We will compare it with {peso(balanceExpectation.expectedBalance)} expected from your recorded money moves.</p>}</section>

          <section className="dashboard-grid">
<article className="panel spending-panel"><div className="panel-heading"><div><h2>Spending breakdown</h2><p>Where your money went: {periodOptions.find(([value]) => value === period)?.[1].toLowerCase()}</p></div><button className="quiet-button" onClick={() => setActiveTab("Insights")}>View details <span>→</span></button></div><div className="breakdown-content"><div className="donut" style={{ background: `conic-gradient(#436fce 0 49%, #ff8a7b 49% 74%, #7895e6 74% 89%, #9f8be0 89% 100%)` }}><div><strong>{peso(totals.spending)}</strong><small>spent</small></div></div><div className="legend">{spendingByCategory.slice(0, 4).map(([category, amount], index) => <div key={category}><span className={`legend-dot dot-${index}`} /><p>{category}<small>{budgetDomain.percentageOf(amount, totals.spending)}% of spending</small></p><strong>{peso(amount)}</strong></div>)}</div></div></article>
            <article className="panel insight-panel"><div className="sparkle">✦</div><div className="panel-heading"><div><p className="eyebrow">WIW INSIGHTS</p><h2>{dashboardInsight.title}</h2></div><button className="icon-button soft" aria-label="More insights" onClick={() => setActiveTab("Insights")}>···</button></div>{dashboardInsights.slice(0, 3).map((insight, index) => <div className="insight-summary" key={insight.title}><p className={index === 0 ? "insight-copy" : "insight-evidence"}>{insight.detail}</p>{insight.recommendation && <div className="insight-tip"><span>✦</span><p><strong>Next step</strong>{insight.recommendation}</p></div>}</div>)}<button className="text-link" onClick={() => setActiveTab("Insights")}>See all insights <span>→</span></button></article>
          </section>

          <section className="panel trend-panel"><div className="panel-heading"><div><h2>Spending pulse</h2><p>Daily expenses ending {displayDate(budgetDomain.isoDate(activeRange.end))}</p></div><strong>{peso(totals.spending)} <small>in selected range</small></strong></div><div className="trend-bars" aria-label="Seven day expense trend">{trendPoints.map((point, index) => <div className="trend-bar" key={`${point.label}-${index}`}><span className="trend-value">{point.amount ? peso(point.amount) : "—"}</span><i style={{ height: `${point.height}%` }} /><small>{point.label}</small></div>)}</div></section>

          <section className="bottom-grid">
            <article className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest money moves</p></div><button className="quiet-button" onClick={() => setActiveTab("Transactions")}>See all <span>→</span></button></div><div className="transaction-list">{periodTransactions.length ? periodTransactions.slice(0, 5).map((item) => <div className="transaction" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.status === "planned" ? "Planned · " : ""}{item.category} · {displayDate(item.date)}</small></div><b className={item.status === "planned" ? "planned" : item.type}>{item.type === "income" ? "+" : "−"}{peso(item.amount)}</b>{item.status === "planned" && <button className="quiet-button" onClick={() => markPlannedExpensePaid(item.id)}>Mark paid</button>}</div>) : <div className="dashboard-empty"><span>◎</span><p>No activity in this period yet.</p><button className="text-link" onClick={() => setModalType("expense")}>Add an expense <span>→</span></button></div>}</div></article>
<article className="panel budget-panel"><div className="panel-heading"><div><h2>Budget check-in</h2><p>Your monthly limits</p></div><button className="quiet-button" onClick={() => setActiveTab("Budgets")}>Manage <span>→</span></button></div>{budgetProgress.length ? budgetProgress.slice(0, 2).map((budget) => <div key={budget.id}><div className="budget-row"><div><span className={`budget-icon ${budget.tone === "blue" ? "blue" : ""}`}>{budget.icon}</span><p><strong>{budget.category}</strong><small>{peso(budget.spent)} of {peso(budget.limit)}</small></p></div><span className="budget-percent">{budget.percent}%</span></div><div className={`budget-bar ${budget.tone === "blue" ? "blue" : ""}`}><i style={{ width: `${Math.min(budget.percent, 100)}%` }} /></div></div>) : <div className="dashboard-empty"><p>No budgets yet.</p><button className="text-link" onClick={() => setActiveTab("Budgets")}>Create a budget <span>→</span></button></div>}</article>
          </section>
        </> : activeTab === "Budgets" ? <BudgetView budgets={budgetProgress} onCreate={() => { setEditingBudget(null); setBudgetModalOpen(true); }} onCreateCategory={() => setCategoryDialog({ mode: "create" })} onRenameCategory={(category) => setCategoryDialog({ mode: "rename", category })} onDeleteCategory={deleteCategory} onEdit={(budget) => { setEditingBudget(budget); setBudgetModalOpen(true); }} onDelete={deleteBudget} /> : activeTab === "Accounts" ? <AccountsView accounts={accountBalances} balanceChecks={balanceChecks} transactions={transactions} onAddAccount={() => { setEditingAccount(null); setAccountModalOpen(true); }} onEdit={(account) => { setEditingAccount(account); setAccountModalOpen(true); }} onDelete={deleteAccount} onCheck={(account) => setReconcilingAccount(account)} onTransfer={() => setModalType("transfer")} /> : <SecondaryView activeTab={activeTab} transactions={transactions} insightTransactions={periodTransactions} previousInsightTransactions={previousPeriodTransactions} insightRange={activeRange} budgets={budgets} reconciliation={reconciliation} totals={totals} spendingByCategory={spendingByCategory} profileName={profileName} currencyCode={currencyCode} defaultPeriod={period} startingBalance={startingBalance} savingsGoal={savingsGoal} onSaveSavingsGoal={(amount) => { setSavingsGoal(amount); if (!isSupabaseConfigured) localBudgetRepository.saveSavingsGoal(amount); }} onSaveSettings={(name, currency, nextPeriod, nextStartingBalance) => { setProfileName(name); setCurrencyCode(currency); if (nextPeriod) setPeriod(nextPeriod); if (typeof nextStartingBalance === "number") setStartingBalance(nextStartingBalance); }} onReturn={() => setActiveTab("Overview")} onAddExpense={() => setModalType("expense")} onAddIncome={() => setModalType("income")} onSignOut={() => void signOut()} onDeleteTransaction={deleteTransaction} onEditTransaction={setEditingTransaction} />}
      </section>

      {modalType === "transfer" && <TransferModal accounts={accounts} onClose={() => setModalType(null)} onSubmit={addTransfer} />}
      {(modalType && modalType !== "transfer" || editingTransaction) && <ValidatedTransactionModal accounts={accounts} type={editingTransaction?.status === "planned" ? "planned" : editingTransaction?.type || modalType!} transaction={editingTransaction || undefined} onClose={() => { setModalType(null); setEditingTransaction(null); }} onSubmit={editingTransaction ? updateTransaction : addTransaction} />}
      {accountModalOpen && <AccountModal account={editingAccount || undefined} onClose={() => { setAccountModalOpen(false); setEditingAccount(null); }} onSubmit={saveAccount} />}
      {budgetModalOpen && <ValidatedBudgetModal budget={editingBudget || undefined} onClose={() => { setBudgetModalOpen(false); setEditingBudget(null); }} onSubmit={saveBudget} />}
      {balanceCheckDialogOpen && <BalanceCheckModal expectedBalance={balanceExpectation.expectedBalance} actualBalance={savedBalanceCheck?.actualBalance} onClose={() => setBalanceCheckDialogOpen(false)} onSubmit={saveBalanceCheck} />}
      {reconcilingAccount && <AccountBalanceCheckModal account={reconcilingAccount} transactions={transactions} existingCheck={balanceChecks.filter((item) => item.accountId === reconcilingAccount.id).sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))[0]} onClose={() => setReconcilingAccount(null)} onSubmit={saveAccountBalanceCheck} />}
      {categoryDialog && <CategoryModal category={categoryDialog.category} categories={categories} onClose={() => setCategoryDialog(null)} onSubmit={saveCategory} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function LoadingScreen() {
  return <main className="loading-screen" role="status" aria-live="polite"><span className="brand-mark" aria-hidden="true" /><p>Loading your money picture…</p></main>;
}

function BudgetView({ budgets, onCreate, onCreateCategory, onRenameCategory, onDeleteCategory, onEdit, onDelete }: { budgets: (Budget & { spent: number; percent: number; remaining: number })[]; onCreate: () => void; onCreateCategory: () => void; onRenameCategory: (category: string) => void; onDeleteCategory: (category: string) => void; onEdit: (budget: Budget) => void; onDelete: (id: number) => void }) {
  void onRenameCategory;
  void onDeleteCategory;
  const summary = budgetDomain.budgetSummaryFor(budgets);
return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">SPEND WITH INTENTION</p><h2>Your budgets</h2><p>Set a limit for the things that matter and see your pace.</p></div><div className="add-actions"><button className="secondary-button" onClick={onCreateCategory}>＋ Category</button><button className="primary-button" onClick={onCreate}>＋ Create budget</button></div></div><div className="budget-overview"><div><span>Budget progress</span><strong>{peso(summary.spent)}</strong><small>of {peso(summary.allocated)} planned</small></div><div className="budget-overview-bar"><i style={{ width: `${Math.min(summary.percent, 100)}%` }} /></div><p><strong>{summary.percent}%</strong> used so far</p></div><div className="budget-cards">{budgets.length ? budgets.map((budget) => <article className="budget-card" key={budget.id}><span className={`budget-card-icon ${budget.tone}`}>{budget.icon}</span><div className="budget-card-heading"><h3>{budget.category}</h3><div><button onClick={() => onEdit(budget)} aria-label={`Edit ${budget.category} budget`}>Edit</button><button onClick={() => onDelete(budget.id)} aria-label={`Delete ${budget.category} budget`}>Delete</button></div></div><p>{peso(budget.spent)} of {peso(budget.limit)}</p><div className="budget-bar"><i style={{ width: `${Math.min(budget.percent, 100)}%` }} /></div><div><small>{budget.percent}% used</small><strong>{peso(budget.remaining)} {budget.spent > budget.limit ? "over" : "left"}</strong></div></article>) : <div className="transaction-empty"><span>◉</span><h3>No budgets yet</h3><p>Create a category limit to start tracking your pace.</p><button className="primary-button" onClick={onCreate}>Create budget</button></div>}</div><section className="category-manager"><div><p className="eyebrow">CATEGORIES</p><h3>Expense categories</h3></div><div className="category-list">{categories.map((category) => <div key={category}><span>{category}</span><button onClick={() => onRenameCategory(category)}>Rename</button>{!defaultCategories.includes(category) && <button onClick={() => onDeleteCategory(category)}>Delete</button>}</div>)}</div></section></section>;
}

function AccountsView({ accounts, balanceChecks, transactions, onAddAccount, onEdit, onDelete, onCheck, onTransfer }: { accounts: budgetDomain.AccountBalance[]; balanceChecks: BalanceCheck[]; transactions: Transaction[]; onAddAccount: () => void; onEdit: (account: Account) => void; onDelete: (id: number) => void; onCheck: (account: Account) => void; onTransfer: () => void }) {
  return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">YOUR MONEY LOCATIONS</p><h2>Accounts & transfers</h2><p>Track cash, bank money, and credit-card debt without counting payments twice.</p></div><div className="add-actions"><button className="secondary-button" onClick={onAddAccount}>+ Add account</button><button className="primary-button" onClick={onTransfer}>Transfer / pay card</button></div></div><div className="budget-cards">{accounts.map((account) => { const expectation = budgetDomain.accountExpectationFor(account, transactions); const latest = balanceChecks.filter((item) => item.accountId === account.id).sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))[0]; const difference = latest ? latest.actualBalance - expectation.expectedBalance : null; return <article className="budget-card account-card" key={account.id}><div className="budget-card-heading"><h3>{account.name}</h3><div className="account-card-actions"><small>{account.kind === "credit_card" ? "Credit card" : account.kind === "bank" ? "Bank" : "Cash"}</small><button onClick={() => onEdit(account)} aria-label={`Edit ${account.name}`}>Edit</button><button onClick={() => onDelete(account.id)} aria-label={`Delete ${account.name}`}>Delete</button></div></div>{account.kind === "credit_card" ? <><p>{peso(account.amountOwed)} owed</p><div className="account-figures"><small>Available credit</small><strong>{peso(account.availableCredit)}</strong></div></> : <><p>Current balance</p><strong className="account-balance">{peso(account.balance)}</strong></>}<div className="account-reconcile"><button className="quiet-button" onClick={() => onCheck(account)}>{latest ? "Update check" : "Check balance"}</button>{difference !== null && <small className={difference === 0 ? "positive" : "negative"}>{difference === 0 ? "Matches statement" : `${peso(Math.abs(difference))} to reconcile`}</small>}</div></article>; })}</div><p className="balance-check-copy">Card purchases count as spending once. Use a transfer from your bank to the card when paying its bill. Check each account against its statement to catch missed activity.</p></section>;
}

function AccountModal({ account, onClose, onSubmit }: { account?: Account; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(account);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editing ? "Edit account" : "Add account"}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close account dialog" /><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT ACCOUNT" : "NEW ACCOUNT"}</p><h2>{editing ? "Edit account" : "Add an account"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><label>Name<input name="name" defaultValue={account?.name} required /></label>{editing && <input type="hidden" name="kind" value={account?.kind} />}<label>Type<select name={editing ? undefined : "kind"} defaultValue={account?.kind || "bank"} disabled={editing}><option value="bank">Bank</option><option value="cash">Cash</option><option value="credit_card">Credit card</option></select></label>{editing && <p className="modal-help">Account type cannot be changed after transactions have been recorded.</p>}<label>{account?.kind === "credit_card" ? "Opening amount owed" : "Opening balance"}<input name="openingBalance" type="number" min="0" step="1" defaultValue={account?.openingBalance || 0} required /></label>{(account?.kind === "credit_card" || !editing) && <label>Credit limit<input name="creditLimit" type="number" min="0" step="1" defaultValue={account?.creditLimit || 0} /></label>}<button className="primary-button full" type="submit">{editing ? "Save account" : "Add account"}</button></form></div>;
}

function TransferModal({ accounts, onClose, onSubmit }: { accounts: Account[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Transfer money"><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close transfer dialog" /><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">TRANSFER</p><h2>Move money or pay a card</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><p className="modal-help">Transfers do not count as income or spending.</p><label>Description<input name="description" defaultValue="Credit card payment" required /></label><label>From<select name="fromAccountId">{accounts.filter((account) => account.kind !== "credit_card").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>To<select name="toAccountId">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Amount<input name="amount" type="number" min="1" step="1" required /></label><label>Date<input name="date" type="date" defaultValue="2026-08-07" required /></label><button className="primary-button full" type="submit">Record transfer</button></form></div>;
}

function SecondaryView({ activeTab, transactions, insightTransactions, previousInsightTransactions, insightRange, budgets, reconciliation, totals, spendingByCategory, profileName, currencyCode, defaultPeriod, startingBalance, savingsGoal, onSaveSavingsGoal, onSaveSettings, onReturn, onAddExpense: addExpense, onAddIncome, onSignOut, onDeleteTransaction, onEditTransaction }: { activeTab: string; transactions: Transaction[]; insightTransactions: Transaction[]; previousInsightTransactions: Transaction[]; insightRange: budgetDomain.DateRange; budgets: Budget[]; reconciliation: ReturnType<typeof budgetDomain.reconciliationFor> | null; totals: { income: number; spending: number; balance: number; savingsRate: number }; spendingByCategory: [string, number][]; profileName: string; currencyCode: string; defaultPeriod: (typeof periodOptions)[number][0]; startingBalance: number; savingsGoal: number | null; onSaveSavingsGoal: (amount: number) => void; onSaveSettings: (name: string, currency: string, period?: (typeof periodOptions)[number][0], startingBalance?: number) => void; onReturn: () => void; onAddExpense: () => void; onAddIncome: () => void; onSignOut: () => void; onDeleteTransaction: (id: number) => void; onEditTransaction: (transaction: Transaction) => void }) {
  void defaultPeriod;
  void totals;
  void spendingByCategory;
  const [transactionFilter, setTransactionFilter] = useState<"all" | "income" | "expense">("all");
  const [transactionQuery, setTransactionQuery] = useState("");
  const onAddExpense = transactionFilter === "income" ? onAddIncome : addExpense;
  const [transactionSort, setTransactionSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  function saveSavingsGoal(amount: number) {
    onSaveSavingsGoal(amount);
    setGoalDialogOpen(false);
  }
  const liveInsights = budgetDomain.insightsFor(insightTransactions, { range: insightRange, period: defaultPeriod, previousTransactions: previousInsightTransactions, budgets, allTransactions: transactions, reconciliation, savingsGoal }).map((insight) => ({ ...insight, detail: `${insight.detail} Evidence: ${insight.evidence} Based on: ${insight.calculationBasis}` }));
  const visibleTransactions = transactions.filter((item) => (transactionFilter === "all" || item.type === transactionFilter) && `${item.name} ${item.category}`.toLowerCase().includes(transactionQuery.toLowerCase())).sort((left, right) => {
    if (transactionSort === "highest") return right.amount - left.amount;
    if (transactionSort === "lowest") return left.amount - right.amount;
    return transactionSort === "newest" ? right.date.localeCompare(left.date) : left.date.localeCompare(right.date);
  });
if (activeTab === "Transactions") return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">MONEY MOVES</p><h2>All transactions</h2><p>Everything you have earned and spent this month.</p></div><button className="primary-button" onClick={onAddExpense}>{transactionFilter === "income" ? "＋ Add income" : "＋ Add expense"}</button></div><div className="transaction-filters">{([ ["all", "All activity"], ["income", "Income"], ["expense", "Expenses"] ] as const).map(([filter, label]) => <button key={filter} className={transactionFilter === filter ? "filter-active" : ""} onClick={() => setTransactionFilter(filter)}>{label}</button>)}<input aria-label="Search transactions" value={transactionQuery} onChange={(event) => setTransactionQuery(event.target.value)} placeholder="Search transactions" /><select aria-label="Sort transactions" value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as "newest" | "oldest" | "highest" | "lowest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></div><div className="full-transaction-list">{visibleTransactions.length ? visibleTransactions.map((item) => <div className="transaction transaction-wide" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.category} · {displayDate(item.date)}</small></div><span className="transaction-type">{item.type === "income" ? "Income" : "Expense"}</span><b className={item.type}>{item.type === "income" ? "+" : "−"}{peso(item.amount)}</b><button className="edit-transaction" onClick={() => onEditTransaction(item)} aria-label={`Edit ${item.name}`}>⌕</button><button className="delete-transaction" onClick={() => onDeleteTransaction(item.id)} aria-label={`Delete ${item.name}`}>×</button></div>) : <div className="transaction-empty"><span>◎</span><h3>{transactions.length ? "No matching transactions" : "No transactions yet"}</h3><p>{transactions.length ? "Try another filter or search term." : "Add your first expense to start seeing where it went."}</p>{!transactions.length && <button className="primary-button" onClick={onAddExpense}>{transactionFilter === "income" ? "Add income" : "Add expense"}</button>}</div>}</div></section>;
if (activeTab === "Insights") return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">THE WIW VIEW</p><h2>Where it went</h2><p>Clear signals based on your selected transactions.</p></div><button className="secondary-button" onClick={onReturn}>← Overview</button></div><div className="insight-grid">{liveInsights.map((insight) => <article className={`insight-feature ${insight.tone === "attention" ? "accent" : ""}`} key={insight.title}><p className="eyebrow">WIW INSIGHT</p><h3>{insight.title}</h3><p>{insight.detail}</p>{insight.recommendation && <p><strong>Next step:</strong> {insight.recommendation}</p>}</article>)}</div><article className="suggestion-panel"><div><span>✦</span><div><p className="eyebrow">SAVINGS GOAL</p><h3>Give your next peso a purpose</h3><p>{savingsGoal ? `${peso(Math.max(totals.balance, 0))} of ${peso(savingsGoal)} available toward your goal.` : "Create a monthly savings goal and use your spending insights to stay on pace."}</p></div></div><button className="primary-button" onClick={() => setGoalDialogOpen(true)}>{savingsGoal ? "Update savings goal" : "Set a savings goal"}</button></article>{goalDialogOpen && <SavingsGoalModal goal={savingsGoal || undefined} onClose={() => setGoalDialogOpen(false)} onSubmit={saveSavingsGoal} />}</section>;
  return <SettingsPanel profileName={profileName} currencyCode={currencyCode} defaultPeriod={defaultPeriod} startingBalance={startingBalance} onSave={onSaveSettings} onSignOut={onSignOut} />;
}

function SettingsPanel({ profileName, currencyCode, defaultPeriod, startingBalance, onSave, onSignOut }: { profileName: string; currencyCode: string; defaultPeriod: (typeof periodOptions)[number][0]; startingBalance: number; onSave: (name: string, currency: string, period?: (typeof periodOptions)[number][0], startingBalance?: number) => void; onSignOut: () => void }) {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); const currency = String(data.get("currency") || "PHP"); const period = String(data.get("period") || "month") as (typeof periodOptions)[number][0]; const nextStartingBalance = Number(data.get("startingBalance") || 0); if (!name || !Number.isFinite(nextStartingBalance) || nextStartingBalance < 0) return; onSave(name, currency, period, nextStartingBalance); localBudgetRepository.saveProfile(name, currency, period, nextStartingBalance); setNotice("Preferences saved"); }
return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">PREFERENCES</p><h2>Settings</h2><p>Personalize WIW for the way you budget.</p></div></div><form className="settings-card" onSubmit={submit}><h3>Profile and display</h3><label>Display name<input name="name" defaultValue={profileName} required /></label><label>Currency<select name="currency" defaultValue={currencyCode}><option value="PHP">Philippine peso (₱)</option><option value="USD">US dollar ($)</option></select></label><label>Starting balance<input name="startingBalance" type="number" min="0" step="1" defaultValue={startingBalance} /></label><label>Default budget period<select name="period" defaultValue={defaultPeriod}><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></select></label>{notice && <p className="auth-message" role="status">{notice}</p>}<button className="primary-button" type="submit">Save preferences</button><button className="signout-button" type="button" onClick={onSignOut}>Sign out</button></form></section>;
}

function AuthScreen({ mode, onModeChange, onAuthenticate }: { mode: "signin" | "register"; onModeChange: (mode: "signin" | "register") => void; onAuthenticate: () => void }) {
  const registering = mode === "register";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) { onAuthenticate(); return; }
    setError(""); setNotice(""); setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    const displayName = String(data.get("displayName") || "");
    const supabase = getSupabaseClient();
    const result = registering
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (result.error) { setError(result.error.message); return; }
    if (registering && !result.data.session) setNotice("Check your email to confirm your account, then sign in.");
    else onAuthenticate();
  }
  async function resetPassword() {
    if (!isSupabaseConfigured) { setNotice("Password recovery will be available after Supabase is connected."); return; }
    const email = window.prompt("Enter your email address for a reset link.");
    if (!email) return;
    const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (resetError) setError(resetError.message); else setNotice("Check your email for a password reset link.");
  }
  return <main className="auth-page"><section className="auth-intro"><div className="auth-brand"><span className="auth-mark" /><small>Where It Went</small></div><div><p className="eyebrow">WHERE IT WENT</p><h1>Feel clear about your money.</h1><p>See every money move, understand your patterns, and make your next decision feel easier.</p></div><div className="auth-insight-card"><span>✦</span><p><strong>Built for calm clarity</strong>Your money story, in one simple place.</p></div></section><section className="auth-form-side"><form className="auth-form" onSubmit={(event) => void submit(event)}><div><p className="eyebrow">WELCOME TO WIW</p><h2>{registering ? "Create your account" : "Welcome back"}</h2><p>{registering ? "Start building a clearer money picture today." : "Sign in to see where it went."}</p></div>{registering && <label>Name<input name="displayName" placeholder="Your name" required /></label>}<label>Email<input name="email" type="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>{!registering && <button type="button" className="forgot-button" onClick={() => void resetPassword()}>Forgot password?</button>}{error && <p className="auth-message error" role="alert">{error}</p>}{notice && <p className="auth-message" role="status">{notice}</p>}<button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : registering ? "Create account" : "Sign in"}</button><p className="auth-switch">{registering ? "Already have an account?" : "New to WIW?"} <button type="button" onClick={() => onModeChange(registering ? "signin" : "register")}>{registering ? "Sign in" : "Create an account"}</button></p>{!isSupabaseConfigured && <small className="demo-note">Prototype mode — connect Supabase to enable secure accounts and cloud data.</small>}</form></section></main>;
}

// Kept temporarily while the validated dialog replaces this original prototype component.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TransactionModal({ type, transaction, onClose, onSubmit }: { type: Transaction["type"]; transaction?: Transaction; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(transaction);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Add"} ${type}`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close transaction dialog" /><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} {type.toUpperCase()}</p><h2>{editing ? "Edit" : "Add"} {type}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div><label>Description<input name="description" defaultValue={transaction?.name} placeholder={type === "income" ? "e.g. Freelance project" : "e.g. Grocery run"} required /></label><label>Amount<input name="amount" type="number" defaultValue={transaction?.amount} min="1" step="1" placeholder="0" required /></label>{type === "expense" && <label>Category<select name="category" defaultValue={transaction?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>}<label>Date<input name="date" type="date" defaultValue="2026-08-07" /></label><button className="primary-button full" type="submit">{editing ? "Save changes" : `Add ${type}`}</button></form></div>;
}

function CategoryModal({ category, categories: existingCategories, onClose, onSubmit }: { category?: string; categories: string[]; onClose: () => void; onSubmit: (name: string) => void }) {
  const [error, setError] = useState("");
  const editing = Boolean(category);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    if (!name) { setError("Enter a category name."); return; }
    if (existingCategories.some((item) => item.toLowerCase() === name.toLowerCase() && item !== category)) { setError("That category already exists."); return; }
    onSubmit(name);
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Rename" : "Create"} category`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close category dialog" /><form className="transaction-modal category-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "RENAME" : "NEW"} CATEGORY</p><h2>{editing ? "Rename category" : "Create a category"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><p className="modal-help">Use a clear name so your spending is easy to understand later.</p><label>Category name<input name="name" defaultValue={category} placeholder="e.g. Pet care" onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">{editing ? "Save category" : "Create category"}</button></form></div>;
}

function SavingsGoalModal({ goal, onClose, onSubmit }: { goal?: number; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    if (!Number.isFinite(amount) || amount < 1) { setError("Enter a savings goal of at least PHP 1."); return; }
    onSubmit(amount);
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Savings goal"><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close savings goal dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">SAVINGS GOAL</p><h2>{goal ? "Update savings goal" : "Set a savings goal"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><p className="modal-help">Set the amount you would like to keep aside this month.</p><label>Goal amount<input name="amount" type="number" min="1" step="1" defaultValue={goal} placeholder="5000" onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">Save goal</button></form></div>;
}

function BalanceCheckModal({ expectedBalance, actualBalance, onClose, onSubmit }: { expectedBalance: number; actualBalance?: number; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("actualBalance"));
    if (!Number.isFinite(amount) || amount < 0) { setError("Enter the actual amount you have, using zero if it is empty."); return; }
    onSubmit(amount);
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Balance check"><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close balance check dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">BALANCE CHECK</p><h2>Compare your real balance</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><p className="modal-help">WIW expects {peso(expectedBalance)} based on your starting balance and recorded money moves.</p><label>Actual money available<input name="actualBalance" type="number" min="0" step="1" defaultValue={actualBalance} placeholder="0" onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">Save balance check</button></form></div>;
}

function AccountBalanceCheckModal({ account, transactions, existingCheck, onClose, onSubmit }: { account: Account; transactions: Transaction[]; existingCheck?: BalanceCheck; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [error, setError] = useState("");
  const expectation = budgetDomain.accountExpectationFor(account, transactions);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("actualBalance"));
    if (!Number.isFinite(amount) || amount < 0) { setError("Enter the real amount from your statement, using zero if it is empty."); return; }
    onSubmit(amount);
  }
  const isCard = account.kind === "credit_card";
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Check ${account.name}`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close account check dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">ACCOUNT CHECK</p><h2>Check {account.name}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><p className="modal-help">WIW expects a {expectation.label} of {peso(expectation.expectedBalance)} from this account&apos;s recorded activity.</p><label>{isCard ? "Actual amount owed" : "Actual account balance"}<input name="actualBalance" type="number" min="0" step="1" defaultValue={existingCheck?.actualBalance} placeholder="0" onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">Save account check</button></form></div>;
}

function ValidatedTransactionModal({ accounts, type, transaction, onClose, onSubmit }: { accounts: Account[]; type: EntryMode; transaction?: Transaction; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(transaction);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") || "").trim();
    const amount = Number(data.get("amount"));
    const date = String(data.get("date") || "");
    if (!description) { setError("Add a short description so you can recognize this entry."); return; }
    if (!Number.isFinite(amount) || amount < 1) { setError("Enter an amount of at least PHP 1."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError("Choose a valid date."); return; }
    setError("");
    onSubmit(event);
  }
  const planned = type === "planned";
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Add"} ${type}`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close transaction dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} {planned ? "PLANNED EXPENSE" : type.toUpperCase()}</p><h2>{editing ? "Edit" : "Add"} {planned ? "planned expense" : type}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div>{planned && <p className="modal-help">This stays out of actual spending and budgets until you mark it paid.</p>}<label>Description<input name="description" defaultValue={transaction?.name} placeholder={type === "income" ? "e.g. Freelance project" : "e.g. Grocery run"} onChange={() => setError("")} required /></label><label>Amount<input name="amount" type="number" defaultValue={transaction?.amount} min="1" step="1" placeholder="0" onChange={() => setError("")} required /></label>{(type === "expense" || planned) && <label>Category<select name="category" defaultValue={transaction?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>}<label>Account<select name="accountId" defaultValue={transaction?.accountId || accounts[0]?.id} disabled={!accounts.length}><option value="">{accounts.length ? "Select an account" : "Add an account first"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>{planned ? "Expected date" : "Date"}<input name="date" type="date" defaultValue={transaction?.date || "2026-08-07"} onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">{editing ? "Save changes" : planned ? "Add planned expense" : `Add ${type}`}</button></form></div>;
}

function ValidatedBudgetModal({ budget, onClose, onSubmit }: { budget?: Budget; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(budget);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limit = Number(new FormData(event.currentTarget).get("limit"));
    if (!Number.isFinite(limit) || limit < 1) { setError("Enter a monthly limit of at least PHP 1."); return; }
    setError("");
    onSubmit(event);
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Create"} budget`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close budget dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} BUDGET</p><h2>{editing ? "Edit budget" : "Create budget"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><label>Category<select name="category" defaultValue={budget?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Monthly limit<input name="limit" type="number" defaultValue={budget?.limit} min="1" step="1" placeholder="0" onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">{editing ? "Save changes" : "Create budget"}</button></form></div>;
}

// Kept temporarily while the validated dialog replaces this original prototype component.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BudgetModal({ budget, onClose, onSubmit }: { budget?: Budget; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(budget);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Create"} budget`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close budget dialog" /><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} BUDGET</p><h2>{editing ? "Edit budget" : "Create budget"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div><label>Category<select name="category" defaultValue={budget?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Monthly limit<input name="limit" type="number" defaultValue={budget?.limit} min="1" step="1" placeholder="0" required /></label><button className="primary-button full" type="submit">{editing ? "Save changes" : "Create budget"}</button></form></div>;
}
