import { balanceExpectationFor, localDate, type BalanceCheck, type Budget, type Period, type Transaction } from "./budget";
import { getSupabaseClient } from "./supabase";

export type CloudProfile = { name: string; currency: string; period: Period; startingBalance: number; savingsGoal: number | null };
export type CloudSnapshot = {
  profile: CloudProfile | null;
  categories: string[];
  transactions: Transaction[];
  budgets: Budget[];
  balanceChecks: BalanceCheck[];
};

type CategoryRow = { id: string; name: string; icon: string; kind: "income" | "expense" };
type RelatedCategory = { name?: string; icon?: string } | { name?: string; icon?: string }[] | null;
type TransactionRow = { id: string; type: Transaction["type"]; status: "posted" | "planned" | null; amount_minor: number; transaction_date: string; notes: string | null; categories: RelatedCategory };
type BudgetRow = { id: string; amount_limit_minor: number; categories: RelatedCategory };
type BalanceCheckRow = { id: string; period_start: string; period_end: string; actual_balance_minor: number };

const periodFromDatabase: Record<string, Period> = { daily: "today", weekly: "week", biweekly: "biweekly", monthly: "month", yearly: "year" };
const periodToDatabase: Partial<Record<Period, string>> = { today: "daily", week: "weekly", biweekly: "biweekly", month: "monthly", year: "yearly" };

function relatedCategory(value: RelatedCategory) {
  return Array.isArray(value) ? value[0] : value;
}

function moneyToMinor(amount: number) { return Math.round(amount * 100); }
function moneyFromMinor(amount: number) { return amount / 100; }

async function currentUserId() {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before accessing cloud data.");
  return data.user.id;
}

async function cloudCategories(userId: string, categoryNames: string[]) {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase.from("categories").select("id,name,icon,kind").eq("user_id", userId);
  if (existingError) throw existingError;
  const rows = (existing || []) as CategoryRow[];
  const known = new Set(rows.filter((row) => row.kind === "expense").map((row) => row.name.toLowerCase()));
  const missing = categoryNames.filter((name) => name.trim() && !known.has(name.toLowerCase()));
  if (missing.length) {
    const { error } = await supabase.from("categories").insert(missing.map((name) => ({ user_id: userId, name, kind: "expense", icon: "•", color: "#7895e6" })));
    if (error) throw error;
  }
  const { data: refreshed, error: refreshError } = await supabase.from("categories").select("id,name,icon,kind").eq("user_id", userId);
  if (refreshError) throw refreshError;
  return (refreshed || []) as CategoryRow[];
}

export const supabaseBudgetRepository = {
  async load(): Promise<CloudSnapshot> {
    const supabase = getSupabaseClient();
    const userId = await currentUserId();
    const [profileResult, categoriesResult, transactionsResult, budgetsResult, checksResult] = await Promise.all([
      supabase.from("profiles").select("display_name,currency_code,preferred_period,starting_balance_minor,savings_goal_minor").eq("id", userId).maybeSingle(),
      supabase.from("categories").select("id,name,icon,kind").eq("user_id", userId).eq("kind", "expense"),
      supabase.from("transactions").select("id,type,status,amount_minor,transaction_date,notes,categories(name,icon)").eq("user_id", userId).order("transaction_date", { ascending: false }),
      supabase.from("budgets").select("id,amount_limit_minor,categories(name,icon)").eq("user_id", userId),
      supabase.from("balance_checks").select("id,period_start,period_end,actual_balance_minor").eq("user_id", userId),
    ]);
    for (const result of [profileResult, categoriesResult, transactionsResult, budgetsResult, checksResult]) if (result.error) throw result.error;
    const profile = profileResult.data ? {
      name: profileResult.data.display_name || "Your budget",
      currency: profileResult.data.currency_code || "PHP",
      period: periodFromDatabase[profileResult.data.preferred_period] || "month",
      startingBalance: moneyFromMinor(profileResult.data.starting_balance_minor || 0),
      savingsGoal: profileResult.data.savings_goal_minor ? moneyFromMinor(profileResult.data.savings_goal_minor) : null,
    } : null;
    return {
      profile,
      categories: ((categoriesResult.data || []) as CategoryRow[]).map((row) => row.name),
      transactions: ((transactionsResult.data || []) as TransactionRow[]).map((row, index) => {
        const category = relatedCategory(row.categories);
        return { id: index + 1, name: row.notes || "Untitled transaction", category: category?.name || (row.type === "income" ? "Income" : row.type === "transfer" ? "Transfer" : "Other"), amount: moneyFromMinor(row.amount_minor), date: row.transaction_date, type: row.type, status: row.status || "posted", icon: category?.icon || (row.type === "income" ? "✦" : "•") };
      }),
      budgets: ((budgetsResult.data || []) as BudgetRow[]).flatMap((row, index) => {
        const category = relatedCategory(row.categories);
        return category?.name ? [{ id: index + 1, category: category.name, limit: moneyFromMinor(row.amount_limit_minor), icon: category.icon || "•", tone: "blue" as const }] : [];
      }),
      balanceChecks: ((checksResult.data || []) as BalanceCheckRow[]).map((row, index) => ({ id: index + 1, periodStart: row.period_start, periodEnd: row.period_end, actualBalance: moneyFromMinor(row.actual_balance_minor) })),
    };
  },

  async save(snapshot: CloudSnapshot) {
    const supabase = getSupabaseClient();
    const userId = await currentUserId();
    const profile = snapshot.profile || { name: "Your budget", currency: "PHP", period: "month" as Period, startingBalance: 0, savingsGoal: null };
    const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, display_name: profile.name, currency_code: profile.currency, preferred_period: periodToDatabase[profile.period] || "monthly", starting_balance_minor: moneyToMinor(profile.startingBalance), savings_goal_minor: profile.savingsGoal ? moneyToMinor(profile.savingsGoal) : null });
    if (profileError) throw profileError;

    const categories = await cloudCategories(userId, snapshot.categories);
    const categoryIds = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
    const { error: removeTransactionsError } = await supabase.from("transactions").delete().eq("user_id", userId);
    if (removeTransactionsError) throw removeTransactionsError;
    if (snapshot.transactions.length) {
      const { error } = await supabase.from("transactions").insert(snapshot.transactions.map((item) => ({ user_id: userId, category_id: categoryIds.get(item.category.toLowerCase()) || null, type: item.type, status: item.status || "posted", amount_minor: moneyToMinor(item.amount), transaction_date: item.date, notes: item.name })));
      if (error) throw error;
    }

    const { error: removeBudgetsError } = await supabase.from("budgets").delete().eq("user_id", userId);
    if (removeBudgetsError) throw removeBudgetsError;
    const validBudgets = snapshot.budgets.filter((item) => categoryIds.has(item.category.toLowerCase()));
    if (validBudgets.length) {
      const { error } = await supabase.from("budgets").insert(validBudgets.map((item) => ({ user_id: userId, category_id: categoryIds.get(item.category.toLowerCase()), amount_limit_minor: moneyToMinor(item.limit), period: "monthly" })));
      if (error) throw error;
    }
    const desiredCategories = new Set(snapshot.categories.map((name) => name.toLowerCase()));
    const staleCategories = categories.filter((category) => category.kind === "expense" && !desiredCategories.has(category.name.toLowerCase())).map((category) => category.id);
    if (staleCategories.length) {
      const { error } = await supabase.from("categories").delete().eq("user_id", userId).in("id", staleCategories);
      if (error) throw error;
    }

    const { error: removeChecksError } = await supabase.from("balance_checks").delete().eq("user_id", userId);
    if (removeChecksError) throw removeChecksError;
    if (snapshot.balanceChecks.length) {
      const { error } = await supabase.from("balance_checks").insert(snapshot.balanceChecks.map((item) => {
        const expectation = balanceExpectationFor(profile.startingBalance, snapshot.transactions, { start: localDate(item.periodStart), end: new Date(`${item.periodEnd}T23:59:59`) });
        const difference = item.actualBalance - expectation.expectedBalance;
        return { user_id: userId, period_start: item.periodStart, period_end: item.periodEnd, expected_balance_minor: moneyToMinor(expectation.expectedBalance), actual_balance_minor: moneyToMinor(item.actualBalance), difference_minor: moneyToMinor(difference) };
      }));
      if (error) throw error;
    }
  },
};
