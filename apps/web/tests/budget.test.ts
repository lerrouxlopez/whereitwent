import assert from "node:assert/strict";
import test from "node:test";
import { accountBalancesFor, accountExpectationFor, balanceExpectationFor, budgetProgressFor, budgetSummaryFor, insightsFor, isoDate, percentageOf, previousRange, reconciliationFor, reportRange, spendingChange, totalsFor, type Transaction } from "../app/lib/budget.ts";

const income: Transaction = { id: 1, name: "Pay", category: "Income", amount: 10000, date: "2026-08-01", type: "income", icon: "*" };
const food: Transaction = { id: 2, name: "Food", category: "Food", amount: 2500, date: "2026-08-02", type: "expense", icon: "*" };

test("resolves custom and prior ranges", () => {
  const range = reportRange("custom", "2026-01-01", "2026-01-14");
  assert.equal(isoDate(previousRange(range).start), "2025-12-18");
});
test("calculates totals and budget progress", () => {
  assert.deepEqual(totalsFor([income, food]), { income: 10000, spending: 2500, balance: 7500, savingsRate: 75 });
  const progress = budgetProgressFor([{ id: 1, category: "Food", limit: 3000, icon: "*", tone: "blue" }], [["Food", 2500]]);
  assert.equal(progress[0].spent, 2500);
  assert.equal(progress[0].percent, 83);
  assert.equal(progress[0].remaining, 500);
  assert.deepEqual(budgetSummaryFor(progress), { allocated: 3000, spent: 2500, percent: 83 });
  assert.equal(percentageOf(1, 3), 33);
  assert.equal(spendingChange(120, 100), 20);
  assert.equal(spendingChange(120, 0), null);
});
test("keeps planned expenses out of actual totals", () => {
  const planned = { ...food, id: 99, amount: 4000, status: "planned" as const };
  assert.deepEqual(totalsFor([income, food, planned]), { income: 10000, spending: 2500, balance: 7500, savingsRate: 75 });
  assert.deepEqual(budgetProgressFor([{ id: 1, category: "Food", limit: 3000, icon: "*", tone: "blue" }], [["Food", 2500]]), [{ id: 1, category: "Food", limit: 3000, icon: "*", tone: "blue", spent: 2500, percent: 83, remaining: 500 }]);
});
test("treats a credit-card payment as a transfer, not new spending", () => {
  const accounts = [{ id: 1, name: "Bank", kind: "bank" as const, openingBalance: 10000 }, { id: 2, name: "Card", kind: "credit_card" as const, openingBalance: 3000, creditLimit: 20000 }];
  const purchase = { ...food, id: 101, amount: 2000, accountId: 2 };
  const payment = { ...food, id: 102, name: "Pay card", amount: 5000, type: "transfer" as const, fromAccountId: 1, toAccountId: 2 };
  assert.deepEqual(totalsFor([purchase, payment]), { income: 0, spending: 2000, balance: -2000, savingsRate: 0 });
  assert.deepEqual(accountBalancesFor(accounts, [purchase, payment]).map(({ name, balance, amountOwed, availableCredit }) => ({ name, balance, amountOwed, availableCredit })), [{ name: "Bank", balance: 5000, amountOwed: 0, availableCredit: 0 }, { name: "Card", balance: 0, amountOwed: 0, availableCredit: 20000 }]);
  assert.deepEqual(accountExpectationFor(accounts[0], [purchase, payment]), { expectedBalance: 5000, label: "balance" });
  assert.deepEqual(accountExpectationFor(accounts[1], [purchase, payment]), { expectedBalance: 0, label: "amount owed" });
});
test("handles no spending and produces evidence-based insight", () => {
  assert.equal(insightsFor([income])[0].title, "No spending recorded");
  assert.match(insightsFor([income, food])[0].title, /Food/);
});
test("handles month, year, and biweekly boundaries", () => {
  assert.equal(reportRange("month", "", "", new Date("2026-03-15")).start.toISOString().slice(0, 10), "2026-03-01");
  assert.equal(reportRange("year", "", "", new Date("2026-03-15")).start.toISOString().slice(0, 10), "2026-01-01");
  assert.equal(reportRange("biweekly", "", "", new Date("2026-01-03")).start.toISOString().slice(0, 10), "2025-12-21");
});
test("handles income-only, expense-only, zero-income, and attention insight thresholds", () => {
  assert.deepEqual(totalsFor([income]), { income: 10000, spending: 0, balance: 10000, savingsRate: 100 });
  assert.deepEqual(totalsFor([food]), { income: 0, spending: 2500, balance: -2500, savingsRate: 0 });
  const lowSavings = [...Array(9)].map((_, index) => ({ ...food, id: index + 10, amount: 1200 }));
  assert.equal(insightsFor([income, ...lowSavings]).some((insight) => insight.tone === "attention"), true);
});

test("reconciles actual balance without counting transfers as spending", () => {
  const transfer: Transaction = { id: 3, name: "Move to savings", category: "Transfer", amount: 3000, date: "2026-08-03", type: "transfer", icon: "*" };
  const range = reportRange("custom", "2026-08-01", "2026-08-07");
  const expectation = balanceExpectationFor(1000, [income, food, transfer], range);
  assert.deepEqual(totalsFor([income, food, transfer]), { income: 10000, spending: 2500, balance: 7500, savingsRate: 75 });
  assert.deepEqual(expectation, { openingBalance: 1000, expectedBalance: 8500 });
  assert.deepEqual(reconciliationFor(7300, expectation), { openingBalance: 1000, expectedBalance: 8500, actualBalance: 7300, difference: -1200 });
});

test("prioritizes explainable balance, budget, recurring, comparison, and savings insights", () => {
  const range = reportRange("custom", "2026-08-01", "2026-08-10");
  const transactions: Transaction[] = [
    income,
    { ...food, id: 20, amount: 4000, name: "Grocery run", date: "2026-08-02" },
    { ...food, id: 21, amount: 4000, name: "Grocery run", date: "2026-07-02" },
    { ...food, id: 22, amount: 3000, name: "Dining", category: "Dining", date: "2026-08-03" },
  ];
  const current = transactions.filter((item) => item.date >= "2026-08-01");
  const previous = transactions.filter((item) => item.date < "2026-08-01");
  const insights = insightsFor(current, {
    range,
    period: "month",
    previousTransactions: previous,
    allTransactions: transactions,
    budgets: [{ id: 1, category: "Food", limit: 5000, icon: "*", tone: "blue" }],
    reconciliation: { expectedBalance: 3000, actualBalance: 1800, difference: -1200 },
    savingsGoal: 10000,
  });
  assert.equal(insights[0].priority, "needs_attention");
  assert.match(insights[0].title, /lower than expected/);
  assert.equal(insights.every((insight) => Boolean(insight.evidence && insight.period && insight.calculationBasis)), true);
  assert.equal(insights.some((insight) => /may exceed its budget/.test(insight.title)), true);
  assert.equal(insights.some((insight) => /likely recurring/.test(insight.title)), true);
  assert.equal(insights.some((insight) => /savings goal needs attention/.test(insight.title)), true);
});

test("flags a meaningful category increase only when comparison evidence exists", () => {
  const range = reportRange("custom", "2026-08-01", "2026-08-07");
  const current = [{ ...food, amount: 3000, category: "Food" }];
  const previous = [{ ...food, id: 40, amount: 2000, category: "Food", date: "2026-07-25" }];
  const compared = insightsFor(current, { range, previousTransactions: previous });
  assert.equal(compared.some((insight) => /Food spending is 50% higher/.test(insight.title)), true);
  assert.equal(insightsFor(current, { range }).some((insight) => /higher|lower/.test(insight.title)), false);
});
