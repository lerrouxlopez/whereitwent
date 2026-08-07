"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import * as budgetDomain from "./lib/budget";

type Transaction = budgetDomain.Transaction;
type Budget = budgetDomain.Budget;

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

const categories = ["Food & groceries", "Dining out", "Transport", "Bills & utilities", "Subscriptions", "Shopping", "Health", "Other"];
const transactionStorageKey = "wiw:transactions:v1";
const budgetStorageKey = "wiw:budgets:v1";
const initialBudgets: Budget[] = [
  { id: 1, category: "Dining out", limit: 3000, icon: "☕", tone: "peach" },
  { id: 2, category: "Transport", limit: 4500, icon: "◈", tone: "blue" },
  { id: 3, category: "Food & groceries", limit: 7500, icon: "🛒", tone: "purple" },
];
const periodOptions = [
  ["today", "Today"], ["week", "This week"], ["biweekly", "Bi-weekly"], ["month", "This month"], ["year", "This year"], ["custom", "Custom"],
] as const;

function peso(value: number) {
  return budgetDomain.formatCurrency(value);
}

function displayDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(parsed);
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [budgetsReady, setBudgetsReady] = useState(false);
  const [period, setPeriod] = useState<(typeof periodOptions)[number][0]>("month");
  const [customStart, setCustomStart] = useState("2026-08-01");
  const [customEnd, setCustomEnd] = useState("2026-08-07");
  const [activeTab, setActiveTab] = useState("Overview");
  const [modalType, setModalType] = useState<"income" | "expense" | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedTransactions = window.localStorage.getItem(transactionStorageKey);
        if (storedTransactions) {
          const parsedTransactions: unknown = JSON.parse(storedTransactions);
          if (Array.isArray(parsedTransactions)) {
            setTransactions(parsedTransactions.map((item) => {
              const transaction = item as Transaction;
              return { ...transaction, date: /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ? transaction.date : "2026-08-07" };
            }));
          }
        }
      } catch {
        window.localStorage.removeItem(transactionStorageKey);
      } finally {
        setTransactionsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (transactionsReady) window.localStorage.setItem(transactionStorageKey, JSON.stringify(transactions));
  }, [transactions, transactionsReady]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedBudgets = window.localStorage.getItem(budgetStorageKey);
        if (storedBudgets) {
          const parsedBudgets: unknown = JSON.parse(storedBudgets);
          if (Array.isArray(parsedBudgets)) setBudgets(parsedBudgets as Budget[]);
        }
      } catch {
        window.localStorage.removeItem(budgetStorageKey);
      } finally {
        setBudgetsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (budgetsReady) window.localStorage.setItem(budgetStorageKey, JSON.stringify(budgets));
  }, [budgets, budgetsReady]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => subscription.subscription.unsubscribe();
  }, []);

  const activeRange = useMemo(() => budgetDomain.reportRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const periodTransactions = useMemo(() => budgetDomain.transactionsInRange(transactions, activeRange), [transactions, activeRange]);
  const previousPeriodTransactions = useMemo(() => budgetDomain.transactionsInRange(transactions, budgetDomain.previousRange(activeRange)), [transactions, activeRange]);
  const totals = useMemo(() => budgetDomain.totalsFor(periodTransactions), [periodTransactions]);
  const spendingByCategory = useMemo(() => budgetDomain.spendingByCategoryFor(periodTransactions), [periodTransactions]);
  const budgetProgress = useMemo(() => budgetDomain.budgetProgressFor(budgets, spendingByCategory), [budgets, spendingByCategory]);

  const topCategory = spendingByCategory[0] || ["No spending yet", 0];
  const previousSpending = budgetDomain.totalsFor(previousPeriodTransactions).spending;
  const spendingComparison = previousSpending ? Math.round(((totals.spending - previousSpending) / previousSpending) * 100) : null;
  const trendPoints = useMemo(() => budgetDomain.trendFor(transactions, activeRange), [transactions, activeRange]);

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const description = String(data.get("description") || "New transaction");
    const category = modalType === "income" ? "Income" : String(data.get("category"));
    if (!amount || amount < 1 || !modalType) return;
    setTransactions((items) => [{ id: Date.now(), name: description, category, amount, date: String(data.get("date") || new Date().toISOString().slice(0, 10)), type: modalType, icon: modalType === "income" ? "✦" : "●" }, ...items]);
    setModalType(null);
    setToast(`${modalType === "income" ? "Income" : "Expense"} added successfully`);
    window.setTimeout(() => setToast(""), 2800);
  }

  function deleteTransaction(id: number) {
    if (!window.confirm("Delete this transaction? This cannot be undone in the current prototype.")) return;
    setTransactions((items) => items.filter((item) => item.id !== id));
    setToast("Transaction deleted");
    window.setTimeout(() => setToast(""), 2800);
  }

  function updateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTransaction) return;
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const description = String(data.get("description") || "New transaction");
    const category = editingTransaction.type === "income" ? "Income" : String(data.get("category"));
    if (!amount || amount < 1) return;
    setTransactions((items) => items.map((item) => item.id === editingTransaction.id ? { ...item, name: description, amount, category, date: String(data.get("date") || item.date) } : item));
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

  async function signOut() {
    if (isSupabaseConfigured) await getSupabaseClient().auth.signOut();
    setAuthenticated(false);
  }

  if (!authenticated) return <AuthScreen mode={authMode} onModeChange={setAuthMode} onAuthenticate={() => setAuthenticated(true)} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><span>WIW<small>Where It Went</small></span></div>
        <div className="workspace-label">YOUR MONEY</div>
        <nav aria-label="Main navigation">
          {[ ["Overview", "⌂"], ["Transactions", "↕"], ["Budgets", "◌"], ["Insights", "✦"] ].map(([name, icon]) => (
            <button className={`nav-item ${activeTab === name ? "active" : ""}`} aria-current={activeTab === name ? "page" : undefined} key={name} onClick={() => setActiveTab(name)}><span>{icon}</span>{name}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setActiveTab("Settings")}><span>⚙</span>Settings</button>
          <div className="profile"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><small>alex@email.com</small></div><button aria-label="Account options">···</button></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">{activeTab === "Overview" ? "AUGUST 2026" : "YOUR MONEY"}</p><h1>{activeTab === "Overview" ? "Good morning, Alex." : activeTab}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications">♢<i /></button><button className="avatar mobile-avatar">AM</button></div>
        </header>

        {activeTab === "Overview" ? <>
          <section className="hero-row">
            <div><p className="intro">Here is how your money is looking.</p><div className="period-toggle" aria-label="Budget period">{periodOptions.map(([value, label]) => <button key={value} className={period === value ? "selected" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div>{period === "custom" && <div className="custom-range"><label>From<input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} /></label></div>}</div>
            <div className="add-actions"><button className="secondary-button" onClick={() => setModalType("income")}><span>＋</span>Add income</button><button className="primary-button" onClick={() => setModalType("expense")}><span>＋</span>Add expense</button></div>
          </section>

          <section className="summary-grid" aria-label="Financial summary">
            <article className="balance-card"><div className="card-kicker">AVAILABLE TO SPEND <span className="trend positive">↑ 12%</span></div><div className="balance-value">{peso(totals.balance)}</div><p>After your income and spending</p><div className="progress-track"><span style={{ width: `${Math.min(totals.savingsRate, 100)}%` }} /></div><div className="progress-label"><span>{totals.savingsRate}% saved</span><span>Goal: 30%</span></div></article>
            <article className="stat-card"><div className="stat-icon income-icon">↗</div><p>Income</p><strong>{peso(totals.income)}</strong><small className="positive">+5.2% <em>vs. last month</em></small></article>
            <article className="stat-card"><div className="stat-icon expense-icon">↘</div><p>Spent</p><strong>{peso(totals.spending)}</strong><small className={spendingComparison !== null && spendingComparison <= 0 ? "positive" : "negative"}>{spendingComparison === null ? "No prior-period data" : `${spendingComparison > 0 ? "+" : ""}${spendingComparison}%`} <em>{spendingComparison === null ? "to compare" : "vs. previous period"}</em></small></article>
          </section>

          <section className="dashboard-grid">
            <article className="panel spending-panel"><div className="panel-heading"><div><h2>Spending breakdown</h2><p>Where your money went: {periodOptions.find(([value]) => value === period)?.[1].toLowerCase()}</p></div><button className="quiet-button">View details <span>→</span></button></div><div className="breakdown-content"><div className="donut" style={{ background: `conic-gradient(#436fce 0 49%, #ff8a7b 49% 74%, #7895e6 74% 89%, #9f8be0 89% 100%)` }}><div><strong>{peso(totals.spending)}</strong><small>spent</small></div></div><div className="legend">{spendingByCategory.slice(0, 4).map(([category, amount], index) => <div key={category}><span className={`legend-dot dot-${index}`} /><p>{category}<small>{totals.spending ? Math.round((amount / totals.spending) * 100) : 0}% of spending</small></p><strong>{peso(amount)}</strong></div>)}</div></div></article>
            <article className="panel insight-panel"><div className="sparkle">✦</div><div className="panel-heading"><div><p className="eyebrow">WIW INSIGHT</p><h2>You are doing well.</h2></div><button className="icon-button soft" aria-label="More insights">···</button></div><p className="insight-copy">Your spending is in a healthy range. <strong>{topCategory[0]}</strong> is your biggest category at <strong>{totals.spending ? Math.round((Number(topCategory[1]) / totals.spending) * 100) : 0}%</strong> of all spending.</p><div className="insight-tip"><span>✦</span><p><strong>Small win</strong>Keep dining out below ₱1,500 this month and you will stay on pace for your savings goal.</p></div><button className="text-link" onClick={() => setActiveTab("Insights")}>See all insights <span>→</span></button></article>
          </section>

          <section className="panel trend-panel"><div className="panel-heading"><div><h2>Spending pulse</h2><p>Daily expenses ending {displayDate(budgetDomain.isoDate(activeRange.end))}</p></div><strong>{peso(totals.spending)} <small>in selected range</small></strong></div><div className="trend-bars" aria-label="Seven day expense trend">{trendPoints.map((point, index) => <div className="trend-bar" key={`${point.label}-${index}`}><span className="trend-value">{point.amount ? peso(point.amount) : "—"}</span><i style={{ height: `${point.height}%` }} /><small>{point.label}</small></div>)}</div></section>

          <section className="bottom-grid">
            <article className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest money moves</p></div><button className="quiet-button" onClick={() => setActiveTab("Transactions")}>See all <span>→</span></button></div><div className="transaction-list">{periodTransactions.length ? periodTransactions.slice(0, 5).map((item) => <div className="transaction" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.category} · {displayDate(item.date)}</small></div><b className={item.type}>{item.type === "income" ? "+" : "−"}{peso(item.amount)}</b></div>) : <div className="dashboard-empty"><span>◎</span><p>No activity in this period yet.</p><button className="text-link" onClick={() => setModalType("expense")}>Add an expense <span>→</span></button></div>}</div></article>
            <article className="panel budget-panel"><div className="panel-heading"><div><h2>Budget check-in</h2><p>Your monthly limits</p></div><button className="quiet-button">Manage <span>→</span></button></div><div className="budget-row"><div><span className="budget-icon">☕</span><p><strong>Dining out</strong><small>{peso(960)} of {peso(3000)}</small></p></div><span className="budget-percent">32%</span></div><div className="budget-bar"><i style={{ width: "32%" }} /></div><div className="budget-row"><div><span className="budget-icon blue">◈</span><p><strong>Transport</strong><small>{peso(680)} of {peso(4500)}</small></p></div><span className="budget-percent">15%</span></div><div className="budget-bar blue"><i style={{ width: "15%" }} /></div></article>
          </section>
        </> : activeTab === "Budgets" ? <BudgetView budgets={budgetProgress} onCreate={() => { setEditingBudget(null); setBudgetModalOpen(true); }} onEdit={(budget) => { setEditingBudget(budget); setBudgetModalOpen(true); }} onDelete={deleteBudget} /> : <SecondaryView activeTab={activeTab} transactions={transactions} totals={totals} spendingByCategory={spendingByCategory} onReturn={() => setActiveTab("Overview")} onAddExpense={() => setModalType("expense")} onAddIncome={() => setModalType("income")} onSignOut={() => void signOut()} onDeleteTransaction={deleteTransaction} onEditTransaction={setEditingTransaction} />}
      </section>

      {(modalType || editingTransaction) && <ValidatedTransactionModal type={editingTransaction?.type || modalType!} transaction={editingTransaction || undefined} onClose={() => { setModalType(null); setEditingTransaction(null); }} onSubmit={editingTransaction ? updateTransaction : addTransaction} />}
      {budgetModalOpen && <ValidatedBudgetModal budget={editingBudget || undefined} onClose={() => { setBudgetModalOpen(false); setEditingBudget(null); }} onSubmit={saveBudget} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function BudgetView({ budgets, onCreate, onEdit, onDelete }: { budgets: (Budget & { spent: number })[]; onCreate: () => void; onEdit: (budget: Budget) => void; onDelete: (id: number) => void }) {
  const allocated = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const used = allocated ? Math.round((spent / allocated) * 100) : 0;
  return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">SPEND WITH INTENTION</p><h2>Your budgets</h2><p>Set a limit for the things that matter and see your pace.</p></div><button className="primary-button" onClick={onCreate}>＋ Create budget</button></div><div className="budget-overview"><div><span>Budget progress</span><strong>{peso(spent)}</strong><small>of {peso(allocated)} planned</small></div><div className="budget-overview-bar"><i style={{ width: `${Math.min(used, 100)}%` }} /></div><p><strong>{used}%</strong> used so far</p></div><div className="budget-cards">{budgets.length ? budgets.map((budget) => { const percent = Math.round((budget.spent / budget.limit) * 100); return <article className="budget-card" key={budget.id}><span className={`budget-card-icon ${budget.tone}`}>{budget.icon}</span><div className="budget-card-heading"><h3>{budget.category}</h3><div><button onClick={() => onEdit(budget)} aria-label={`Edit ${budget.category} budget`}>Edit</button><button onClick={() => onDelete(budget.id)} aria-label={`Delete ${budget.category} budget`}>Delete</button></div></div><p>{peso(budget.spent)} of {peso(budget.limit)}</p><div className="budget-bar"><i style={{ width: `${Math.min(percent, 100)}%` }} /></div><div><small>{percent}% used</small><strong>{peso(Math.max(budget.limit - budget.spent, 0))} {budget.spent > budget.limit ? "over" : "left"}</strong></div></article>; }) : <div className="transaction-empty"><span>◉</span><h3>No budgets yet</h3><p>Create a category limit to start tracking your pace.</p><button className="primary-button" onClick={onCreate}>Create budget</button></div>}</div></section>;
}

function SecondaryView({ activeTab, transactions, totals, spendingByCategory, onReturn, onAddExpense: addExpense, onAddIncome, onSignOut, onDeleteTransaction, onEditTransaction }: { activeTab: string; transactions: Transaction[]; totals: { income: number; spending: number; balance: number; savingsRate: number }; spendingByCategory: [string, number][]; onReturn: () => void; onAddExpense: () => void; onAddIncome: () => void; onSignOut: () => void; onDeleteTransaction: (id: number) => void; onEditTransaction: (transaction: Transaction) => void }) {
  const [transactionFilter, setTransactionFilter] = useState<"all" | "income" | "expense">("all");
  const [transactionQuery, setTransactionQuery] = useState("");
  const onAddExpense = transactionFilter === "income" ? onAddIncome : addExpense;
  const [transactionSort, setTransactionSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const visibleTransactions = transactions.filter((item) => (transactionFilter === "all" || item.type === transactionFilter) && `${item.name} ${item.category}`.toLowerCase().includes(transactionQuery.toLowerCase())).sort((left, right) => {
    if (transactionSort === "highest") return right.amount - left.amount;
    if (transactionSort === "lowest") return left.amount - right.amount;
    return transactionSort === "newest" ? right.date.localeCompare(left.date) : left.date.localeCompare(right.date);
  });
if (activeTab === "Transactions") return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">MONEY MOVES</p><h2>All transactions</h2><p>Everything you have earned and spent this month.</p></div><button className="primary-button" onClick={onAddExpense}>{transactionFilter === "income" ? "＋ Add income" : "＋ Add expense"}</button></div><div className="transaction-filters">{([ ["all", "All activity"], ["income", "Income"], ["expense", "Expenses"] ] as const).map(([filter, label]) => <button key={filter} className={transactionFilter === filter ? "filter-active" : ""} onClick={() => setTransactionFilter(filter)}>{label}</button>)}<input aria-label="Search transactions" value={transactionQuery} onChange={(event) => setTransactionQuery(event.target.value)} placeholder="Search transactions" /><select aria-label="Sort transactions" value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as "newest" | "oldest" | "highest" | "lowest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></div><div className="full-transaction-list">{visibleTransactions.length ? visibleTransactions.map((item) => <div className="transaction transaction-wide" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.category} · {displayDate(item.date)}</small></div><span className="transaction-type">{item.type === "income" ? "Income" : "Expense"}</span><b className={item.type}>{item.type === "income" ? "+" : "−"}{peso(item.amount)}</b><button className="edit-transaction" onClick={() => onEditTransaction(item)} aria-label={`Edit ${item.name}`}>⌕</button><button className="delete-transaction" onClick={() => onDeleteTransaction(item.id)} aria-label={`Delete ${item.name}`}>×</button></div>) : <div className="transaction-empty"><span>◎</span><h3>{transactions.length ? "No matching transactions" : "No transactions yet"}</h3><p>{transactions.length ? "Try another filter or search term." : "Add your first expense to start seeing where it went."}</p>{!transactions.length && <button className="primary-button" onClick={onAddExpense}>{transactionFilter === "income" ? "Add income" : "Add expense"}</button>}</div>}</div></section>;
  if (activeTab === "Budgets") return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">SPEND WITH INTENTION</p><h2>Your budgets</h2><p>Set a limit for the things that matter and see your pace.</p></div><button className="primary-button">＋ Create budget</button></div><div className="budget-overview"><div><span>Monthly plan</span><strong>{peso(7500)}</strong><small>of {peso(15000)} allocated</small></div><div className="budget-overview-bar"><i style={{ width: "50%" }} /></div><p><strong>50%</strong> still unassigned</p></div><div className="budget-cards">{[["Dining out", 960, 3000, "☕", "peach"], ["Transport", 680, 4500, "◈", "blue"], ["Food & groceries", 4280, 7500, "🛒", "purple"]].map(([name, spent, limit, icon, tone]) => <article className="budget-card" key={String(name)}><span className={`budget-card-icon ${tone}`}>{icon}</span><h3>{name}</h3><p>{peso(Number(spent))} of {peso(Number(limit))}</p><div className="budget-bar"><i style={{ width: `${Math.round((Number(spent) / Number(limit)) * 100)}%` }} /></div><div><small>{Math.round((Number(spent) / Number(limit)) * 100)}% used</small><strong>{peso(Number(limit) - Number(spent))} left</strong></div></article>)}</div></section>;
  if (activeTab === "Insights") return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">THE WIW VIEW</p><h2>Where it went</h2><p>Clear signals to help you use your money with more intention.</p></div><button className="secondary-button" onClick={onReturn}>← Overview</button></div><div className="insight-grid"><article className="insight-feature"><span className="feature-orb">↗</span><p className="eyebrow">BIGGEST CATEGORY</p><h3>{spendingByCategory[0]?.[0] || "No spending yet"}</h3><strong>{totals.spending ? Math.round((Number(spendingByCategory[0]?.[1] || 0) / totals.spending) * 100) : 0}% <small>of all spending</small></strong><p>That is {peso(Number(spendingByCategory[0]?.[1] || 0))} from your {peso(totals.spending)} total this month.</p></article><article className="insight-feature accent"><span className="feature-orb">◎</span><p className="eyebrow">SAVING PACE</p><h3>You are on track</h3><strong>{totals.savingsRate}% <small>saved so far</small></strong><p>Keep your current pace and you will have about {peso(Math.round(totals.balance * 1.2))} available at month end.</p></article></div><article className="suggestion-panel"><div><span>✦</span><div><p className="eyebrow">A SMALL NEXT STEP</p><h3>Make your budget work harder</h3><p>Moving just {peso(500)} from dining out into savings each week could add {peso(2000)} to your month.</p></div></div><button className="primary-button">Set a savings goal</button></article></section>;
  return <section className="subpage"><div className="subpage-heading"><div><p className="eyebrow">PREFERENCES</p><h2>Settings</h2><p>Personalize WIW for the way you budget.</p></div></div><div className="settings-card"><h3>Profile and display</h3><label>Display name<input defaultValue="Alex Morgan" /></label><label>Currency<select defaultValue="PHP"><option value="PHP">Philippine peso (₱)</option><option value="USD">US dollar ($)</option></select></label><label>Default budget period<select defaultValue="month"><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></select></label><button className="primary-button">Save preferences</button><button className="signout-button" onClick={onSignOut}>Sign out</button></div></section>;
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
  return <main className="auth-page"><section className="auth-intro"><div className="auth-brand"><span className="auth-mark" />WIW</div><div><p className="eyebrow">WHERE IT WENT</p><h1>Feel clear about your money.</h1><p>See every money move, understand your patterns, and make your next decision feel easier.</p></div><div className="auth-insight-card"><span>✦</span><p><strong>Built for calm clarity</strong>Your money story, in one simple place.</p></div></section><section className="auth-form-side"><form className="auth-form" onSubmit={(event) => void submit(event)}><div><p className="eyebrow">WELCOME TO WIW</p><h2>{registering ? "Create your account" : "Welcome back"}</h2><p>{registering ? "Start building a clearer money picture today." : "Sign in to see where it went."}</p></div>{registering && <label>Name<input name="displayName" placeholder="Your name" required /></label>}<label>Email<input name="email" type="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>{!registering && <button type="button" className="forgot-button" onClick={() => void resetPassword()}>Forgot password?</button>}{error && <p className="auth-message error" role="alert">{error}</p>}{notice && <p className="auth-message" role="status">{notice}</p>}<button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : registering ? "Create account" : "Sign in"}</button><p className="auth-switch">{registering ? "Already have an account?" : "New to WIW?"} <button type="button" onClick={() => onModeChange(registering ? "signin" : "register")}>{registering ? "Sign in" : "Create an account"}</button></p>{!isSupabaseConfigured && <small className="demo-note">Prototype mode — connect Supabase to enable secure accounts and cloud data.</small>}</form></section></main>;
}

// Kept temporarily while the validated dialog replaces this original prototype component.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TransactionModal({ type, transaction, onClose, onSubmit }: { type: "income" | "expense"; transaction?: Transaction; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(transaction);
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Add"} ${type}`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close transaction dialog" /><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} {type.toUpperCase()}</p><h2>{editing ? "Edit" : "Add"} {type}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div><label>Description<input name="description" defaultValue={transaction?.name} placeholder={type === "income" ? "e.g. Freelance project" : "e.g. Grocery run"} required /></label><label>Amount<input name="amount" type="number" defaultValue={transaction?.amount} min="1" step="1" placeholder="0" required /></label>{type === "expense" && <label>Category<select name="category" defaultValue={transaction?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>}<label>Date<input name="date" type="date" defaultValue="2026-08-07" /></label><button className="primary-button full" type="submit">{editing ? "Save changes" : `Add ${type}`}</button></form></div>;
}

function ValidatedTransactionModal({ type, transaction, onClose, onSubmit }: { type: "income" | "expense"; transaction?: Transaction; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
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
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Add"} ${type}`}><button type="button" className="modal-dismiss" onClick={onClose} aria-label="Close transaction dialog" /><form className="transaction-modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{editing ? "EDIT" : "NEW"} {type.toUpperCase()}</p><h2>{editing ? "Edit" : "Add"} {type}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">&times;</button></div><label>Description<input name="description" defaultValue={transaction?.name} placeholder={type === "income" ? "e.g. Freelance project" : "e.g. Grocery run"} onChange={() => setError("")} required /></label><label>Amount<input name="amount" type="number" defaultValue={transaction?.amount} min="1" step="1" placeholder="0" onChange={() => setError("")} required /></label>{type === "expense" && <label>Category<select name="category" defaultValue={transaction?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>}<label>Date<input name="date" type="date" defaultValue={transaction?.date || "2026-08-07"} onChange={() => setError("")} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" type="submit">{editing ? "Save changes" : `Add ${type}`}</button></form></div>;
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
