import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const outputFlag = process.argv.indexOf("--output");
const outputPath = resolve(
  root,
  outputFlag >= 0 && process.argv[outputFlag + 1]
    ? process.argv[outputFlag + 1]
    : "data/calendar.json",
);

function normalizeYearKey(value) {
  return String(value || "")
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
}

function spreadsheetIdFrom(value) {
  const clean = String(value || "").trim();
  const urlMatch = clean.match(/\/spreadsheets\/d\/([\w-]+)/i);
  if (urlMatch) return urlMatch[1];
  return /^[\w-]{20,}$/.test(clean) ? clean : "";
}

function sheetCell(row, index) {
  const cell = row?.c?.[index];
  return cell?.v ?? "";
}

function sheetBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  const clean = String(value ?? "").trim().toLowerCase();
  if (!clean) return fallback;
  return ["true", "yes", "1"].includes(clean);
}

async function fetchWithTimeout(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "ASME-Officer-Hub-Calendar-Sync/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function readConfig() {
  const source = await readFile(resolve(root, "assets/js/config.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "assets/js/config.js" });
  const config = sandbox.window.ASME_HUB_CONFIG;
  if (!config || typeof config !== "object") {
    throw new Error("assets/js/config.js did not provide ASME_HUB_CONFIG.");
  }
  return config;
}

async function readSharedCalendarSettings(config) {
  const settings = config.sharedSettings || {};
  const spreadsheetId = spreadsheetIdFrom(settings.spreadsheetUrl);
  if (!spreadsheetId || !settings.sheetTab) return null;

  const params = new URLSearchParams({
    sheet: settings.sheetTab,
    headers: "1",
    tqx: "out:json",
    tq: "select A,B,J,K,L where A is not null",
  });
  const response = await fetchWithTimeout(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params}`,
  );
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((\{[\s\S]*\})\);?\s*$/);
  if (!match) throw new Error("The shared settings sheet returned unexpected data.");

  const payload = JSON.parse(match[1]);
  if (payload.status === "error" || !payload.table) {
    throw new Error("The shared settings sheet query failed.");
  }
  return payload.table;
}

function mergeCalendarSources(config, table) {
  const calendars = Object.fromEntries(
    Object.entries(config.dataSources || {}).map(([year, source]) => [
      normalizeYearKey(year),
      { ...source, isActive: true },
    ]),
  );
  let currentAcademicYear = normalizeYearKey(config.currentAcademicYear);

  (table?.rows || []).forEach((row) => {
    const year = normalizeYearKey(sheetCell(row, 0));
    if (!/^\d{4}-\d{4}$/.test(year)) return;
    const isActive = sheetBoolean(sheetCell(row, 3), true);
    const isCurrent = sheetBoolean(sheetCell(row, 4), false);
    if (!isActive) {
      delete calendars[year];
      return;
    }
    calendars[year] = {
      ...(calendars[year] || {}),
      label: String(sheetCell(row, 1) || calendars[year]?.label || year),
      calendarIcalUrl: String(
        sheetCell(row, 2) || calendars[year]?.calendarIcalUrl || "",
      ).trim(),
      isActive: true,
    };
    if (isCurrent) currentAcademicYear = year;
  });

  return { calendars, currentAcademicYear };
}

async function fetchCalendar(year, source, generatedAt) {
  const feedUrl = String(source.calendarIcalUrl || "").trim();
  if (!feedUrl) return null;
  const parsedUrl = new URL(feedUrl);
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`${year}: calendar feed must use HTTPS.`);
  }

  const response = await fetchWithTimeout(feedUrl);
  const ical = await response.text();
  if (!/BEGIN:VCALENDAR/i.test(ical) || !/END:VCALENDAR/i.test(ical)) {
    throw new Error(`${year}: calendar feed did not return valid iCal data.`);
  }

  return {
    generatedAt,
    label: String(source.label || year),
    feedUrl,
    ical,
  };
}

const config = await readConfig();
let sharedSettings = null;
try {
  sharedSettings = await readSharedCalendarSettings(config);
} catch (error) {
  console.warn(
    `Shared calendar settings were unavailable; using deployed defaults. ${error.message}`,
  );
}

const { calendars: sources, currentAcademicYear } = mergeCalendarSources(
  config,
  sharedSettings,
);
const generatedAt = new Date().toISOString();
const entries = await Promise.all(
  Object.entries(sources).map(async ([year, source]) => {
    try {
      return [year, await fetchCalendar(year, source, generatedAt)];
    } catch (error) {
      if (year === currentAcademicYear) throw error;
      console.warn(`Skipping calendar ${year}. ${error.message}`);
      return [year, null];
    }
  }),
);
const calendars = Object.fromEntries(entries.filter(([, entry]) => entry));

if (!calendars[currentAcademicYear]) {
  throw new Error(
    `No generated calendar is available for current year ${currentAcademicYear || "unknown"}.`,
  );
}

const snapshot = {
  schemaVersion: 1,
  generatedAt,
  currentAcademicYear,
  calendars,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  `Generated ${Object.keys(calendars).length} calendar snapshot${
    Object.keys(calendars).length === 1 ? "" : "s"
  } at ${outputPath}.`,
);
