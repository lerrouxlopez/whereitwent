import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders WIW metadata and a usable initial state", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>WIW : Where It Went<\/title>/);
  assert.match(html, /name="description" content="A simple, thoughtful personal budgeting app/);
  assert.match(html, /class="(?:loading-screen|auth-page)"/);
  if (html.includes('class="loading-screen"')) {
    assert.match(html, /role="status"/);
    assert.match(html, /Loading your money picture/);
  } else {
    assert.match(html, /Welcome back/);
    assert.match(html, /type="email"/);
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("WIW keeps its key money flows wired to validated UI and the repository boundary", async () => {
  const [page, layout, repository] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/budget-repository.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"WIW : Where It Went"/);
  assert.match(page, /ValidatedTransactionModal/);
  assert.match(page, /ValidatedBudgetModal/);
  assert.match(page, /Add income/);
  assert.match(page, /Add expense/);
  assert.match(page, /Search transactions/);
  assert.match(page, /Create budget/);
  assert.match(page, /Set a savings goal/);
  assert.match(page, /localBudgetRepository/);
  assert.match(repository, /loadTransactions/);
  assert.match(repository, /saveTransactions/);
  assert.match(repository, /loadBudgets/);
  assert.match(repository, /saveBudgets/);
  assert.match(repository, /loadProfile/);
  assert.match(repository, /saveProfile/);
});
