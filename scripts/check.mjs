import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const read = (path) => readFileSync(resolve(root, path), "utf8");

for (const path of [
  "assets/js/config.js",
  "assets/js/app.js",
  "assets/js/pwa.js",
  "scripts/sync-calendar.mjs",
  "sw.js",
]) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, path)], {
    encoding: "utf8",
  });
  if (result.status !== 0) errors.push(`${path}: ${result.stderr.trim()}`);
}

for (const path of [
  "integrations/apps-script/Code.gs.example",
  "integrations/apps-script/SettingsWriter.gs.example",
]) {
  const result = spawnSync(process.execPath, ["--check", "-"], {
    input: read(path),
    encoding: "utf8",
  });
  if (result.status !== 0) errors.push(`${path}: ${result.stderr.trim()}`);
}

const html = read("index.html");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) errors.push(`Duplicate HTML ids: ${duplicateIds.join(", ")}`);

const anchors = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1]);
const missingAnchors = [...new Set(anchors.filter((id) => !ids.includes(id)))];
if (missingAnchors.length) errors.push(`Missing hash targets: ${missingAnchors.join(", ")}`);

const localReferences = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1].split("?")[0])
  .filter((value) => value && !/^(?:https?:|#|mailto:|tel:)/.test(value));
for (const path of new Set(localReferences)) {
  if (!existsSync(resolve(root, path))) errors.push(`Missing local asset: ${path}`);
}

const config = read("assets/js/config.js");
const app = read("assets/js/app.js");
const styles = read("assets/css/styles.css");
if (
  !/\bwriteUrl\b/.test(config) ||
  !app.includes("requestSettingsWrite") ||
  !app.includes("publishSettings")
) {
  errors.push("The organization-wide settings publishing flow is incomplete.");
}
if (!html.includes('id="settings-publish"')) {
  errors.push("The Publish for everyone control is missing.");
}
if (!existsSync(resolve(root, "integrations/apps-script/SettingsWriter.gs.example"))) {
  errors.push("The shared-settings Apps Script is missing.");
}
if (!app.includes('"select E,G,H,I,J,K,L,M,N where B is not null"')) {
  errors.push("Leaderboard query must exclude the member-name column from its response.");
}
if (!existsSync(resolve(root, ".github/workflows/pages.yml"))) {
  errors.push("The hourly Pages deployment workflow is missing.");
}
if (!existsSync(resolve(root, "data/calendar.json"))) {
  errors.push("The generated calendar snapshot placeholder is missing.");
} else {
  try {
    const calendar = JSON.parse(read("data/calendar.json"));
    if (calendar.schemaVersion !== 1 || !calendar.calendars) {
      errors.push("The generated calendar snapshot placeholder is invalid.");
    }
  } catch {
    errors.push("The generated calendar snapshot placeholder is not valid JSON.");
  }
}
if (
  app.includes("api.allorigins.win") ||
  app.includes("corsproxy.io") ||
  app.includes("api.codetabs.com")
) {
  errors.push("Calendar loading must not depend on public CORS proxies.");
}

for (const id of [
  "mobile-section-tabs",
  "attendance-empty-guide",
  "healthy-systems",
  "resource-search",
  "frequent-resource-grid",
  "budget-used-context",
  "print-hub-button",
  "print-report-title",
  "print-report-meta",
]) {
  const selector = id === "mobile-section-tabs" ? 'class="mobile-section-tabs"' : `id="${id}"`;
  if (!html.includes(selector)) errors.push(`The visual dashboard control ${id} is missing.`);
}
if (!html.includes('<use href="#icon-settings"></use>') || html.includes("⚙")) {
  errors.push("Settings controls must use the shared SVG gear icon.");
}
if (!app.includes("renderFrequentResources") || !app.includes("renderAttendanceEmptyState")) {
  errors.push("The resource launcher or attendance empty-state flow is incomplete.");
}
if (
  !app.includes("prepareHubPrint") ||
  !styles.includes('data-print-mode="full"')
) {
  errors.push("The complete-hub print flow is incomplete.");
}
if (
  !styles.includes("main > .resources-section") ||
  !styles.includes("main a")
) {
  errors.push("The print report must exclude resource links and action links.");
}
if (
  !styles.includes(".goal-panel .panel-heading") ||
  !styles.includes("overflow-wrap: anywhere")
) {
  errors.push("The print engagement-goal card must contain long status and note text.");
}
if (
  !styles.includes(".upcoming-item .date-tile") ||
  !styles.includes("grid-template-columns: 32px minmax(0, 1fr) auto")
) {
  errors.push("The print upcoming-events list must stay compact enough for a two-page report.");
}
if (
  !styles.includes(".hero-panel + .dashboard-band") ||
  !styles.includes("margin-top: 24px") ||
  !styles.includes('body[data-theme="dark"] .healthy-systems summary strong') ||
  !styles.includes("color: #ffffff") ||
  !styles.includes('body[data-theme="dark"] .metric-empty-guide h3')
) {
  errors.push("Dashboard section spacing and dark-mode system-health contrast must remain legible.");
}
if (
  styles.includes(".attendance-data-empty .trend-panel") ||
  styles.includes(".attendance-data-empty .performance-panel")
) {
  errors.push("Attendance metric panels must remain visible when a period has no check-ins.");
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("ASME Hub checks passed.");
