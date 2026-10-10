import { validTransitionYear } from "./transition-state.js?v=20261009b";

export const ANNUAL_HANDOFF_TYPE = "asme-annual-link-handoff";
export const ANNUAL_LINK_FIELDS = [
  ["pointsMaster", "Points Master (officer edit link)", "Opens the new year’s officer Points Master."],
  ["attendanceFormEditor", "Attendance Form editor", "Keep the Form editor link in your annual handoff."],
  ["attendanceFormRespondent", "Attendance Form respondent link", "The member-facing check-in link."],
  ["pointsExport", "Sanitized Points Export", "Provides approved attendance totals to the Hub."],
  ["budgetTracker", "Budget tracker", "Opens the new year’s officer budget workbook."],
  ["budgetExport", "Sanitized Budget Export", "Provides approved finance summaries to the Hub."],
  ["annualFolder", "Annual Drive folder", "The folder holding this year’s copied files."],
];
export const MOCK_ANNUAL_FIELDS = [
  ["controlCenterUrl", "Private mock Control Center", "Use the copied Control Center from the provisioner receipt; keep its permissions private."],
  ["scriptProjectUrl", "Mock provisioner Apps Script project (optional)", "Open the maintainer-reviewed project; running a function still requires its configured private target."],
];
// Optional private records belong to the selected local run, never public config.
export const PRIVATE_RECORD_FIELDS = [
  ["checklistUrl", "Current officer checklist link · Steps 1–5", "T01", "Ask the President for this year's checklist. Example: a private Google Doc listing these five steps."],
  ["handoffUrl", "Private handoff folder link", "T01", "Ask the President for this year's private handoff folder containing the checklist and contact instructions. Paste the folder URL, not the JSON link-bundle file URL."],
  ["accessOwnerUrl", "Access contact record link", "T01", "Ask the President for a document explaining how the President arranges access and recovery. Paste its link, not a name or email."],
  ["receiptUrl", "Setup receipt document link", "T02", "Ask the technical maintainer for the list of copied files and verified settings for this checklist's year."],
  ["communicationsUrl", "Approved communications record link", "T04", "Ask the President for the approved facts and the maintainer's verified sending-service route."],
  ["cleanupUrl", "Practice cleanup checklist link", "T05", "Ask the technical maintainer for the checklist naming only this attempt's test files and responses to remove."],
  ["rollbackUrl", "Rollback record link", "T05", "Ask the technical maintainer for the recovery record: backups, what was restored, and any remaining problem."],
  ["acceptanceUrl", "Incoming officer acceptance record link", "T05", "Ask the President for the incoming officer's dated sign-off document, including any unresolved tasks."],
  ["approvalUrl", "Coordinator launch approval record link", "T05", "Ask the President for the coordinator's dated approval record before making the year live."]
];
function privateRecords(value) {
  if (value === undefined) return undefined;
  if (!record(value) || Object.keys(value).some(key => !PRIVATE_RECORD_FIELDS.some(([id]) => id === key))) throw new Error("Unknown private record field.");
  const result = {};
  for (const [key] of PRIVATE_RECORD_FIELDS) {
    const text = value[key] ?? "";
    if (typeof text !== "string") throw new Error("Private record links must be text.");
    if (!text.trim()) continue;
    let url; try { url = new URL(text.trim()); } catch { throw new Error("Use a full HTTPS private record link."); }
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.href.length > 2000) throw new Error("Use an HTTPS private record link without credentials or a port.");
    result[key] = url.href;
  }
  return Object.keys(result).length ? result : undefined;
}
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

function mockContext(value, links, config) {
  if (value === undefined) return undefined;
  if (!record(value) || Object.keys(value).some(key => !MOCK_ANNUAL_FIELDS.some(([field]) => field === key))) throw new Error("Unknown or malformed private mock context.");
  const result = {};
  for (const [key] of MOCK_ANNUAL_FIELDS) {
    const input = value[key] ?? "";
    if (typeof input !== "string") throw new Error("Private mock references must be text links.");
    if (!input.trim()) continue;
    if (key === "controlCenterUrl") {
      const url = googleAnnualLink("pointsMaster", input);
      const id = googleId(url);
      const excluded = [config.sharedSettings?.spreadsheetUrl, config.sharedSettings?.editUrl, config.templates?.editUrl, ...Object.values(config.templates?.sources || {}).map(source => source.editUrl), ...Object.values(links)].map(googleId).filter(Boolean);
      if (excluded.includes(id)) throw new Error("Use a separate copied Control Center for this private mock; the chapter source, templates and annual files are excluded.");
      result[key] = url;
    } else {
      let url;
      try { url = new URL(input.trim()); } catch { throw new Error("Use the full Apps Script project editor link."); }
      if (url.protocol !== "https:" || url.hostname !== "script.google.com" || url.username || url.password || url.port || !/^\/(?:u\/\d+\/)?home\/projects\/[A-Za-z0-9_-]{20,200}\/edit\/?$/.test(url.pathname)) throw new Error("Use the Apps Script project editor link, not a deployed web app.");
      result[key] = `${url.origin}${url.pathname.replace(/\/$/, "")}`;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

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
  const mock = mockContext(value.mock, links, config);
  const records = privateRecords(value.records);
  return { schema: 1, type: ANNUAL_HANDOFF_TYPE, year, links, ...(mock ? { mock } : {}), ...(records ? { records } : {}) };
}

export function importAnnualLinkDraft(text, year, config) {
  if (typeof text !== "string" || text.length > 100_000) throw new Error("Annual link files must be under 100 KB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("This file is not valid JSON."); }
  return validateAnnualLinkDraft(value, year, config);
}

export function annualSettingsDraft(draft, config) {
  const checked = validateAnnualLinkDraft(draft, draft?.year, config);
  if (checked.mock) throw new Error("Private mock settings use the copied Control Center and provisioner receipt; they cannot enter the legacy annual save workflow.");
  if (checked.year === config?.currentAcademicYear || config?.dataSources?.[checked.year]?.isCurrent === true) throw new Error("Choose a future or inactive transition year. Annual setup cannot prepare changes for the current Hub year.");
  return { yearKey: checked.year, label: checked.year.replace("-", "–"),
    attendanceSheetUrl: checked.links.pointsExport || "", attendanceSheetTab: "Leaderboard_Public",
    attendanceFormUrl: checked.links.attendanceFormRespondent || "", pointsMasterUrl: checked.links.pointsMaster || "",
    budgetTrackerUrl: checked.links.budgetTracker || "", budgetExportSheetUrl: checked.links.budgetExport || "",
    budgetExportSheetTab: "Budget_Public", isActive: false, isCurrent: false };
}

const ANNUAL_DEPENDENCIES = {
  controlCenterUrl: {steps:['T02','T03','T04'],checks:['V07','V10']},
  scriptProjectUrl: {steps:['T02','T03'],checks:['V01','V02','V07','V10']},
  pointsMaster: {steps:['T02','T03'],checks:['V02','V03','V04','V05']},
  attendanceFormEditor: {steps:['T02','T03'],checks:['V02','V03','V04']},
  attendanceFormRespondent: {steps:['T02','T03'],checks:['V02','V03','V04']},
  pointsExport: {steps:['T02','T03'],checks:['V03','V04','V05']},
  budgetTracker: {steps:['T02','T03'],checks:['V06']},
  budgetExport: {steps:['T02','T03'],checks:['V06']},
  annualFolder: {steps:['T02','T03','T04'],checks:['V02','V03','V04','V05','V06','V08']}
};

export function reopenAnnualChecks(progress, changedKeys = [], previousLinks = {}) {
  const checks = { ...progress.checks };
  const steps = { ...progress.steps };
  const affectedSteps = new Set();
  const affectedChecks = new Set();
  for (const key of changedKeys) {
    const dependency = ANNUAL_DEPENDENCIES[key];
    if (!dependency && !PRIVATE_RECORD_FIELDS.some(([id]) => id === key)) continue;
    // Revised approvals and closeout evidence are tied to the exact saved bundle.
    for (let i = 11; i <= 26; i++) if (i !== 20 || previousLinks[key]) affectedChecks.add(`V${i}`);
    if (!dependency) {
      ["T01", "T02", "T03", "T04", "T05"].forEach(id => affectedSteps.add(id));
      ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10"].forEach(id => affectedChecks.add(id));
      continue;
    }
    [...dependency.steps, "T04", "T05"].forEach((id) => affectedSteps.add(id));
    [...dependency.checks, "V07", "V09"].forEach((id) => affectedChecks.add(id));
    // Initial entry does not undo earlier access checks. Replacing a saved file does.
    if (previousLinks[key]) { affectedSteps.add("T01"); affectedChecks.add("V10"); }
  }
  for (const key of affectedChecks) if (checks[key] === "passed") checks[key] = "needs_recheck";
  for (const key of affectedSteps) if (steps[key] === "complete") steps[key] = "in_progress";
  return { ...progress, steps, checks };
}

// Apply this review only to a newly imported packet. Historical backups still load
// unchanged so the officer can correct an old ambiguous record without data loss.
export function reviewAnnualLinkImport(draft) {
  const url = draft.records?.handoffUrl ? new URL(draft.records.handoffUrl) : null;
  if (url?.hostname === "drive.google.com" && !/^\/drive\/(?:u\/\d+\/)?folders\//.test(url.pathname)) {
    throw new Error("Private handoff folder must be a folder URL. Ask the President for the corrected packet; the JSON link-bundle file belongs in Import automation links, not the handoff folder field.");
  }
  return draft;
}
