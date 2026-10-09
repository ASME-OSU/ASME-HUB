import { validateAnnualLinkDraft } from "./annual-link-draft.js?v=20261009b";

// A reviewable transfer file, never authorization or evidence of Google access.
export function annualSettingsInput(handoff, settings, config = {}, extra = {}) {
  const checked = validateAnnualLinkDraft(handoff, settings.yearKey, config);
  if (checked.mock) throw new Error("Private mock settings are reviewed directly in the copied Control Center; do not send them to the legacy annual save service.");
  if (settings.isActive || settings.isCurrent || checked.year === config.currentAcademicYear) throw new Error("Keep the new year inactive and noncurrent before preparing its Google save.");
  const linked = { pointsExport: "attendanceSheetUrl", attendanceFormRespondent: "attendanceFormUrl", pointsMaster: "pointsMasterUrl", budgetTracker: "budgetTrackerUrl", budgetExport: "budgetExportSheetUrl" };
  for (const [key, field] of Object.entries(linked)) {
    if (!checked.links[key] || settings[field] !== checked.links[key]) throw new Error("Annual links changed in Year Settings. Return to the guide, update the copied links, and review the affected checks.");
  }
  if (Object.keys(checked.links).length !== 7) throw new Error("Complete all seven annual links before preparing a Google save.");
  const values = {
    display_label: settings.label, engagement_goal: settings.engagementGoal,
    leaderboard_tab: settings.attendanceSheetTab, dashboard_json_url: settings.dashboardUrl,
    calendar_page_url: settings.calendarUrl, calendar_ical_url: settings.calendarIcalUrl,
    status_note: extra.statusNote ?? "Draft; annual checks pending",
    event_metrics_tab: extra.eventMetricsTab ?? "Event_Metrics_Public",
    budget_export_sheet_tab: settings.budgetExportSheetTab,
    banking_url: settings.bankingUrl, fundraising_url: settings.fundraisingUrl,
  };
  if (!values.display_label || !values.leaderboard_tab || !values.event_metrics_tab || !values.budget_export_sheet_tab) throw new Error("Enter the display label and exact public export tab names.");
  for (const [key, value] of Object.entries(values)) {
    if (key === "engagement_goal") {
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a positive engagement goal.");
    } else if (typeof value !== "string" || value !== value.trim() || /^[=+@-]/.test(value)) throw new Error(`Use a literal reviewed value for ${key}.`);
  }
  return { schema: 1, type: "asme-annual-settings-input", handoff: checked, values };
}

// Fragment contents stay out of the HTTP request; they contain no authorization.
export function annualSettingsTransferUrl(serviceUrl, input) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(serviceUrl)) throw new Error("The chapter annual save service is not connected.");
  const source = JSON.stringify(input);
  if (new TextEncoder().encode(source).length > 16000) throw new Error("The settings exceed 16 KB. Shorten the public notes and URLs.");
  return `${serviceUrl}#annual=${encodeURIComponent(source)}`;
}
