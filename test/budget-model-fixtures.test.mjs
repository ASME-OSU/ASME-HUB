import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const YEAR_START = "2026-08-01";
const YEAR_END = "2027-07-31";
const countedStatus = (status) => /^(approved|cleared)$/i.test(String(status || "").trim());
const inAcademicYear = (date) => date >= YEAR_START && date <= YEAR_END;

function summarize(transactions, { startingCash, allocation, reserve = 0, commitments = 0 }) {
  const cash = { ...startingCash };
  const actuals = {};
  for (const transaction of transactions) {
    if (!countedStatus(transaction.status) || !inAcademicYear(transaction.date)) continue;
    const amount = Number(transaction.amount);
    if (transaction.type === "Income") cash[transaction.account] += amount;
    if (transaction.type === "Expense") {
      cash[transaction.account] -= amount;
      actuals[transaction.category] = (actuals[transaction.category] || 0) + amount;
    }
    if (transaction.type === "Transfer") {
      cash[transaction.account] -= amount;
      cash[transaction.toAccount] += amount;
    }
  }
  const totalActual = Object.values(actuals).reduce((total, amount) => total + amount, 0);
  return {
    cash,
    actuals,
    totalActual,
    combinedCash: Object.values(cash).reduce((total, amount) => total + amount, 0),
    remainingAuthority: allocation === null
      ? null
      : allocation - reserve - commitments - totalActual,
  };
}

function categoryStatus({ allocation, actual }) {
  if (allocation === null) return "Needs confirmation";
  if (allocation === 0 && actual > 0) return "Unbudgeted actual";
  if (actual > allocation) return "Overspent";
  return "Within authority";
}

function parseRate(value, format) {
  return format === "percent" ? value * 100 : value;
}

function exportQuality(metrics) {
  const required = [
    "academic_year",
    "approved_income",
    "approved_expenses",
    "pending_approval",
    "planned_budget",
    "remaining_budget",
    "budget_used_rate",
  ];
  const missing = required.filter((key) => !(key in metrics));
  if (missing.length) return { available: false, missing };

  const messages = [];
  if (!metrics.source_updated_at) messages.push("source freshness unverified");
  const categorized = Object.entries(metrics)
    .filter(([key]) => key.startsWith("category_actual_"))
    .reduce((total, [, value]) => total + Number(value), 0);
  const difference = Number(metrics.approved_expenses) - categorized;
  if (difference < -0.005) messages.push("category actuals exceed approved expenses");
  if (difference > 0.005) messages.push("approved expenses are uncategorized");
  if (!metrics.funding_model_status) messages.push("funding authority status absent");
  return { available: true, difference, messages };
}

function metricRow(key, { value = 0, format = "currency", textValue = "" } = {}) {
  return {
    c: [
      { v: key },
      { v: key },
      { v: value },
      { v: format },
      { v: "" },
      { v: textValue },
    ],
  };
}

function createHubRuntime(rows) {
  const byId = new Map();
  const createElement = () => ({
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [],
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; },
    closest() { return null; },
    remove() {},
    focus() {},
    hidden: false,
    textContent: "",
    value: "",
    parentElement: { setAttribute() {}, hidden: false },
  });
  const document = {
    title: "ASME Officer Hub test",
    body: createElement(),
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, createElement());
      return byId.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement,
    addEventListener() {},
  };
  const window = {
    ASME_HUB_CONFIG: {
      currentAcademicYear: "2026-2027",
      calendarSnapshotUrl: "",
      access: {},
      dataSources: {},
      resources: [],
    },
    location: { protocol: "https:", hash: "" },
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { callback(); },
    scrollTo() {},
  };
  document.head = {
    appendChild(script) {
      const tqx = new URL(script.src).searchParams.get("tqx");
      const callback = tqx.match(/responseHandler:([^;]+)/)?.[1];
      queueMicrotask(() => window[callback]?.({ table: { rows } }));
      return script;
    },
  };
  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const sandbox = {
    window,
    document,
    localStorage: storage,
    sessionStorage: storage,
    URL,
    URLSearchParams,
    DOMException,
    Intl,
    Date,
    Math,
    Promise,
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
  };
  sandbox.globalThis = sandbox;
  const source = readFileSync(resolve(import.meta.dirname, "../assets/js/app.js"), "utf8")
    .replace(
      /\n  initialize\(\);\n\}\)\(\);\s*$/,
      "\n  globalThis.__asmeHubExpose = { loadBudgetSummary, renderBudget };\n})();\n",
    );
  vm.runInNewContext(source, sandbox, { filename: "app.js" });
  return { api: sandbox.__asmeHubExpose, byId };
}

test("normal fixture keeps both-account cash and authority distinct while a transfer is neutral combined", () => {
  const result = summarize([
    { date: "2026-08-15", type: "Income", account: "OSU", amount: 250, status: "Approved" },
    { date: "2026-09-01", type: "Transfer", account: "OSU", toAccount: "Huntington", amount: 80, status: "Cleared" },
    { date: "2026-09-03", type: "Expense", account: "Huntington", category: "Food", amount: 30, status: "Cleared" },
  ], {
    startingCash: { OSU: 100, Huntington: 40 },
    allocation: 500,
    reserve: 50,
    commitments: 20,
  });

  assert.deepEqual(result.cash, { OSU: 270, Huntington: 90 });
  assert.equal(result.combinedCash, 360);
  assert.equal(result.totalActual, 30);
  assert.equal(result.remainingAuthority, 400);
});

test("meeting fixture counts only approved or cleared in-year transactions and never auto-classifies blanks", () => {
  const result = summarize([
    { date: "2026-09-10", type: "Expense", account: "OSU", category: "General Meetings", amount: 120, status: "Approved" },
    { date: "2026-09-11", type: "Expense", account: "OSU", category: "General Meetings", amount: 50, status: "" },
    { date: "2026-09-12", type: "Expense", account: "OSU", category: "General Meetings", amount: 40, status: "Pending" },
    { date: "2026-09-13", type: "Expense", account: "OSU", category: "General Meetings", amount: 30, status: "Canceled" },
    { date: "2026-07-31", type: "Expense", account: "OSU", category: "General Meetings", amount: 20, status: "Cleared" },
  ], { startingCash: { OSU: 500, Huntington: 0 }, allocation: 400 });

  assert.equal(result.actuals["General Meetings"], 120);
  assert.equal(result.cash.OSU, 380);
  assert.equal(countedStatus(""), false);
});

test("narrow fixture exposes zero-plan actuals and protects unknown allocations from zero treatment", () => {
  assert.equal(categoryStatus({ allocation: 0, actual: 25 }), "Unbudgeted actual");
  assert.equal(categoryStatus({ allocation: null, actual: 0 }), "Needs confirmation");
  assert.equal(summarize([], {
    startingCash: { OSU: 1, Huntington: 1 }, allocation: null,
  }).remainingAuthority, null);
});

test("wide fixture surfaces overspend, percent values above 100, and incomplete public exports", () => {
  assert.equal(categoryStatus({ allocation: 100, actual: 130 }), "Overspent");
  assert.equal(parseRate(1.5, "percent"), 150);

  assert.deepEqual(exportQuality({ approved_expenses: 0 }), {
    available: false,
    missing: [
      "academic_year",
      "approved_income",
      "pending_approval",
      "planned_budget",
      "remaining_budget",
      "budget_used_rate",
    ],
  });

  const quality = exportQuality({
    academic_year: "2026–2027",
    approved_income: 0,
    approved_expenses: 50,
    pending_approval: 0,
    planned_budget: 100,
    remaining_budget: 50,
    budget_used_rate: 0.5,
    category_actual_food: 60,
  });
  assert.equal(quality.available, true);
  assert.equal(quality.difference, -10);
  assert.deepEqual(quality.messages, [
    "source freshness unverified",
    "category actuals exceed approved expenses",
    "funding authority status absent",
  ]);
});

test("Hub implementation retains the explicit public-feed safeguards exercised by the fixtures", () => {
  const app = readFileSync(resolve(import.meta.dirname, "../assets/js/app.js"), "utf8");
  assert.match(app, /rawBudgetUsedRate \* 100/);
  assert.doesNotMatch(app, /rawBudgetUsedRate\s*<=\s*1/);
  assert.match(app, /source transaction freshness is unverified/);
  assert.match(app, /Category actuals exceed the approved-expense total/);
  assert.match(app, /Funding authority status is absent/);
});

test("production budget parser rejects invalid required metrics and preserves real zeroes", async () => {
  const baseRows = [
    metricRow("academic_year", { value: "", format: "text", textValue: "Aug 1, 2026 – Jul 31, 2027" }),
    metricRow("approved_income"),
    metricRow("approved_expenses"),
    metricRow("pending_approval"),
    metricRow("planned_budget", { value: 100 }),
    metricRow("remaining_budget", { value: 100 }),
    metricRow("budget_used_rate", { value: 0, format: "percent" }),
  ];
  const validRuntime = createHubRuntime(baseRows);
  const valid = await validRuntime.api.loadBudgetSummary({
    budgetExportSheetUrl: "https://docs.google.com/spreadsheets/d/test-sheet-id-1234567890/edit",
  });
  assert.equal(valid.available, true);
  assert.equal(valid.approvedExpenses, 0);
  assert.equal(valid.budgetUsedPercent, 0);
  assert.ok(valid.qualityMessages.includes("No source or export timestamp is available"));

  const invalidRows = baseRows.map((row) => structuredClone(row));
  invalidRows.find((row) => row.c[0].v === "approved_expenses").c[2].v = null;
  const invalidRuntime = createHubRuntime(invalidRows);
  const invalid = await invalidRuntime.api.loadBudgetSummary({
    budgetExportSheetUrl: "https://docs.google.com/spreadsheets/d/test-sheet-id-1234567890/edit",
  });
  assert.equal(invalid.available, false);
  assert.match(invalid.error, /invalid required metric: approved_expenses/);
});

test("production parser and renderer never turn unknown metrics into public zeroes", async () => {
  const runtime = createHubRuntime([
    metricRow("academic_year", { value: "", format: "text", textValue: "Aug 1, 2026 – Jul 31, 2027" }),
    metricRow("approved_income"),
    metricRow("approved_expenses"),
    metricRow("pending_approval"),
    metricRow("planned_budget", { value: 100 }),
    metricRow("remaining_budget", { value: 100 }),
    metricRow("budget_used_rate", { value: 0, format: "percent" }),
    metricRow("category_actual_food", { value: "" }),
    metricRow("category_planned_food", { value: 50 }),
    metricRow("category_actual_travel", { value: 25 }),
    metricRow("category_planned_travel", { value: 50 }),
  ]);
  const parsed = await runtime.api.loadBudgetSummary({
    budgetExportSheetUrl: "https://docs.google.com/spreadsheets/d/test-sheet-id-1234567890/edit",
  });
  assert.equal(parsed.available, true);
  assert.equal(parsed.categories[0].actual, null);
  assert.ok(parsed.qualityMessages.includes("Category data is incomplete for 1 export row"));
  assert.equal(parsed.reconciliationDifference, null);
  assert.ok(!parsed.qualityMessages.includes("Some approved expenses are uncategorized in the export"));

  runtime.api.renderBudget({
    available: true,
    academicYear: "2026–2027",
    approvedIncome: null,
    approvedExpenses: null,
    pendingApproval: null,
    plannedBudget: null,
    remainingBudget: null,
    budgetUsedPercent: null,
    categories: [{ label: "Food", actual: null, planned: 50 }],
  });
  assert.equal(runtime.byId.get("budget-approved-expenses").textContent, "—");
  assert.equal(runtime.byId.get("budget-used-rate").textContent, "—");
  assert.equal(runtime.byId.get("budget-planned-context").textContent, "Budget data is incomplete");
  assert.equal(runtime.byId.get("budget-category-total").textContent, "—");
  assert.equal(runtime.byId.get("budget-category-legend").children[0].textContent, "Category data is incomplete.");
  assert.match(
    runtime.byId.get("budget-freshness").textContent,
    /No verifiable source or export timestamp/,
  );
});

test("production renderer keeps a legacy plan unconfirmed until the public status is explicitly Confirmed", () => {
  const runtime = createHubRuntime([]);
  runtime.api.renderBudget({
    available: true,
    academicYear: "2026–2027",
    approvedIncome: 1500,
    approvedExpenses: 319.9,
    pendingApproval: 0,
    plannedBudget: 2786.35,
    remainingBudget: 2466.45,
    budgetUsedPercent: 11.48,
    fundingModelStatus: "Needs confirmation",
    categories: [],
  });

  assert.equal(runtime.byId.get("budget-used-rate").textContent, "Needs confirmation");
  assert.equal(runtime.byId.get("budget-remaining-label").textContent, "Legacy plan remaining");
  assert.equal(runtime.byId.get("budget-used-label").textContent, "Funding confirmation");
  assert.equal(runtime.byId.get("budget-progress-fill").parentElement.hidden, true);
});
