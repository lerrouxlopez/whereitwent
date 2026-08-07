export type Transaction = {
  id: number;
  name: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  icon: string;
};

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
export type Insight = { title: string; detail: string; recommendation?: string; tone: "positive" | "attention" | "neutral" };

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
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1);
  const end = new Date(range.start); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59);
  const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0);
  return { start, end };
}

export function totalsFor(transactions: Transaction[]) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const spending = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, spending, balance: income - spending, savingsRate: income ? Math.round(((income - spending) / income) * 100) : 0 };
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
  return budgets.map((budget) => ({ ...budget, spent: spending.get(budget.category) || 0 }));
}

export function formatCurrency(amount: number, currencyCode = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
}

export function insightsFor(transactions: Transaction[]): Insight[] {
  const totals = totalsFor(transactions);
  const categories = spendingByCategoryFor(transactions);
  const top = categories[0];
  if (!totals.spending) return [{ title: "No spending recorded", detail: "Add an expense to see where your money is going.", tone: "neutral" }];
  const share = Math.round((top[1] / totals.spending) * 100);
  const insights: Insight[] = [{ title: `${top[0]} is your biggest category`, detail: `${formatCurrency(top[1])} is ${share}% of your spending in this period.`, tone: "neutral" }];
  if (totals.income && totals.savingsRate < 20) insights.push({ title: "Your savings pace is below 20%", detail: `You have ${formatCurrency(totals.balance)} left after spending.`, recommendation: `Reducing ${top[0].toLowerCase()} by 10% would save about ${formatCurrency(Math.round(top[1] * .1))}.`, tone: "attention" });
  else if (totals.income) insights.push({ title: "Your savings pace is healthy", detail: `You have kept ${totals.savingsRate}% of this period's income.`, tone: "positive" });
  return insights;
}
