(function () {
  "use strict";

  const config = window.ASME_HUB_CONFIG;
  const unlockStorageKey = "asmeHubUnlockedUntil";
  const themeStorageKey = "asmeHubTheme";
  const yearSettingsStorageKey = "asmeHubYearSettingsPreviewV2";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const eventTypeColumns = [
    { column: 7, name: "General Body", color: "#184a7d" },
    { column: 8, name: "Social", color: "#4f7cac" },
    { column: 9, name: "Company Info Sessions", color: "#ba0c2f" },
    { column: 10, name: "Technical Workshops", color: "#d69e2e" },
    { column: 11, name: "Build Nights / Projects", color: "#427aa1" },
    { column: 12, name: "Volunteering / Outreach", color: "#6b7f52" },
    { column: 13, name: "Committee Work", color: "#7b8797" },
  ];
  let sharedYearSources = cloneConfiguredSources();
  let yearSources = loadYearSources();
  let sharedSettingsReady = Promise.resolve();

  const elements = {
    gate: document.getElementById("access-gate"),
    accessForm: document.getElementById("access-form"),
    password: document.getElementById("hub-password"),
    passwordToggle: document.getElementById("password-toggle"),
    accessError: document.getElementById("access-error"),
    appShell: document.getElementById("app-shell"),
    loadingLayer: document.getElementById("loading-layer"),
    lockDashboard: document.getElementById("lock-dashboard"),
    academicYear: document.getElementById("academic-year"),
    sidebarYear: document.getElementById("sidebar-year-label"),
    themeToggle: document.getElementById("theme-toggle"),
    mobileMenuButton: document.getElementById("mobile-menu-button"),
    settingsButton: document.getElementById("settings-button"),
    sidebarSettings: document.getElementById("sidebar-settings"),
    settingsDialog: document.getElementById("year-settings-dialog"),
    settingsForm: document.getElementById("year-settings-form"),
    settingsClose: document.getElementById("settings-close"),
    settingsCancel: document.getElementById("settings-cancel"),
    settingsNewYear: document.getElementById("settings-new-year"),
    settingsReset: document.getElementById("settings-reset"),
    settingsStatus: document.getElementById("settings-status"),
    settingsYearKey: document.getElementById("settings-year-key"),
    settingsYearLabel: document.getElementById("settings-year-label"),
    settingsEngagementGoal: document.getElementById("settings-engagement-goal"),
    settingsAttendanceSheet: document.getElementById(
      "settings-attendance-sheet",
    ),
    settingsAttendanceTab: document.getElementById("settings-attendance-tab"),
    settingsDashboardUrl: document.getElementById("settings-dashboard-url"),
    settingsAttendanceForm: document.getElementById(
      "settings-attendance-form",
    ),
    settingsPointsMaster: document.getElementById("settings-points-master"),
    settingsCalendar: document.getElementById("settings-calendar"),
    settingsCalendarIcal: document.getElementById("settings-calendar-ical"),
    settingsSharedLink: document.getElementById("settings-shared-link"),
    settingsSharedAction: document.getElementById("settings-shared-action"),
  };

  function getUnlockedUntil() {
    return Number(sessionStorage.getItem(unlockStorageKey) || 0);
  }

  function isUnlocked() {
    return getUnlockedUntil() > Date.now();
  }

  async function sha256(value) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Secure password checking is unavailable in this browser.");
    }

    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function cloneConfiguredSources() {
    return Object.fromEntries(
      Object.entries(config.dataSources || {}).map(([year, source]) => [
        year,
        { ...source },
      ]),
    );
  }

  function loadYearSources() {
    const defaults = Object.fromEntries(
      Object.entries(sharedYearSources || {}).map(([year, source]) => [
        year,
        { ...source },
      ]),
    );

    try {
      const stored = JSON.parse(
        sessionStorage.getItem(yearSettingsStorageKey) || "{}",
      );
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
        return defaults;
      }

      Object.entries(stored).forEach(([year, source]) => {
        if (!source || typeof source !== "object" || Array.isArray(source)) {
          return;
        }
        defaults[year] = { ...(defaults[year] || {}), ...source };
      });
    } catch (error) {
      console.warn("Academic-year settings could not be read.", error);
    }

    return defaults;
  }

  function saveYearSources() {
    const previews = {};
    Object.entries(yearSources).forEach(([year, source]) => {
      const shared = sharedYearSources[year];
      if (!shared || JSON.stringify(source) !== JSON.stringify(shared)) {
        previews[year] = source;
      }
    });
    sessionStorage.setItem(yearSettingsStorageKey, JSON.stringify(previews));
  }

  function getYearSource(year = elements.academicYear.value) {
    return yearSources[year] || null;
  }

  function normalizeYearKey(value) {
    return String(value || "")
      .trim()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, "");
  }

  function displayLabelForYear(year) {
    return normalizeYearKey(year).replace("-", "–");
  }

  function nextAcademicYear(year) {
    const match = normalizeYearKey(year).match(/^(\d{4})-(\d{4})$/);
    if (!match) return "";
    return `${Number(match[1]) + 1}-${Number(match[2]) + 1}`;
  }

  function isUsableUrl(value, options = {}) {
    const clean = String(value || "").trim();
    if (!clean) return true;
    if (options.allowSheetId && /^[\w-]{20,}$/.test(clean)) return true;

    try {
      const parsed = new URL(clean, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  function fillSettingsForm(yearKey, source = {}, isNew = false) {
    elements.settingsForm.dataset.originalYear = isNew ? "" : yearKey;
    elements.settingsYearKey.value = yearKey || "";
    elements.settingsYearLabel.value =
      source.label || displayLabelForYear(yearKey);
    elements.settingsEngagementGoal.value =
      source.engagementGoal || source.goal || "";
    elements.settingsAttendanceSheet.value =
      source.attendanceSheetUrl || "";
    elements.settingsAttendanceTab.value =
      source.attendanceSheetTab || "Leaderboard_Public";
    elements.settingsDashboardUrl.value = source.dashboardUrl || "";
    elements.settingsAttendanceForm.value = source.attendanceFormUrl || "";
    elements.settingsPointsMaster.value = source.pointsMasterUrl || "";
    elements.settingsCalendar.value = source.calendarUrl || "";
    elements.settingsCalendarIcal.value = source.calendarIcalUrl || "";
    elements.settingsStatus.textContent = "";
    elements.settingsReset.hidden =
      isNew || !sharedYearSources || !sharedYearSources[yearKey];
  }

  function openSettings(year = elements.academicYear.value) {
    const selectedYear = year || config.currentAcademicYear;
    fillSettingsForm(
      selectedYear,
      getYearSource(selectedYear) || {},
      !getYearSource(selectedYear),
    );
    document.body.classList.remove("nav-open");
    elements.mobileMenuButton.setAttribute("aria-expanded", "false");

    if (typeof elements.settingsDialog.showModal === "function") {
      elements.settingsDialog.showModal();
    } else {
      elements.settingsDialog.setAttribute("open", "");
    }
    window.setTimeout(() => {
      elements.settingsForm.scrollTop = 0;
      elements.settingsYearLabel.focus({ preventScroll: true });
    }, 50);
  }

  function closeSettings() {
    if (typeof elements.settingsDialog.close === "function") {
      elements.settingsDialog.close();
    } else {
      elements.settingsDialog.removeAttribute("open");
    }
  }

  function readSettingsForm() {
    return {
      yearKey: normalizeYearKey(elements.settingsYearKey.value),
      label: elements.settingsYearLabel.value.trim(),
      engagementGoal: Number(elements.settingsEngagementGoal.value) || 250,
      attendanceSheetUrl: elements.settingsAttendanceSheet.value.trim(),
      attendanceSheetTab:
        elements.settingsAttendanceTab.value.trim() || "Leaderboard_Public",
      dashboardUrl: elements.settingsDashboardUrl.value.trim(),
      attendanceFormUrl: elements.settingsAttendanceForm.value.trim(),
      pointsMasterUrl: elements.settingsPointsMaster.value.trim(),
      calendarUrl: elements.settingsCalendar.value.trim(),
      calendarIcalUrl: elements.settingsCalendarIcal.value.trim(),
    };
  }

  function validateSettings(settings) {
    if (!/^\d{4}-\d{4}$/.test(settings.yearKey)) {
      return "Use an academic year in the format 2026-2027.";
    }
    if (!settings.label) return "Add a display label for this year.";
    if (!settings.dashboardUrl && !settings.attendanceSheetUrl) {
      return "Add either a public leaderboard Sheet or a full dashboard JSON URL.";
    }

    const urls = [
      ["public leaderboard Sheet", settings.attendanceSheetUrl, true],
      ["dashboard JSON", settings.dashboardUrl, false],
      ["attendance form", settings.attendanceFormUrl, false],
      ["Points Master", settings.pointsMasterUrl, false],
      ["events calendar page", settings.calendarUrl, false],
      ["Google Calendar iCal", settings.calendarIcalUrl, false],
    ];
    const invalid = urls.find(
      ([, value, allowSheetId]) =>
        !isUsableUrl(value, { allowSheetId: Boolean(allowSheetId) }),
    );
    return invalid ? `Check the ${invalid[0]} link.` : "";
  }

  function showGate() {
    sessionStorage.removeItem(unlockStorageKey);
    elements.appShell.hidden = true;
    elements.gate.hidden = false;
    document.body.classList.remove("nav-open");
    window.setTimeout(() => elements.password.focus(), 50);
  }

  async function unlockDashboard() {
    await sharedSettingsReady;
    const expiresAt =
      Date.now() + Number(config.access.sessionHours || 12) * 60 * 60 * 1000;
    sessionStorage.setItem(unlockStorageKey, String(expiresAt));
    elements.gate.hidden = true;
    elements.appShell.hidden = false;
    await loadDashboard(elements.academicYear.value);
  }

  function populateYears(preferredYear) {
    const previousYear =
      preferredYear || elements.academicYear.value || config.currentAcademicYear;
    const years = Object.entries(yearSources).sort(([a], [b]) =>
      b.localeCompare(a),
    );

    elements.academicYear.replaceChildren(
      ...years.map(([value, source]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = source.label || value;
        option.selected = value === previousYear;
        return option;
      }),
    );

    if (!elements.academicYear.value && years.length) {
      elements.academicYear.value = yearSources[config.currentAcademicYear]
        ? config.currentAcademicYear
        : years[0][0];
    }

    updateYearLabel();
  }

  function updateYearLabel() {
    const source = getYearSource();
    const label = (source && source.label) || elements.academicYear.value;
    elements.sidebarYear.textContent = label;
    setText(
      "resource-year-description",
      `Current officer workspaces, member tools, and public chapter resources for ${label}.`,
    );
  }

  function showLoading(isLoading) {
    elements.loadingLayer.hidden = !isLoading;
  }

  function spreadsheetIdFrom(value) {
    const clean = String(value || "").trim();
    const urlMatch = clean.match(/\/spreadsheets\/d\/([\w-]+)/i);
    if (urlMatch) return urlMatch[1];
    return /^[\w-]{20,}$/.test(clean) ? clean : "";
  }

  function queryPublicSheet(spreadsheetId, sheet, query) {
    return new Promise((resolve, reject) => {
      const callback = `__asmeHubSheet_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const script = document.createElement("script");
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("The Google Sheet request timed out."));
      }, 15000);
      const cleanup = () => {
        window.clearTimeout(timer);
        delete window[callback];
        script.remove();
      };

      window[callback] = (data) => {
        cleanup();
        if (!data || !data.table) {
          reject(new Error("The Google Sheet returned an unexpected response."));
          return;
        }
        resolve(data.table);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("The public Google Sheet could not be loaded."));
      };

      const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
      const params = new URLSearchParams({
        sheet,
        headers: "1",
        tqx: `out:json;responseHandler:${callback}`,
        tq: query,
        _: String(Date.now()),
      });
      script.src = `${base}?${params.toString()}`;
      document.head.appendChild(script);
    });
  }

  function sheetCell(row, index, formatted = false) {
    const cell = row && row.c && row.c[index];
    if (!cell) return "";
    if (formatted && cell.f !== null && cell.f !== undefined) return cell.f;
    return cell.v !== null && cell.v !== undefined ? cell.v : "";
  }

  function sheetTimestamp(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number") {
      const epoch = Date.UTC(1899, 11, 30);
      return new Date(epoch + value * 86400000);
    }

    const dateConstructor = String(value || "").match(
      /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/,
    );
    if (dateConstructor) {
      return new Date(
        Number(dateConstructor[1]),
        Number(dateConstructor[2]),
        Number(dateConstructor[3]),
        Number(dateConstructor[4] || 0),
        Number(dateConstructor[5] || 0),
        Number(dateConstructor[6] || 0),
      );
    }

    const clean = String(value || "").trim();
    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const isoLike = new Date(clean.replace(" ", "T"));
    return Number.isNaN(isoLike.getTime()) ? null : isoLike;
  }

  async function loadSharedYearSources() {
    const settings = config.sharedSettings || {};
    const spreadsheetId = spreadsheetIdFrom(settings.spreadsheetUrl);
    if (!spreadsheetId || !settings.sheetTab) return;

    try {
      const table = await queryPublicSheet(
        spreadsheetId,
        settings.sheetTab,
        "select A,B,C,D,E,F,G,H,I,J where A is not null",
      );
      const remoteSources = {};

      (table.rows || []).forEach((row) => {
        const yearKey = normalizeYearKey(sheetCell(row, 0));
        if (!/^\d{4}-\d{4}$/.test(yearKey)) return;
        remoteSources[yearKey] = {
          ...(sharedYearSources[yearKey] || {}),
          label: String(sheetCell(row, 1) || displayLabelForYear(yearKey)),
          engagementGoal: Number(sheetCell(row, 2)) || 250,
          attendanceSheetUrl: String(sheetCell(row, 3) || "").trim(),
          attendanceSheetTab:
            String(sheetCell(row, 4) || "").trim() || "Leaderboard_Public",
          dashboardUrl: String(sheetCell(row, 5) || "").trim(),
          attendanceFormUrl: String(sheetCell(row, 6) || "").trim(),
          pointsMasterUrl: String(sheetCell(row, 7) || "").trim(),
          calendarUrl: String(sheetCell(row, 8) || "").trim(),
          calendarIcalUrl: String(sheetCell(row, 9) || "").trim(),
        };
      });

      if (Object.keys(remoteSources).length) {
        sharedYearSources = { ...sharedYearSources, ...remoteSources };
        yearSources = loadYearSources();
      }
    } catch (error) {
      console.warn(
        "Shared academic-year settings could not be loaded; using the deployed defaults.",
        error,
      );
    }
  }

  async function loadLeaderboardDashboard(source) {
    const spreadsheetId = spreadsheetIdFrom(source.attendanceSheetUrl);
    if (!spreadsheetId) {
      throw new Error("The public leaderboard Google Sheet link is not valid.");
    }

    const leaderboardTab =
      source.attendanceSheetTab || "Leaderboard_Public";
    const [leaderboard, statusTable] = await Promise.all([
      queryPublicSheet(
        spreadsheetId,
        leaderboardTab,
        "select A,B,C,D,E,F,G,H,I,J,K,L,M,N,O where B is not null",
      ),
      queryPublicSheet(
        spreadsheetId,
        "System_Status",
        "select A,B where A is not null",
      ).catch(() => ({ rows: [] })),
    ]);

    const members = (leaderboard.rows || [])
      .map((row) => ({
        name: String(sheetCell(row, 1) || "").trim(),
        events: Number(sheetCell(row, 4)) || 0,
        updated: sheetTimestamp(
          sheetCell(row, 6, true) || sheetCell(row, 6),
        ),
        eventTypes: eventTypeColumns.map((type) => ({
          ...type,
          count: Number(sheetCell(row, type.column)) || 0,
        })),
      }))
      .filter((member) => member.name);

    const totalCheckIns = members.reduce(
      (sum, member) => sum + member.events,
      0,
    );
    const repeatAttendees = members.filter(
      (member) => member.events >= 2,
    ).length;
    const latestUpdate = members
      .map((member) => member.updated)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const systemStatus =
      (statusTable.rows || [])
        .map((row) => [
          String(sheetCell(row, 0) || "").toLowerCase(),
          String(sheetCell(row, 1) || "").toUpperCase(),
        ])
        .find(([key]) => key === "system_status")?.[1] || "LIVE";
    const eventTypes = eventTypeColumns
      .map((type) => ({
        name: type.name,
        count: members.reduce(
          (sum, member) =>
            sum +
            (member.eventTypes.find((item) => item.column === type.column)
              ?.count || 0),
          0,
        ),
        events: null,
        color: type.color,
      }))
      .filter((type) => type.count > 0);

    return {
      meta: {
        academicYear: source.label,
        lastUpdated: latestUpdate
          ? latestUpdate.toISOString()
          : new Date().toISOString(),
        isDemo: false,
        isPartial: true,
        sourceLabel: "Public leaderboard export",
      },
      kpis: {
        uniqueAttendees: members.length,
        totalCheckIns,
        eventsHeld: null,
        averageTurnout: null,
        repeatAttendanceRate: members.length
          ? (repeatAttendees / members.length) * 100
          : 0,
        engagementGoal: Number(source.engagementGoal) || 250,
      },
      attendanceTrend: [],
      eventTypes,
      upcomingEvents: [],
      operations: [
        {
          severity: systemStatus === "LIVE" ? "success" : "warning",
          title:
            systemStatus === "LIVE"
              ? "Public attendance totals are connected"
              : `Point system status: ${systemStatus.toLowerCase()}`,
          detail:
            "Member totals, repeat attendance, and event-type counts are loading from the privacy-safe website export.",
          actionLabel: "Open public export",
          actionUrl: source.attendanceSheetUrl,
        },
        {
          severity: "info",
          title: "Event-level feed is optional",
          detail:
            "Add a full aggregate JSON URL in Year Settings to populate events held, average turnout, the trend chart, and upcoming events.",
          actionLabel: "Open year settings",
          actionUrl: "#year-settings",
        },
      ],
    };
  }

  function resolveYearResources(source) {
    return (config.resources || []).map((resource) => {
      if (!resource.settingKey) return { ...resource };
      const url = source?.[resource.settingKey] || resource.url || "";
      const title =
        resource.settingKey === "attendanceFormUrl"
          ? `${source?.label || "Current year"} Attendance Check-In`
          : resource.settingKey === "pointsMasterUrl"
            ? `${source?.label || "Current year"} Points Master`
            : resource.title;
      return { ...resource, title, url };
    });
  }

  async function loadDashboard(year) {
    const source = getYearSource(year);
    if (!source) {
      showDataError("No data source is configured for this academic year.");
      return;
    }

    renderResources(resolveYearResources(source));
    const calendarLink = document.querySelector(".upcoming-panel .text-link");
    if (calendarLink && source.calendarUrl) {
      calendarLink.href = source.calendarUrl;
    }
    showLoading(true);

    try {
      let data;
      if (source.dashboardUrl) {
        const response = await fetch(source.dashboardUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Data request failed with status ${response.status}.`);
        }
        data = await response.json();
      } else if (source.attendanceSheetUrl) {
        data = await loadLeaderboardDashboard(source);
      } else if (source.url) {
        const response = await fetch(source.url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Data request failed with status ${response.status}.`);
        }
        data = await response.json();
      } else {
        throw new Error("No attendance data source is configured.");
      }
      renderDashboard(data, source);
      updateYearLabel();
    } catch (error) {
      console.error(error);
      showDataError(error.message || "The dashboard data could not be loaded.");
    } finally {
      showLoading(false);
    }
  }

  function showDataError(message) {
    document.getElementById("last-updated").textContent = "Data unavailable";
    document.getElementById("operations-list").innerHTML = `
      <article class="operation-item is-warning">
        <strong>Dashboard source unavailable</strong>
        <p>${message}</p>
      </article>
    `;
    document.getElementById("operations-count").textContent = "1 item";
    document.getElementById("nav-alert-count").textContent = "1";
  }

  function renderDashboard(data) {
    renderFreshness(data.meta || {});
    renderKpis(data.kpis || {}, data.meta || {});
    renderAttendanceChart(data.attendanceTrend || []);
    renderGoal(data.kpis || {});
    renderEventTypes(data.eventTypes || []);
    renderUpcomingEvents(data.upcomingEvents || []);
    renderOperations(data.operations || []);
  }

  function renderFreshness(meta) {
    const target = document.getElementById("last-updated");
    const updated = meta.lastUpdated ? new Date(meta.lastUpdated) : null;

    if (!updated || Number.isNaN(updated.getTime())) {
      target.textContent = meta.isDemo ? "Demo data" : "Not provided";
      return;
    }

    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(updated);

    target.textContent = `${formatted}${meta.isDemo ? " · Demo" : ""}`;
  }

  function renderKpis(kpis, meta) {
    setText("kpi-unique-attendees", formatNumber(kpis.uniqueAttendees));
    setText("kpi-total-checkins", formatNumber(kpis.totalCheckIns));
    setText("kpi-events-held", formatNumber(kpis.eventsHeld));
    setText(
      "kpi-average-turnout",
      hasMetric(kpis.averageTurnout)
        ? Number(kpis.averageTurnout).toFixed(1)
        : "—",
    );
    setText(
      "kpi-repeat-rate",
      hasMetric(kpis.repeatAttendanceRate)
        ? `${Math.round(Number(kpis.repeatAttendanceRate))}%`
        : "—",
    );

    if (meta.isPartial) {
      setText(
        "kpi-unique-attendees-context",
        "Members with public attendance totals",
      );
      setText(
        "kpi-total-checkins-context",
        "Summed from member event totals",
      );
      setText("kpi-events-held-context", "Add a full aggregate JSON feed");
      setText("kpi-average-turnout-context", "Add a full aggregate JSON feed");
      setText("kpi-repeat-rate-context", "Attended two or more events");
    } else {
      setText("kpi-unique-attendees-context", "Across all recorded events");
      setText("kpi-total-checkins-context", "All attendance submissions");
      setText("kpi-events-held-context", "Approved events this year");
      setText("kpi-average-turnout-context", "Check-ins per event");
      setText("kpi-repeat-rate-context", "Attended two or more events");
    }
  }

  function renderAttendanceChart(items) {
    const svg = document.getElementById("attendance-chart");
    const legend = document.getElementById("attendance-chart-legend");
    const summary = document.getElementById("trend-summary");
    svg.replaceChildren();
    legend.replaceChildren();

    if (!items.length) {
      svg.setAttribute("viewBox", "0 0 700 285");
      svg.innerHTML =
        '<text x="350" y="142" text-anchor="middle" class="chart-axis-label">No attendance data available</text>';
      summary.textContent = "No events";
      return;
    }

    const width = 760;
    const height = 285;
    const margin = { top: 27, right: 18, bottom: 47, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const values = items.map((item) => Number(item.attendance) || 0);
    const rawMax = Math.max(...values, 10);
    const yMax = Math.ceil(rawMax / 10) * 10;
    const xStep = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth;
    const pointFor = (value, index) => ({
      x: margin.left + (items.length === 1 ? innerWidth / 2 : xStep * index),
      y: margin.top + innerHeight - (value / yMax) * innerHeight,
    });
    const points = values.map(pointFor);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    const defs = svgElement("defs");
    const gradient = svgElement("linearGradient", {
      id: "attendance-area-gradient",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    gradient.append(
      svgElement("stop", {
        offset: "0%",
        "stop-color": "#ba0c2f",
        "stop-opacity": "0.19",
      }),
      svgElement("stop", {
        offset: "100%",
        "stop-color": "#ba0c2f",
        "stop-opacity": "0",
      }),
    );
    defs.append(gradient);
    svg.append(defs);

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = (yMax / 4) * tick;
      const y = margin.top + innerHeight - (value / yMax) * innerHeight;
      svg.append(
        svgElement("line", {
          x1: margin.left,
          y1: y,
          x2: width - margin.right,
          y2: y,
          class: "chart-grid-line",
        }),
      );
      const label = svgElement("text", {
        x: margin.left - 9,
        y: y + 3,
        "text-anchor": "end",
        class: "chart-axis-label",
      });
      label.textContent = String(Math.round(value));
      svg.append(label);
    }

    const linePath = points
      .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${
      margin.top + innerHeight
    } L ${points[0].x} ${margin.top + innerHeight} Z`;

    svg.append(
      svgElement("path", { d: areaPath, class: "chart-area" }),
      svgElement("path", { d: linePath, class: "chart-line" }),
    );

    points.forEach((point, index) => {
      const valueLabel = svgElement("text", {
        x: point.x,
        y: point.y - 12,
        "text-anchor": "middle",
        class: "chart-point-label",
      });
      valueLabel.textContent = String(values[index]);

      const xLabel = svgElement("text", {
        x: point.x,
        y: height - 14,
        "text-anchor": "middle",
        class: "chart-axis-label",
      });
      xLabel.textContent = items[index].shortLabel || items[index].label;

      const circle = svgElement("circle", {
        cx: point.x,
        cy: point.y,
        r: 4.5,
        class: "chart-point",
      });
      const title = svgElement("title");
      title.textContent = `${items[index].label}: ${values[index]} attendees`;
      circle.append(title);

      svg.append(valueLabel, xLabel, circle);
    });

    const eventTypes = [...new Set(items.map((item) => item.type).filter(Boolean))];
    const colors = ["#ba0c2f", "#184a7d", "#d69e2e", "#4f7cac", "#7b8797"];
    eventTypes.forEach((type, index) => {
      const item = document.createElement("span");
      const dot = document.createElement("i");
      dot.style.backgroundColor = colors[index % colors.length];
      item.append(dot, document.createTextNode(type));
      legend.append(item);
    });

    summary.textContent = `${items.length} recent event${items.length === 1 ? "" : "s"}`;
  }

  function renderGoal(kpis) {
    const current = Number(kpis.uniqueAttendees) || 0;
    const target = Number(kpis.engagementGoal) || 0;
    const percent = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const remaining = Math.max(0, target - current);
    const ring = document.getElementById("goal-ring");

    ring.style.setProperty("--goal-progress", `${percent}%`);
    ring.setAttribute(
      "aria-label",
      `${formatNumber(current)} of ${formatNumber(target)} unique attendees, ${percent} percent`,
    );
    setText("goal-percent", `${percent}%`);
    setText("goal-current", formatNumber(current));
    setText("goal-target", formatNumber(target));
    setText(
      "goal-note",
      remaining
        ? `${formatNumber(remaining)} more unique attendees to reach the annual goal.`
        : "Annual engagement goal reached.",
    );
  }

  function renderEventTypes(items) {
    const list = document.getElementById("event-type-list");
    const donut = document.getElementById("event-type-donut");
    const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    let cursor = 0;
    const segments = items.map((item) => {
      const portion = total ? ((Number(item.count) || 0) / total) * 100 : 0;
      const start = cursor;
      cursor += portion;
      return `${item.color || "#7b8797"} ${start}% ${cursor}%`;
    });

    donut.style.background = segments.length
      ? `conic-gradient(${segments.join(",")})`
      : "#e9edf3";
    donut.setAttribute(
      "aria-label",
      items.length
        ? items.map((item) => `${item.name}: ${item.count} check-ins`).join(", ")
        : "No event type data",
    );
    setText("donut-total", formatNumber(total));

    list.replaceChildren(
      ...items.map((item) => {
        const row = document.createElement("div");
        row.className = "type-row";

        const dot = document.createElement("span");
        dot.className = "type-dot";
        dot.style.backgroundColor = item.color || "#7b8797";

        const name = document.createElement("span");
        name.className = "type-name";
        name.textContent = item.name;

        const values = document.createElement("span");
        values.className = "type-values";
        values.append(
          document.createTextNode(formatNumber(item.count)),
          document.createTextNode(" "),
        );
        const small = document.createElement("small");
        small.textContent = hasMetric(item.events)
          ? `· ${formatNumber(item.events)} events`
          : "· public total";
        values.append(small);

        row.append(dot, name, values);
        return row;
      }),
    );
  }

  function renderUpcomingEvents(items) {
    const container = document.getElementById("upcoming-events");

    if (!items.length) {
      container.innerHTML =
        '<p class="goal-note">No upcoming events are currently listed.</p>';
      return;
    }

    container.replaceChildren(
      ...items.map((item) => {
        const date = parseDate(item.date);
        const article = document.createElement("article");
        article.className = "upcoming-item";

        const tile = document.createElement("div");
        tile.className = "date-tile";
        const month = document.createElement("span");
        month.textContent = new Intl.DateTimeFormat("en-US", {
          month: "short",
        })
          .format(date)
          .toUpperCase();
        const day = document.createElement("strong");
        day.textContent = new Intl.DateTimeFormat("en-US", {
          day: "numeric",
        }).format(date);
        tile.append(month, day);

        const detail = document.createElement("div");
        detail.className = "event-detail";
        const title = document.createElement("strong");
        title.textContent = item.title;
        const meta = document.createElement("span");
        meta.textContent = `${item.time || "Time TBD"} · ${item.location || "Location TBD"}`;
        detail.append(title, meta);

        const status = document.createElement("span");
        const statusClass = String(item.status || "")
          .toLowerCase()
          .replace(/\s+/g, "-");
        status.className = `status-pill is-${statusClass}`;
        status.textContent = item.status || "Planning";

        article.append(tile, detail, status);
        return article;
      }),
    );
  }

  function renderOperations(items) {
    const container = document.getElementById("operations-list");
    const actionable = items.filter((item) => item.severity !== "success").length;
    setText(
      "operations-count",
      `${actionable} open item${actionable === 1 ? "" : "s"}`,
    );
    setText("nav-alert-count", String(actionable));

    container.replaceChildren(
      ...items.map((item) => {
        const article = document.createElement("article");
        article.className = `operation-item is-${item.severity || "info"}`;

        const title = document.createElement("strong");
        title.textContent = item.title;
        const detail = document.createElement("p");
        detail.textContent = item.detail;
        article.append(title, detail);

        if (item.actionLabel && item.actionUrl) {
          const action = document.createElement("a");
          action.href = item.actionUrl;
          action.textContent = `${item.actionLabel} →`;
          if (item.actionUrl === "#year-settings") {
            action.addEventListener("click", (event) => {
              event.preventDefault();
              openSettings();
            });
          } else if (!item.actionUrl.startsWith("#")) {
            action.target = "_blank";
            action.rel = "noopener";
          }
          article.append(action);
        }

        return article;
      }),
    );
  }

  function renderResources(resources) {
    const container = document.getElementById("resource-grid");
    container.replaceChildren(
      ...resources.map((resource) => {
        const article = document.createElement("article");
        article.className = "resource-card";

        const category = document.createElement("span");
        category.className = "resource-category";
        category.textContent = resource.category;

        const title = document.createElement("h3");
        title.textContent = resource.title;

        const description = document.createElement("p");
        description.textContent = resource.description;

        let action;
        if (resource.url) {
          action = document.createElement("a");
          action.href = resource.url;
          action.target = resource.url.startsWith("#") ? "_self" : "_blank";
          if (action.target === "_blank") {
            action.rel = "noopener";
          }
          action.innerHTML = `<span>${resource.label}</span><span aria-hidden="true">↗</span>`;
        } else {
          action = document.createElement("span");
          action.classList.add("is-disabled");
          action.innerHTML =
            '<span>Setup needed</span><span aria-hidden="true">—</span>';
        }
        action.classList.add("resource-action");

        article.append(category, title, description, action);
        return article;
      }),
    );
  }

  function applyTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = resolved;
    elements.themeToggle.setAttribute(
      "aria-label",
      resolved === "dark" ? "Switch to light theme" : "Switch to dark theme",
    );
  }

  function setupNavigation() {
    const navLinks = [...document.querySelectorAll(".nav-link")];
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const setActiveNavigation = (sectionId) => {
      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${sectionId}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        setActiveNavigation(link.getAttribute("href").slice(1));
        document.body.classList.remove("nav-open");
        elements.mobileMenuButton.setAttribute("aria-expanded", "false");
      });
    });

    let scrollFrame = 0;
    const updateNavigationFromScroll = () => {
      const pageBottom = window.scrollY + window.innerHeight;
      const documentBottom = document.documentElement.scrollHeight;

      if (pageBottom >= documentBottom - 12) {
        setActiveNavigation(sections[sections.length - 1].id);
        return;
      }

      const readingLine =
        window.scrollY + Math.min(window.innerHeight * 0.3, 260);
      const activeSection = sections.reduce((current, section) => {
        return section.offsetTop <= readingLine ? section : current;
      }, sections[0]);
      setActiveNavigation(activeSection.id);
    };

    window.addEventListener(
      "scroll",
      () => {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = 0;
          updateNavigationFromScroll();
        });
      },
      { passive: true },
    );
    updateNavigationFromScroll();
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function hasMetric(value) {
    return value !== null && value !== undefined && value !== "" &&
      Number.isFinite(Number(value));
  }

  function formatNumber(value) {
    if (!hasMetric(value)) return "—";
    const numericValue = Number(value);
    return numberFormatter.format(numericValue);
  }

  function parseDate(dateValue) {
    const value = String(dateValue || "");
    const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, String(value)),
    );
    return element;
  }

  [elements.settingsButton, elements.sidebarSettings].forEach((button) => {
    button.addEventListener("click", () => openSettings());
  });

  [elements.settingsClose, elements.settingsCancel].forEach((button) => {
    button.addEventListener("click", closeSettings);
  });

  elements.settingsNewYear.addEventListener("click", () => {
    let newYear = nextAcademicYear(
      elements.settingsYearKey.value || elements.academicYear.value,
    );
    while (newYear && yearSources[newYear]) {
      newYear = nextAcademicYear(newYear);
    }
    if (!newYear) {
      elements.settingsStatus.textContent =
        "Enter the current year in the format 2026-2027 first.";
      return;
    }

    const current = readSettingsForm();
    fillSettingsForm(
      newYear,
      {
        label: displayLabelForYear(newYear),
        attendanceSheetTab: "Leaderboard_Public",
        engagementGoal: current.engagementGoal,
        calendarUrl: current.calendarUrl,
        calendarIcalUrl: current.calendarIcalUrl,
      },
      true,
    );
  });

  elements.settingsReset.addEventListener("click", () => {
    const year = normalizeYearKey(elements.settingsYearKey.value);
    const defaults = sharedYearSources && sharedYearSources[year];
    if (!defaults) return;
    yearSources[year] = { ...defaults };
    saveYearSources();
    fillSettingsForm(year, yearSources[year], false);
    populateYears(year);
    loadDashboard(year);
    elements.settingsStatus.textContent =
      "This preview has been restored to the shared settings.";
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = readSettingsForm();
    const validationMessage = validateSettings(settings);
    if (validationMessage) {
      elements.settingsStatus.textContent = validationMessage;
      return;
    }

    const originalYear = normalizeYearKey(
      elements.settingsForm.dataset.originalYear,
    );
    if (
      !originalYear &&
      yearSources[settings.yearKey] &&
      settings.yearKey !== elements.academicYear.value
    ) {
      elements.settingsStatus.textContent =
        "That academic year already exists. Select it from the dashboard to edit it.";
      return;
    }

    if (originalYear && originalYear !== settings.yearKey) {
      delete yearSources[originalYear];
    }
    const { yearKey, ...source } = settings;
    yearSources[yearKey] = source;
    saveYearSources();
    populateYears(yearKey);
    closeSettings();
    loadDashboard(yearKey);
  });

  elements.accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.accessError.textContent = "";
    const submitButton = elements.accessForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.firstChild.textContent = "Checking access ";

    try {
      const digest = await sha256(elements.password.value.trim());
      if (digest !== config.access.passwordSha256) {
        elements.accessError.textContent =
          "That password does not match. Check capitalization and try again.";
        elements.password.select();
        return;
      }
      await unlockDashboard();
      elements.password.value = "";
    } catch (error) {
      elements.accessError.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.firstChild.textContent = "Open dashboard ";
    }
  });

  elements.passwordToggle.addEventListener("click", () => {
    const showing = elements.password.type === "text";
    elements.password.type = showing ? "password" : "text";
    elements.passwordToggle.textContent = showing ? "Show" : "Hide";
    elements.passwordToggle.setAttribute(
      "aria-label",
      showing ? "Show password" : "Hide password",
    );
  });

  elements.lockDashboard.addEventListener("click", showGate);

  elements.academicYear.addEventListener("change", () => {
    loadDashboard(elements.academicYear.value);
  });

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  });

  elements.mobileMenuButton.addEventListener("click", () => {
    const opening = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", opening);
    elements.mobileMenuButton.setAttribute("aria-expanded", String(opening));
  });

  document.addEventListener("click", (event) => {
    if (
      document.body.classList.contains("nav-open") &&
      !elements.mobileMenuButton.contains(event.target) &&
      !document.getElementById("sidebar").contains(event.target)
    ) {
      document.body.classList.remove("nav-open");
      elements.mobileMenuButton.setAttribute("aria-expanded", "false");
    }
  });

  async function initialize() {
    sharedSettingsReady = loadSharedYearSources();
    await sharedSettingsReady;

    const sharedSettingsUrl =
      config.sharedSettings && config.sharedSettings.editUrl;
    [elements.settingsSharedLink, elements.settingsSharedAction].forEach(
      (link) => {
        if (link && sharedSettingsUrl) link.href = sharedSettingsUrl;
      },
    );

    populateYears();
    setupNavigation();
    applyTheme(localStorage.getItem(themeStorageKey) || "light");

    if (isUnlocked()) {
      elements.gate.hidden = true;
      elements.appShell.hidden = false;
      loadDashboard(elements.academicYear.value);
    } else {
      showGate();
    }
  }

  initialize();
})();
