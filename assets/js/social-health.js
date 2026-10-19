(function (root) {
  "use strict";
  const hour = 3600000;
  const day = 24 * hour;
  const labels = { feed: "Instagram feed", story: "Instagram story", groupme: "GroupMe" };
  const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
  function unavailable(detail) {
    return result([detail]);
  }
  function result(issues, summary = "") {
    return {
      health: { label: "Social posting", status: issues.length ? "ACTION" : "LIVE", detail: issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}. ${issues.slice(0, 5).join("; ")}${issues.length > 5 ? "; open Social Hub for the remaining items" : ""}.` : summary },
      operations: issues.length ? [{ severity: "warning", title: "Social posting needs attention", detail: issues.join("; ") + ". Confirm publication in Social Hub before retrying an uncertain post.", actionLabel: "Open Social Hub", actionUrl: "https://asme-osu.github.io/ASME-Social-Hub/" }] : [],
      issues,
    };
  }
  function evaluateSnapshot(feed, { year, calendarEvents = [], calendarHealthy = false, calendarUrl = "", now = Date.now() } = {}) {
    const issues = [];
    if (!feed || feed.schemaVersion !== 1 || !Array.isArray(feed.campaigns) || !Array.isArray(feed.calendar?.candidates)) return unavailable("Posting monitor data is unavailable or malformed");
    const fresh = (stamp, max) => validDate(stamp) && now - Date.parse(stamp) >= -5 * 60000 && now - Date.parse(stamp) <= max;
    if (!fresh(feed.generatedAt, 6 * hour)) issues.push("Social Hub posting monitor is stale or has an invalid timestamp");
    if (!fresh(feed.calendar.generatedAt, 48 * hour)) issues.push("Social Hub calendar import is stale or unavailable");
    if (!calendarHealthy) issues.push("Current calendar coverage cannot be verified");
    if (!calendarUrl || feed.calendar.feedUrl !== calendarUrl) issues.push("Social Hub and this year's calendar are not connected to the same feed");
    const shortYear = /^\d{4}-\d{4}$/.test(year || "") ? `${year.slice(0, 4)}-${year.slice(-2)}` : year;
    if (feed.activeYear !== shortYear) issues.push("Social Hub is not configured for the selected academic year");
    const campaigns = feed.campaigns.filter(c => c.year === shortYear && !c.demo && !c.cancelled && !c.archived);
    if (campaigns.some(c => !c.id || !c.title || !validDate(c.start) || !validDate(c.end) || !c.channels)) return unavailable("Social Hub campaign data is malformed");
    let receipts = 0, scheduled = 0;
    for (const c of campaigns) {
      if (Date.parse(c.end) < now - 7 * day || Date.parse(c.start) > now + 14 * day) continue;
      for (const channel of Object.keys(labels)) {
        const record = c.channels[channel];
        if (!record || typeof record.enabled !== "boolean") { issues.push(`${c.title}: ${labels[channel]} monitoring is invalid`); continue; }
        if (!record.enabled) continue;
        const prefix = `${c.title}: ${labels[channel]}`;
        if (!record.immediate && !validDate(record.dueAt)) { issues.push(`${prefix} schedule is invalid`); continue; }
        const receipt = channel !== "groupme"
          ? Boolean(record.mediaId && validDate(record.postedAt) && Date.parse(record.postedAt) <= now + 5 * 60000)
          : feed.config?.groupme?.mode === "bot"
            ? validDate(record.botSentAt) && Date.parse(record.botSentAt) <= now + 5 * 60000
            : Boolean(record.eventId && !record.deletedAt && record.syncedRevision === c.revision);
        if (record.status === "failed") issues.push(`${prefix} failed or needs reconciliation`);
        else if (receipt) receipts++;
        else if (record.status === "done") issues.push(`${prefix} is marked done without a publication receipt`);
        else if (record.publishAttemptedAt || record.createAttemptedAt || record.botAttemptedAt) issues.push(`${prefix} outcome is unconfirmed; reconcile before retrying`);
        else if (record.immediate) issues.push(`${prefix} needs native event creation or an update receipt`);
        else if (now >= Date.parse(record.dueAt) + 2 * hour) issues.push(`${prefix} is overdue without a publication receipt${record.status === "skipped" ? " (publishing window skipped)" : ""}`);
        else scheduled++;
      }
    }
    // Timed chapter events only. All-day academic notices do not require campaigns.
    for (const event of calendarEvents) {
      const start = event.startAt || event.date;
      if (event.allDay || !validDate(start) || Date.parse(start) < now || Date.parse(start) > now + 14 * day) continue;
      const matches = campaigns.filter(c => c.source?.uid === event.id || (Date.parse(c.start) === Date.parse(start) && c.title.trim().toLowerCase() === String(event.title).trim().toLowerCase()));
      if (matches.length > 1) { issues.push(`${event.title}: multiple campaigns need review`); continue; }
      if (matches.length === 1) continue;
      const candidate = feed.calendar.candidates.find(c => c.id === event.id || (Date.parse(c.start) === Date.parse(start) && c.title === event.title));
      if (!candidate) { issues.push(`${event.title}: calendar event is missing from Social Hub's import`); continue; }
      const due = candidate.dueAt?.feed;
      if (!validDate(due)) issues.push(`${event.title}: promotion deadline cannot be verified`);
      else if (now >= Date.parse(due) + 2 * hour) issues.push(`${event.title}: promotion is due but no real campaign or posting receipt is recorded`);
    }
    const token = feed.tokenWarning;
    if (!token || !fresh(token.checkedAt, 48 * hour) || !token.configured || !["healthy", "ok", "valid"].includes(token.status)) issues.push("Instagram publishing credentials or token expiry need verification in Social Hub");
    return result([...new Set(issues)], `${receipts} publication receipt${receipts === 1 ? "" : "s"} verified; ${scheduled} enabled post${scheduled === 1 ? "" : "s"} not yet due. Checked ${new Date(feed.generatedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Upcoming timed events and campaigns from the last 7 days; receipts do not verify later deletions.`);
  }
  function evaluate(feed, options) {
    try { return evaluateSnapshot(feed, options); }
    catch (_) { return unavailable("Social Hub posting monitor data is malformed; publication is unverified"); }
  }
  root.ASME_SOCIAL_HEALTH = { evaluate, unavailable };
})(globalThis);
