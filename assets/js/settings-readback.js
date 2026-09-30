(function (root) {
  "use strict";
  const fields = [
    ["academic_year", "yearKey"], ["display_label", "label"],
    ["engagement_goal", "engagementGoal", "number"],
    ["attendance_sheet_url", "attendanceSheetUrl"], ["leaderboard_tab", "attendanceSheetTab"],
    ["dashboard_json_url", "dashboardUrl"], ["attendance_form_url", "attendanceFormUrl"],
    ["points_master_url", "pointsMasterUrl"], ["calendar_page_url", "calendarUrl"],
    ["calendar_ical_url", "calendarIcalUrl"], ["is_active", "isActive", "boolean"],
    ["is_current", "isCurrent", "boolean"], ["last_updated", null], ["status_note", null],
    ["event_metrics_tab", null], ["budget_tracker_url", "budgetTrackerUrl"],
    ["budget_export_sheet_url", "budgetExportSheetUrl"], ["budget_export_sheet_tab", "budgetExportSheetTab"],
    ["banking_url", "bankingUrl"], ["fundraising_url", "fundraisingUrl"],
  ];
  const text = value => String(value ?? "").trim();
  const cell = (row, index) => row?.c?.[index]?.v;
  function boolean(value) {
    const clean = text(value).toLowerCase();
    if (["true", "yes", "1"].includes(clean)) return true;
    if (["false", "no", "0"].includes(clean)) return false;
    return null;
  }
  function compare(table, expected) {
    const fail = message => ({ matched: false, message: `${message} No shared save is confirmed. Your form and tab preview are unchanged.` });
    if (!Array.isArray(table?.rows) || fields.some(([header], index) => table.cols?.[index]?.label !== header)) {
      return fail("The settings headers or response are unexpected. Check the original A:T column order in Google.");
    }
    const rows = table.rows.filter(row => text(cell(row, 0)));
    const keys = rows.map(row => text(cell(row, 0)));
    if (new Set(keys).size !== keys.length) return fail("Duplicate academic-year rows found. Resolve the conflict in Google before comparing again.");
    const row = rows.find(item => text(cell(item, 0)) === expected.yearKey);
    if (!row) return fail("This academic year was not returned by Google. Check the saved row and allow time for propagation.");
    if (rows.some(item => boolean(cell(item, 10)) === null || boolean(cell(item, 11)) === null)) {
      return fail("Every year's is_active and is_current cells must contain explicit TRUE or FALSE values.");
    }
    const current = rows.filter(item => boolean(cell(item, 11)));
    if (current.length !== 1 || !boolean(cell(current[0], 10))) {
      return fail("Google must have exactly one current year, and that row must be active. Review the year flags without activating a draft.");
    }
    const differences = fields.flatMap(([header, key, type], index) => {
      if (!key) return [];
      const value = cell(row, index);
      const actual = type === "boolean" ? boolean(value) : type === "number" ? (text(value) ? Number(value) : NaN) : text(value);
      return actual === expected[key] ? [] : [header];
    });
    if (differences.length) return fail(`Google differs from this form: ${differences.join(", ")}. Inspect the saved row for unsaved edits, propagation delay, or another editor's changes.`);
    return { matched: true, message: `Google readback matches this form for ${expected.yearKey}. Current year reported by Google: ${text(cell(current[0], 0))}. Checked at ${new Date().toLocaleTimeString()}. This is a public row comparison, not confirmation of a Hub save or downstream refresh. Your tab preview is unchanged; check a fresh Hub tab too.` };
  }
  root.ASME_SETTINGS_READBACK = { compare, fields };
})(globalThis);
