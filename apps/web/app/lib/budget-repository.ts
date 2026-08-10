import type { Account, BalanceCheck, Budget, Period, Transaction } from "./budget";
import { readLocal, writeLocal } from "./local-repository.ts";

export type StoredProfile = {
  name?: unknown;
  currency?: unknown;
  period?: unknown;
  startingBalance?: unknown;
};

const keys = {
  transactions: "wiw:transactions:v1",
  budgets: "wiw:budgets:v1",
  categories: "wiw:categories:v1",
  profile: "wiw:profile:v1",
  savingsGoal: "wiw:savings-goal:v1",
  balanceChecks: "wiw:balance-checks:v1",
  accounts: "wiw:accounts:v1",
} as const;

export class LocalBudgetRepository {
  loadTransactions(): Transaction[] {
    const stored = readLocal<unknown[]>(keys.transactions, []);
    return stored.filter(isTransaction);
  }

  saveTransactions(transactions: Transaction[]) {
    writeLocal(keys.transactions, transactions);
  }

  loadBudgets(): Budget[] {
    const stored = readLocal<unknown[]>(keys.budgets, []);
    return stored.filter(isBudget);
  }

  saveBudgets(budgets: Budget[]) {
    writeLocal(keys.budgets, budgets);
  }

  loadCategories(): string[] {
    const stored = readLocal<unknown[]>(keys.categories, []);
    return stored.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  }

  saveCategories(categories: string[]) {
    writeLocal(keys.categories, categories);
  }

  loadProfile(): StoredProfile {
    return readLocal<StoredProfile>(keys.profile, {});
  }

  saveProfile(name: string, currency: string, period: Period, startingBalance = 0) {
    writeLocal(keys.profile, { name, currency, period, startingBalance });
  }

  loadSavingsGoal(): number | null {
    const amount = Number(readLocal<number | null>(keys.savingsGoal, null));
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  saveSavingsGoal(amount: number) {
    writeLocal(keys.savingsGoal, amount);
  }

  loadBalanceChecks(): BalanceCheck[] {
    return readLocal<unknown[]>(keys.balanceChecks, []).filter(isBalanceCheck);
  }

  saveBalanceChecks(checks: BalanceCheck[]) {
    writeLocal(keys.balanceChecks, checks);
  }

  loadAccounts(): Account[] {
    return readLocal<unknown[]>(keys.accounts, []).filter(isAccount);
  }

  saveAccounts(accounts: Account[]) {
    writeLocal(keys.accounts, accounts);
  }
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false;
  const account = value as Partial<Account>;
  return typeof account.id === "number"
    && typeof account.name === "string"
    && Boolean(account.name.trim())
    && (account.kind === "cash" || account.kind === "bank" || account.kind === "credit_card")
    && Number.isFinite(account.openingBalance)
    && account.openingBalance >= 0
    && (account.creditLimit === undefined || (Number.isFinite(account.creditLimit) && account.creditLimit >= 0));
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Partial<Transaction>;
  return typeof transaction.id === "number"
    && typeof transaction.name === "string"
    && typeof transaction.category === "string"
    && Number.isFinite(transaction.amount)
    && typeof transaction.date === "string"
    && (transaction.type === "income" || transaction.type === "expense" || transaction.type === "transfer")
    && (transaction.status === undefined || transaction.status === "posted" || transaction.status === "planned")
    && typeof transaction.icon === "string";
}

function isBalanceCheck(value: unknown): value is BalanceCheck {
  if (!value || typeof value !== "object") return false;
  const check = value as Partial<BalanceCheck>;
  return typeof check.id === "number" && typeof check.periodStart === "string" && typeof check.periodEnd === "string" && Number.isFinite(check.actualBalance)
    && (check.accountId === undefined || typeof check.accountId === "number");
}

function isBudget(value: unknown): value is Budget {
  if (!value || typeof value !== "object") return false;
  const budget = value as Partial<Budget>;
  return typeof budget.id === "number"
    && typeof budget.category === "string"
    && Number.isFinite(budget.limit)
    && typeof budget.icon === "string"
    && (budget.tone === "peach" || budget.tone === "blue" || budget.tone === "purple");
}

export const localBudgetRepository = new LocalBudgetRepository();
