import { validTransitionYear } from "./transition-state.js?v=20260930c";

export const ANNUAL_HANDOFF_TYPE = "asme-annual-link-handoff";
export const ANNUAL_LINK_FIELDS = [
  ["pointsMaster", "Points Master (officer edit link)", "points_master_url"],
  ["attendanceFormEditor", "Attendance Form editor", "Private handoff only"],
  ["attendanceFormRespondent", "Attendance Form respondent link", "attendance_form_url"],
  ["pointsExport", "Sanitized Points Export", "attendance_sheet_url"],
  ["budgetTracker", "Budget tracker", "budget_tracker_url"],
  ["budgetExport", "Sanitized Budget Export", "budget_export_sheet_url"],
  ["annualFolder", "Annual Drive folder", "Private handoff only"],
];
const fieldKeys = new Set(ANNUAL_LINK_FIELDS.map(([key]) => key));
const idPattern = /^[A-Za-z0-9_-]{20,200}$/;
const record = (value) => value && typeof value === "object" && !Array.isArray(value);

export function annualLinkStorageKey(year) {
  if (!validTransitionYear(year)) throw new Error("Choose a valid consecutive academic year.");
  return `asmeHubAnnualLinksV1:${year}`;
}

export function googleAnnualLink(key, value) {
  if (!fieldKeys.has(key) || typeof value !== "string") throw new Error("Unknown link field or non-text link.");
  const text = value.trim();
  if (!text) return "";
  const sheet = ["pointsMaster", "pointsExport", "budgetTracker", "budgetExport"].includes(key);
  if (sheet && idPattern.test(text)) return `https://docs.google.com/spreadsheets/d/${text}/edit`;
  let url;
  try { url = new URL(text); } catch { throw new Error(`Use a full Google link for ${key}.`); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Use an HTTPS Google link without credentials or a port.");
  const path = sheet ? /^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,200})(?:\/(?:edit|view))?\/?$/
    : key === "annualFolder" ? /^\/drive\/folders\/([A-Za-z0-9_-]{20,200})\/?$/
    : key === "attendanceFormEditor" ? /^\/forms\/d\/([A-Za-z0-9_-]{20,200})\/edit\/?$/
    : /^\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]{20,200})\/viewform\/?$/;
  const match = url.pathname.match(path);
  if (url.hostname !== (key === "annualFolder" ? "drive.google.com" : "docs.google.com") || !match) {
    throw new Error(`Wrong Google file type or link format for ${key}. Use the Form's actual respondent link; it cannot be inferred from its editor ID.`);
  }
  // Canonical file identity: discard tracking and tab selectors, retaining only the file URL.
  return sheet ? `https://docs.google.com/spreadsheets/d/${match[1]}/edit`
    : key === "annualFolder" ? `https://drive.google.com/drive/folders/${match[1]}`
    : `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

function googleId(url) { return String(url).match(/\/(?:d\/(?:e\/)?|folders\/)([A-Za-z0-9_-]{20,200})(?:\/|$|[?#])/)?.[1]; }

export function validateAnnualLinkDraft(value, year, config = {}) {
  annualLinkStorageKey(year);
  if (!record(value) || value.schema !== 1 || value.type !== ANNUAL_HANDOFF_TYPE || value.year !== year || !record(value.links)) {
    throw new Error("Use an annual link handoff with schema 1, the expected type, and the selected transition year.");
  }
  if (Object.keys(value.links).some((key) => !fieldKeys.has(key))) throw new Error("The handoff contains an unknown resource field.");
  const sourceIds = new Set([config.templates?.editUrl, ...Object.values(config.templates?.sources || {}).map((source) => source.editUrl)].map(googleId).filter(Boolean));
  const links = {};
  const used = new Map();
  for (const [key] of ANNUAL_LINK_FIELDS) {
    const url = googleAnnualLink(key, value.links[key] ?? "");
    if (!url) continue;
    const id = googleId(url);
    if (sourceIds.has(id)) throw new Error(`${key} still points to a template/source. Enter the new annual copy.`);
    const prior = used.get(id);
    const formPair = new Set([prior, key]);
    if (prior && !(formPair.has("attendanceFormEditor") && formPair.has("attendanceFormRespondent"))) throw new Error(`${key} and ${prior} must use distinct annual files.`);
    used.set(id, key);
    links[key] = url;
  }
  return { schema: 1, type: ANNUAL_HANDOFF_TYPE, year, links };
}

export function importAnnualLinkDraft(text, year, config) {
  if (typeof text !== "string" || text.length > 100_000) throw new Error("Annual link files must be under 100 KB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("This file is not valid JSON."); }
  return validateAnnualLinkDraft(value, year, config);
}

export function annualSettingsDraft(draft, config) {
  const checked = validateAnnualLinkDraft(draft, draft?.year, config);
  if (checked.year === config?.currentAcademicYear || config?.dataSources?.[checked.year]?.isCurrent === true) throw new Error("Choose a future or inactive transition year. Annual setup cannot prepare changes for the current Hub year.");
  return { yearKey: checked.year, label: checked.year.replace("-", "–"),
    attendanceSheetUrl: checked.links.pointsExport || "", attendanceSheetTab: "Leaderboard_Public",
    attendanceFormUrl: checked.links.attendanceFormRespondent || "", pointsMasterUrl: checked.links.pointsMaster || "",
    budgetTrackerUrl: checked.links.budgetTracker || "", budgetExportSheetUrl: checked.links.budgetExport || "",
    budgetExportSheetTab: "Budget_Public", isActive: false, isCurrent: false };
}

export function reopenAnnualChecks(progress) {
  const checks = { ...progress.checks };
  const steps = { ...progress.steps };
  // File changes affect incoming access and dependent real-system confirmations.
  for (const key of ["V02", "V03", "V04", "V05", "V06", "V07", "V09", "V10"]) {
    if (checks[key] === "passed") checks[key] = "needs_recheck";
  }
  for (const key of ["T02", "T04", "T05", "T06", "T07", "T08", "T09", "T10", "T13", "T14", "T15", "T16"]) {
    if (steps[key] === "complete") steps[key] = "in_progress";
  }
  return { ...progress, steps, checks };
}
