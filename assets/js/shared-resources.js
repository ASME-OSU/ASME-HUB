(function (root) {
  "use strict";
  const headers = ["resource_id", "label", "url", "category", "roles", "sort_order", "enabled", "academic_year"];
  const roles = ["all", "president", "vice_president", "treasurer", "secretary", "social_chair", "webmaster", "ecouncil", "advisor"];
  const annualIds = ["attendance-check-in", "points-master", "budget-tracker", "banking", "fundraising", "events-calendar"];
  const text = value => String(value ?? "").trim();
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !!url.hostname;
    } catch (_) { return false; }
  }
  function validate(records) {
    if (!Array.isArray(records) || records.length > 1000) throw new Error("Invalid resource rows.");
    const keys = new Set();
    return records.map(record => {
      if (!record || Object.keys(record).some(key => !headers.includes(key)) || headers.some(key => !(key in record))) throw new Error("Unexpected resource fields.");
      const id = text(record.resource_id), year = text(record.academic_year);
      const label = text(record.label), category = text(record.category), url = text(record.url);
      if (!/^[a-z][a-z0-9-]{0,79}$/.test(id) || (year && !/^\d{4}-\d{4}$/.test(year))) throw new Error("Invalid resource ID or year.");
      if (year && Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) throw new Error("Invalid academic year.");
      const key = `${id}:${year}`;
      if (keys.has(key)) throw new Error("Duplicate resource ID and year.");
      keys.add(key);
      const assigned = text(record.roles).split(",").map(text);
      if (!assigned.length || assigned.some(role => !roles.includes(role)) || new Set(assigned).size !== assigned.length) throw new Error("Invalid resource roles.");
      const flag = text(record.enabled).toLowerCase();
      if (!["true", "false"].includes(flag)) throw new Error("Enabled must be TRUE or FALSE.");
      const order = text(record.sort_order);
      if (!/^\d{1,6}$/.test(order)) throw new Error("Invalid sort order.");
      if (!label || label.length > 100 || !category || category.length > 40 || /^[=+@]/.test(label) || /^[=+@]/.test(category)) throw new Error("Invalid resource label or category.");
      if (annualIds.includes(id) && url) throw new Error("Annual resource URLs must remain blank; use Year Settings.");
      if ((url && !safeUrl(url)) || (flag === "true" && !url && !annualIds.includes(id))) throw new Error("Use an absolute HTTP or HTTPS URL.");
      return { resource_id: id, label, url, category, roles: assigned.join(","), sort_order: Number(order), enabled: flag === "true", academic_year: year };
    });
  }
  function parse(table) {
    if (!Array.isArray(table?.rows) || table.cols?.length !== headers.length || headers.some((header, index) => table.cols[index]?.label !== header)) throw new Error("Expected exact resource headers A:H.");
    return validate(table.rows.filter(row => row.c?.some(cell => text(cell?.v))).map(row => Object.fromEntries(headers.map((header, index) => [header, row.c?.[index]?.v ?? ""]))));
  }
  function resolve(defaults, records, year, source) {
    const effective = new Map();
    // A global disabled record is an explicit tombstone for every year.
    for (const row of records.filter(row => !row.academic_year)) effective.set(row.resource_id, row);
    for (const row of records.filter(row => row.academic_year === year)) {
      if (effective.get(row.resource_id)?.enabled === false) continue;
      effective.set(row.resource_id, row);
    }
    const merged = new Map(defaults.map((item, index) => [item.id, { ...item, order: index * 10 }]));
    for (const [id, row] of effective) {
      if (!row.enabled) { merged.delete(id); continue; }
      const fallback = merged.get(id) || {};
      merged.set(id, { ...fallback, id, title: row.label, label: `Open ${row.label}`, url: row.url,
        category: row.category, roles: row.roles.split(","), order: row.sort_order,
        description: fallback.description || "Shared chapter resource", quickAction: fallback.quickAction ? { ...fallback.quickAction, label: row.label } : undefined });
    }
    return [...merged.values()].map(item => {
      if (!item.settingKey) return item;
      // Annual URL authority stays in Year Settings, including deliberate blanks.
      const url = source?.[item.settingKey] ?? "";
      const row = effective.get(item.id);
      const title = row ? item.title : item.settingKey === "attendanceFormUrl" ? `${source?.label || year} Attendance Check-In`
        : item.settingKey === "pointsMasterUrl" ? `${source?.label || year} Points Master`
        : item.settingKey === "budgetTrackerUrl" ? `${source?.label || year} Budget Tracker` : item.title;
      return { ...item, title, url: safeUrl(url) ? url : "" };
    }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }
  function readCache(raw, sourceKey) {
    try {
      const cache = JSON.parse(raw);
      if (cache.version !== 1 || cache.sourceKey !== sourceKey || !Number.isFinite(cache.checkedAt) || cache.checkedAt > Date.now()) return null;
      return { ...cache, records: validate(cache.records) };
    } catch (_) { return null; }
  }
  root.ASME_SHARED_RESOURCES = { headers, roles, safeUrl, validate, parse, resolve, readCache };
})(globalThis);
