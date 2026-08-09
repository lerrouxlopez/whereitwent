export type Transaction = {
  id: number;
  name: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense" | "transfer";
  icon: string;
};
export type BalanceCheck = { id: number; periodStart: string; periodEnd: string; actualBalance: number };

export type Budget = {
  id: number;
  category: string;
  limit: number;
  icon: string;
  tone: "peach" | "blue" | "purple";
};

export type Period = "today" | "week" | "biweekly" | "month" | "year" | "custom";
export type Category = { id: string; name: string; kind: "income" | "expense"; icon: string; color: string };
export type Profile = { currencyCode: string; preferredPeriod: Period; startingBalance: number };
export type InsightPriority = "needs_attention" | "watch" | "on_track";
export type Insight = {
  title: string;
  detail: string;
  recommendation?: string;
  tone: "positive" | "attention" | "neutral";
  priority: InsightPriority;
  evidence: string;
  period: string;
  calculationBasis: string;
  estimatedEffect?: number;
};
export type InsightContext = {
  range?: DateRange;
  period?: Period;
  previousTransactions?: Transaction[];
  budgets?: Budget[];
  allTransactions?: Transaction[];
  reconciliation?: { actualBalance: number; expectedBalance: number; difference: number } | null;
  savingsGoal?: number | null;
  now?: Date;
};

export type DateRange = { start: Date; end: Date };

export function localDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function reportRange(period: Period, customStart: string, customEnd: string, now = new Date()): DateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const start = new Date(end);
  if (period === "week") start.setDate(end.getDate() - 6);
  if (period === "biweekly") start.setDate(end.getDate() - 13);
  if (period === "month") start.setDate(1);
  if (period === "year") start.setMonth(0, 1);
  if (period === "custom") return { start: localDate(customStart), end: new Date(`${customEnd}T23:59:59`) };
  return { start, end };
}

export function transactionsInRange(transactions: Transaction[], range: DateRange) {
  return transactions.filter((item) => {
    const date = localDate(item.date);
    return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
  });
}

export function previousRange(range: DateRange): DateRange {
  const days = Math.max(1, Math.floor((range.end.getTime() - range.start.getTime()) / 86400000) + 1);
  const end = new Date(range.start); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59);
  const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0);
  return { start, end };
}

export function totalsFor(transactions: Transaction[]) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const spending = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, spending, balance: income - spending, savingsRate: income ? Math.round(((income - spending) / income) * 100) : 0 };
}

export function balanceExpectationFor(startingBalance: number, transactions: Transaction[], range: DateRange) {
  const beforePeriod = transactions.filter((item) => localDate(item.date) < range.start);
  const inPeriod = transactionsInRange(transactions, range);
  const openingBalance = startingBalance + totalsFor(beforePeriod).balance;
  const expectedBalance = openingBalance + totalsFor(inPeriod).balance;
  return { openingBalance, expectedBalance };
}

export function reconciliationFor(actualBalance: number, expectation: { openingBalance: number; expectedBalance: number }) {
  return { ...expectation, actualBalance, difference: actualBalance - expectation.expectedBalance };
}

export function spendingByCategoryFor(transactions: Transaction[]): [string, number][] {
  const totals = new Map<string, number>();
  transactions.filter((item) => item.type === "expense").forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
  return [...totals.entries()].sort((left, right) => right[1] - left[1]);
}

export function trendFor(transactions: Transaction[], range: DateRange) {
  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(range.end);
    date.setDate(date.getDate() - (6 - index));
    const key = isoDate(date);
    const amount = transactions.filter((item) => item.type === "expense" && item.date === key).reduce((sum, item) => sum + item.amount, 0);
    return { label: new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(date).slice(0, 1), amount };
  });
  const maximum = Math.max(...points.map((point) => point.amount), 1);
  return points.map((point) => ({ ...point, height: Math.max(8, Math.round((point.amount / maximum) * 100)) }));
}

export function budgetProgressFor(budgets: Budget[], categorySpending: [string, number][]) {
  const spending = new Map(categorySpending);
  return budgets.map((budget) => {
    const spent = spending.get(budget.category) || 0;
    const percent = percentageOf(spent, budget.limit);
    return { ...budget, spent, percent, remaining: Math.max(budget.limit - spent, 0) };
  });
}

export function budgetSummaryFor(budgets: Array<Budget & { spent: number }>) {
  const allocated = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  return { allocated, spent, percent: percentageOf(spent, allocated) };
}

export function percentageOf(amount: number, total: number) {
  return total > 0 ? Math.round((amount / total) * 100) : 0;
}

export function spendingChange(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

export function formatCurrency(amount: number, currencyCode = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
}

function insightPeriod(range?: DateRange) {
  return range ? `${isoDate(range.start)} to ${isoDate(range.end)}` : "the selected period";
}

function priorityRank(priority: InsightPriority) {
  return priority === "needs_attention" ? 0 : priority === "watch" ? 1 : 2;
}

export function insightsFor(transactions: Transaction[], context: InsightContext = {}): Insight[] {
  const totals = totalsFor(transactions);
  const categories = spendingByCategoryFor(transactions);
  const top = categories[0];
  const period = insightPeriod(context.range);
  const insights: Insight[] = [];
  const add = (insight: Omit<Insight, "period">) => insights.push({ ...insight, period });

  if (context.reconciliation && context.reconciliation.difference !== 0) {
    const amount = Math.abs(context.reconciliation.difference);
    const missing = context.reconciliation.difference < 0;
    add({
      title: missing ? "Your actual balance is lower than expected" : "Your actual balance is higher than expected",
      detail: `${formatCurrency(amount)} is still unaccounted for in this period.`,
      recommendation: missing ? "Review recent spending or add an untracked-spending adjustment once you are sure the money is gone." : "Review for missed income or a balance-entry mistake before relying on the higher amount.",
      tone: "attention",
      priority: "needs_attention",
      evidence: `WIW expected ${formatCurrency(context.reconciliation.expectedBalance)}, but you reported ${formatCurrency(context.reconciliation.actualBalance)}.`,
      calculationBasis: "Actual balance minus expected balance from the starting balance and recorded income and expenses.",
      estimatedEffect: amount,
    });
  }

  if (!totals.spending) {
    add({
      title: "No spending recorded",
      detail: "Add an expense to see where your money is going.",
      tone: "neutral",
      priority: "on_track",
      evidence: "No expense transactions fall in this reporting period.",
      calculationBasis: "Recorded expense transactions in the selected period.",
    });
    return insights.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority));
  }

  const share = Math.round((top[1] / totals.spending) * 100);
  add({
    title: `${top[0]} is your biggest category`,
    detail: `${formatCurrency(top[1])} is ${share}% of your spending in this period.`,
    recommendation: share >= 35 ? `Review ${top[0].toLowerCase()} first; reducing it by 10% would save about ${formatCurrency(Math.round(top[1] * 0.1))}.` : undefined,
    tone: share >= 35 ? "attention" : "neutral",
    priority: share >= 35 ? "watch" : "on_track",
    evidence: `${top[0]} accounts for ${formatCurrency(top[1])} of ${formatCurrency(totals.spending)} in recorded spending.`,
    calculationBasis: "Category spending divided by total recorded expenses in the selected period.",
    estimatedEffect: share >= 35 ? Math.round(top[1] * 0.1) : undefined,
  });

  if (context.previousTransactions?.length) {
    const previousCategories = new Map(spendingByCategoryFor(context.previousTransactions));
    const previousAmount = previousCategories.get(top[0]) || 0;
    const change = spendingChange(top[1], previousAmount);
    if (change !== null && Math.abs(change) >= 15) {
      const increased = change > 0;
      add({
        title: `${top[0]} spending is ${Math.abs(change)}% ${increased ? "higher" : "lower"}`,
        detail: `${formatCurrency(top[1])} this period compared with ${formatCurrency(previousAmount)} in the equivalent previous period.`,
        recommendation: increased ? `Check what changed in ${top[0].toLowerCase()} before the next period.` : undefined,
        tone: increased ? "attention" : "positive",
        priority: increased ? "watch" : "on_track",
        evidence: `${formatCurrency(top[1])} now versus ${formatCurrency(previousAmount)} previously.`,
        calculationBasis: "Current category spending compared with the equivalent previous reporting period.",
        estimatedEffect: increased ? top[1] - previousAmount : undefined,
      });
    }
  }

  if (context.budgets?.length && context.range) {
    const daysElapsed = Math.max(1, Math.floor((context.range.end.getTime() - context.range.start.getTime()) / 86400000) + 1);
    const forecastDays = context.period === "week" ? 7 : context.period === "biweekly" ? 14 : context.period === "month" ? 30 : context.period === "year" ? 365 : daysElapsed;
    const budgetProgress = budgetProgressFor(context.budgets, categories);
    const atRisk = budgetProgress
      .map((budget) => ({ ...budget, projected: Math.round((budget.spent / daysElapsed) * forecastDays) }))
      .filter((budget) => budget.spent > 0 && budget.projected > budget.limit)
      .sort((left, right) => (right.projected - right.limit) - (left.projected - left.limit))[0];
    if (atRisk) {
      add({
        title: `${atRisk.category} may exceed its budget`,
        detail: `At the current pace, spending projects to ${formatCurrency(atRisk.projected)} against a ${formatCurrency(atRisk.limit)} limit.`,
        recommendation: `Keeping ${atRisk.category.toLowerCase()} to about ${formatCurrency(Math.max(atRisk.limit - atRisk.spent, 0))} for the rest of this period keeps the budget intact.`,
        tone: "attention",
        priority: "needs_attention",
        evidence: `${formatCurrency(atRisk.spent)} recorded over ${daysElapsed} day${daysElapsed === 1 ? "" : "s"}.`,
        calculationBasis: `Current daily pace projected across ${forecastDays} day${forecastDays === 1 ? "" : "s"}.`,
        estimatedEffect: atRisk.projected - atRisk.limit,
      });
    }
  }

  const recurringSource = context.allTransactions || transactions;
  const repeated = new Map<string, Transaction[]>();
  recurringSource.filter((item) => item.type === "expense").forEach((item) => {
    const key = `${item.name.trim().toLowerCase()}|${item.amount}`;
    repeated.set(key, [...(repeated.get(key) || []), item]);
  });
  const recurring = [...repeated.values()]
    .filter((items) => items.length >= 2)
    .map((items) => ({ items, total: items.reduce((sum, item) => sum + item.amount, 0) }))
    .sort((left, right) => right.total - left.total)[0];
  if (recurring) {
    const item = recurring.items[0];
    add({
      title: "A likely recurring expense is worth reviewing",
      detail: `${item.name} appears ${recurring.items.length} times for ${formatCurrency(item.amount)} each.`,
      recommendation: `Confirm whether ${item.name.toLowerCase()} is still useful before the next charge.`,
      tone: "neutral",
      priority: "watch",
      evidence: `${recurring.items.length} matching recorded expenses total ${formatCurrency(recurring.total)}.`,
      calculationBasis: "Repeated expense descriptions with the same amount; this is a pattern, not a confirmed subscription.",
      estimatedEffect: item.amount,
    });
  }

  if (context.savingsGoal && context.savingsGoal > 0 && totals.income) {
    const daysElapsed = context.range ? Math.max(1, Math.floor((context.range.end.getTime() - context.range.start.getTime()) / 86400000) + 1) : 1;
    const forecastDays = context.period === "week" ? 7 : context.period === "biweekly" ? 14 : context.period === "month" ? 30 : context.period === "year" ? 365 : daysElapsed;
    const projectedBalance = Math.round((totals.balance / daysElapsed) * forecastDays);
    const onTrack = projectedBalance >= context.savingsGoal;
    add({
      title: onTrack ? "Your savings goal is on track" : "Your savings goal needs attention",
      detail: `At the current pace, this period projects to ${formatCurrency(Math.max(projectedBalance, 0))} against a ${formatCurrency(context.savingsGoal)} goal.`,
      recommendation: onTrack ? undefined : `Improving the projected balance by ${formatCurrency(Math.max(context.savingsGoal - Math.max(projectedBalance, 0), 0))} would reach the goal.`,
      tone: onTrack ? "positive" : "attention",
      priority: onTrack ? "on_track" : "watch",
      evidence: `${formatCurrency(totals.income)} income minus ${formatCurrency(totals.spending)} expenses leaves ${formatCurrency(totals.balance)}.`,
      calculationBasis: `Current net balance projected across ${forecastDays} day${forecastDays === 1 ? "" : "s"}, compared with the saved savings goal.`,
      estimatedEffect: Math.abs(context.savingsGoal - Math.max(projectedBalance, 0)),
    });
  } else if (totals.income && totals.savingsRate < 20) {
    add({
      title: "Your savings pace is below 20%",
      detail: `You have ${formatCurrency(totals.balance)} left after spending.`,
      recommendation: `Reducing ${top[0].toLowerCase()} by 10% would save about ${formatCurrency(Math.round(top[1] * 0.1))}.`,
      tone: "attention",
      priority: "watch",
      evidence: `You kept ${totals.savingsRate}% of ${formatCurrency(totals.income)} income.`,
      calculationBasis: "Income minus expenses, divided by recorded income in the selected period.",
      estimatedEffect: Math.round(top[1] * 0.1),
    });
  } else if (totals.income) {
    add({
      title: "Your savings pace is healthy",
      detail: `You have kept ${totals.savingsRate}% of this period's income.`,
      tone: "positive",
      priority: "on_track",
      evidence: `${formatCurrency(totals.balance)} remains after ${formatCurrency(totals.spending)} spending.`,
      calculationBasis: "Income minus expenses, divided by recorded income in the selected period.",
    });
  }

  return insights.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority));
}
