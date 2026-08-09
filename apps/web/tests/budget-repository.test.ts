import assert from "node:assert/strict";
import test from "node:test";
import { localBudgetRepository } from "../app/lib/budget-repository.ts";

const values = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  },
  configurable: true,
});

test("local repository retains and restores WIW records", () => {
  values.clear();
  const transactions = [{ id: 10, name: "New pay", category: "Income", amount: 5000, date: "2026-08-07", type: "income" as const, icon: "*" }];
  const budgets = [{ id: 3, category: "Food", limit: 2000, icon: "*", tone: "blue" as const }];

  localBudgetRepository.saveTransactions(transactions);
  localBudgetRepository.saveBudgets(budgets);
  localBudgetRepository.saveCategories(["Food", "Pets"]);
  localBudgetRepository.saveProfile("Sam", "USD", "week");
  localBudgetRepository.saveSavingsGoal(7000);
  localBudgetRepository.saveBalanceChecks([{ id: 4, periodStart: "2026-08-01", periodEnd: "2026-08-07", actualBalance: 6300 }]);

  assert.deepEqual(localBudgetRepository.loadTransactions(), transactions);
  assert.deepEqual(localBudgetRepository.loadBudgets(), budgets);
  assert.deepEqual(localBudgetRepository.loadCategories(), ["Food", "Pets"]);
  assert.deepEqual(localBudgetRepository.loadProfile(), { name: "Sam", currency: "USD", period: "week", startingBalance: 0 });
  assert.equal(localBudgetRepository.loadSavingsGoal(), 7000);
  assert.deepEqual(localBudgetRepository.loadBalanceChecks(), [{ id: 4, periodStart: "2026-08-01", periodEnd: "2026-08-07", actualBalance: 6300 }]);
});

test("local repository ignores malformed records", () => {
  values.clear();
  values.set("wiw:transactions:v1", JSON.stringify([{ id: "bad" }]));
  values.set("wiw:budgets:v1", JSON.stringify([{ category: "Food" }]));
  values.set("wiw:categories:v1", JSON.stringify(["Food", 4, ""]));
  values.set("wiw:savings-goal:v1", JSON.stringify(-5));

  assert.deepEqual(localBudgetRepository.loadTransactions(), []);
  assert.deepEqual(localBudgetRepository.loadBudgets(), []);
  assert.deepEqual(localBudgetRepository.loadCategories(), ["Food"]);
  assert.equal(localBudgetRepository.loadSavingsGoal(), null);
});
