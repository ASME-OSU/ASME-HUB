(function () {
  "use strict";

  const config = window.ASME_HUB_CONFIG;
  const unlockStorageKey = "asmeHubUnlockedUntil";
  const themeStorageKey = "asmeHubTheme";
  const sidebarStorageKey = "asmeHubSidebarCollapsed";
  const meetingQuoteStorageKey = "asmeHubLastMeetingQuote";
  const yearSettingsStorageKey = "asmeHubYearSettingsPreviewV2";
  const calendarCacheKeyPrefix = "asmeHubCalendarCacheV1:";
  const calendarSnapshotUrl = "./data/calendar.json";
  const calendarLiveMaxAgeMs = 2 * 60 * 60 * 1000;
  const calendarFallbackMaxAgeMs = 24 * 60 * 60 * 1000;
  const defaultDocumentTitle = document.title;
  const numberFormatter = new Intl.NumberFormat("en-US");
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const chartPalette = [
    "var(--chart-series-1)",
    "var(--chart-series-2)",
    "var(--chart-series-3)",
    "var(--chart-series-4)",
    "var(--chart-series-5)",
    "var(--chart-series-6)",
    "var(--chart-series-7)",
  ];
  const eventTypeColumns = [
    { column: 2, name: "General Body", color: chartPalette[1] },
    { column: 3, name: "Social", color: chartPalette[3] },
    { column: 4, name: "Company Info Sessions", color: chartPalette[0] },
    { column: 5, name: "Technical Workshops", color: chartPalette[2] },
    { column: 6, name: "Build Nights / Projects", color: chartPalette[4] },
    { column: 7, name: "Volunteering / Outreach", color: chartPalette[5] },
    { column: 8, name: "Committee Work", color: chartPalette[6] },
  ];
  const minimumReliableSample = 5;
  let sharedYearSources = cloneConfiguredSources();
  let yearSources = loadYearSources();
  let sharedSettingsReady = Promise.resolve();
  let activeDashboardData = null;
  let selectedPeriod = "ytd";
  let refreshNavigation = () => {};
  let setActiveMobileSection = () => {};
  let activeHubSearchItems = [];
  let activeResources = [];

  const elements = {
    gate: document.getElementById("access-gate"),
    accessForm: document.getElementById("access-form"),
    password: document.getElementById("hub-password"),
    passwordToggle: document.getElementById("password-toggle"),
    accessError: document.getElementById("access-error"),
    appShell: document.getElementById("app-shell"),
    heroQuote: document.getElementById("hero-quote"),
    loadingLayer: document.getElementById("loading-layer"),
    lockDashboard: document.getElementById("lock-dashboard"),
    academicYear: document.getElementById("academic-year"),
    periodFilter: document.getElementById("period-filter"),
    sidebarYear: document.getElementById("sidebar-year-label"),
    themeToggle: document.getElementById("theme-toggle"),
    mobileMenuButton: document.getElementById("mobile-menu-button"),
    sidebarCollapse: document.getElementById("sidebar-collapse"),
    sidebarThemeToggle: document.getElementById("sidebar-theme-toggle"),
    gateThemeToggle: document.getElementById("gate-theme-toggle"),
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
    settingsIsActive: document.getElementById("settings-is-active"),
    settingsIsCurrent: document.getElementById("settings-is-current"),
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
    settingsBudgetTracker: document.getElementById("settings-budget-tracker"),
    settingsBudgetExport: document.getElementById("settings-budget-export"),
    settingsBudgetTab: document.getElementById("settings-budget-tab"),
    settingsBanking: document.getElementById("settings-banking"),
    settingsFundraising: document.getElementById("settings-fundraising"),
    settingsSharedLink: document.getElementById("settings-shared-link"),
    settingsSharedAction: document.getElementById("settings-shared-action"),
    settingsPublish: document.getElementById("settings-publish"),
    searchButton: document.getElementById("search-button"),
    searchDialog: document.getElementById("hub-search-dialog"),
    searchClose: document.getElementById("hub-search-close"),
    searchInput: document.getElementById("hub-search-input"),
    searchResults: document.getElementById("hub-search-results"),
    resourceFilter: document.getElementById("resource-filter"),
    resourceSearch: document.getElementById("resource-search"),
    resourceCount: document.getElementById("resource-count"),
    frequentResources: document.getElementById("frequent-resources"),
    frequentResourceGrid: document.getElementById("frequent-resource-grid"),
    printHubButton: document.getElementById("print-hub-button"),
    printReportMeta: document.getElementById("print-report-meta"),
    healthySystems: document.getElementById("healthy-systems"),
  };

  function getUnlockedUntil() {
    return Number(sessionStorage.getItem(unlockStorageKey) || 0);
  }

  function isUnlocked() {
    return getUnlockedUntil() > Date.now();
  }

  function showRandomMeetingQuote() {
    const quotes = Array.isArray(config.meetingQuotes)
      ? config.meetingQuotes.filter((quote) => String(quote).trim())
      : [];
    if (!elements.heroQuote || !quotes.length) return;

    const previousIndex = Number(localStorage.getItem(meetingQuoteStorageKey));
    let nextIndex = Math.floor(Math.random() * quotes.length);
    if (quotes.length > 1 && nextIndex === previousIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (quotes.length - 1))) % quotes.length;
    }

    elements.heroQuote.textContent = quotes[nextIndex];
    localStorage.setItem(meetingQuoteStorageKey, String(nextIndex));
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
    elements.settingsBudgetTracker.value = source.budgetTrackerUrl || "";
    elements.settingsBudgetExport.value = source.budgetExportSheetUrl || "";
    elements.settingsBudgetTab.value =
      source.budgetExportSheetTab || "Budget_Public";
    elements.settingsBanking.value = source.bankingUrl || "";
    elements.settingsFundraising.value = source.fundraisingUrl || "";
    elements.settingsIsActive.checked = source.isActive !== false;
    elements.settingsIsCurrent.checked = source.isCurrent === true;
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
    setMobileNavigation(false);

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
      budgetTrackerUrl: elements.settingsBudgetTracker.value.trim(),
      budgetExportSheetUrl: elements.settingsBudgetExport.value.trim(),
      budgetExportSheetTab:
        elements.settingsBudgetTab.value.trim() || "Budget_Public",
      bankingUrl: elements.settingsBanking.value.trim(),
      fundraisingUrl: elements.settingsFundraising.value.trim(),
      eventMetricsSheetTab:
        getYearSource(normalizeYearKey(elements.settingsYearKey.value))
          ?.eventMetricsSheetTab || "Event_Metrics_Public",
      isActive: elements.settingsIsActive.checked,
      isCurrent: elements.settingsIsCurrent.checked,
      settingsStatus: "Published from the Officer Hub",
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
      ["budget tracker", settings.budgetTrackerUrl, true],
      ["sanitized budget export", settings.budgetExportSheetUrl, true],
      ["banking portal", settings.bankingUrl, false],
      ["fundraising portal", settings.fundraisingUrl, false],
    ];
    const invalid = urls.find(
      ([, value, allowSheetId]) =>
        !isUsableUrl(value, { allowSheetId: Boolean(allowSheetId) }),
    );
    return invalid ? `Check the ${invalid[0]} link.` : "";
  }

  async function requestSettingsWrite(settings) {
    const writeUrl = String(config.sharedSettings?.writeUrl || "").trim();
    if (!writeUrl) {
      throw new Error("Organization-wide publishing has not been connected yet.");
    }

    const callback = `__asmeHubSettings_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const params = new URLSearchParams({
      action: "saveSettings",
      callback,
      token: config.access.passwordSha256,
      payload: JSON.stringify(settings),
      _: String(Date.now()),
    });
    const url = `${writeUrl}${writeUrl.includes("?") ? "&" : "?"}${params}`;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const cleanup = () => {
        window.clearTimeout(timer);
        script.remove();
        delete window[callback];
      };
      const fail = (message) => {
        cleanup();
        reject(new Error(message));
      };
      const timer = window.setTimeout(
        () => fail("The shared settings request timed out. Please try again."),
        15000,
      );

      window[callback] = (result) => {
        if (!result?.ok) {
          fail(result?.error || "The shared settings save failed.");
          return;
        }
        cleanup();
        resolve(result);
      };
      script.crossOrigin = "anonymous";
      script.src = url;
      script.async = true;
      script.onerror = () =>
        fail(
          "The shared settings service could not be reached. Check the deployment URL and try again.",
        );
      document.head.append(script);
    });
  }

  async function publishSettings() {
    const settings = readSettingsForm();
    const validationMessage = validateSettings(settings);
    if (validationMessage) {
      elements.settingsStatus.textContent = validationMessage;
      return;
    }

    elements.settingsPublish.disabled = true;
    elements.settingsStatus.textContent = "Publishing shared settings…";
    try {
      const result = await requestSettingsWrite(settings);
      const { yearKey, ...source } = settings;
      if (source.isCurrent) {
        Object.values(sharedYearSources).forEach((item) => {
          item.isCurrent = false;
        });
        config.currentAcademicYear = yearKey;
      }
      sharedYearSources[yearKey] = {
        ...(sharedYearSources[yearKey] || {}),
        ...source,
        settingsUpdated: new Date(),
      };
      sessionStorage.removeItem(yearSettingsStorageKey);
      yearSources = loadYearSources();
      populateYears(yearKey);
      elements.settingsStatus.textContent =
        result.action === "created"
          ? "The new academic year is now available to every viewer."
          : "Shared settings updated for every viewer.";
      window.setTimeout(() => {
        closeSettings();
        loadDashboard(yearKey);
      }, 700);
    } catch (error) {
      elements.settingsStatus.textContent =
        error.message || "The shared settings save failed.";
    } finally {
      elements.settingsPublish.disabled = false;
    }
  }

  function showGate() {
    sessionStorage.removeItem(unlockStorageKey);
    elements.appShell.hidden = true;
    elements.gate.hidden = false;
    setMobileNavigation(false);
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
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const hashTarget = window.location.hash
      ? document.querySelector(window.location.hash)
      : null;
    if (hashTarget) {
      setActiveMobileSection(hashTarget.id);
      hashTarget.scrollIntoView({ behavior: "auto", block: "start" });
    }
    refreshNavigation();
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

  async function loadBudgetSummary(source) {
    const spreadsheetId = spreadsheetIdFrom(source.budgetExportSheetUrl);
    if (!spreadsheetId) {
      return {
        available: false,
        error: "No sanitized budget feed is configured for this academic year.",
      };
    }

    try {
      const table = await queryPublicSheet(
        spreadsheetId,
        source.budgetExportSheetTab || "Budget_Public",
        "select A,B,C,D,E,F where A is not null",
      );
      const metrics = {};
      (table.rows || []).forEach((row) => {
        const key = String(sheetCell(row, 0) || "").trim();
        if (!key) return;
        metrics[key] = {
          label: String(sheetCell(row, 1) || "").trim(),
          value: sheetCell(row, 2),
          formatted: String(sheetCell(row, 2, true) || "").trim(),
          format: String(sheetCell(row, 3) || "").trim(),
          description: String(sheetCell(row, 4) || "").trim(),
          textValue: String(sheetCell(row, 5) || "").trim(),
        };
      });

      const numberValue = (key) => {
        const raw = metrics[key]?.value;
        if (raw === "" || raw === null || raw === undefined) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
      };
      const updatedAt = sheetTimestamp(metrics.updated_at?.value);
      const categories = new Map();
      Object.entries(metrics).forEach(([key, metric]) => {
        const match = key.match(/^category_(actual|planned)_(.+)$/);
        if (!match) return;
        const [, measure, slug] = match;
        const category = categories.get(slug) || {
          slug,
          label: metric.label || slug.replace(/_/g, " "),
          actual: 0,
          planned: 0,
        };
        const value = Number(metric.value);
        category[measure] = Number.isFinite(value) ? value : 0;
        if (metric.label) {
          category.label = String(metric.label)
            .replace(/\s*[—–-]\s*(actual|planned)$/i, "")
            .trim();
        }
        categories.set(slug, category);
      });

      return {
        available: true,
        academicYear:
          metrics.academic_year?.textValue || source.label || "Current year",
        approvedIncome: numberValue("approved_income"),
        approvedExpenses: numberValue("approved_expenses"),
        pendingApproval: numberValue("pending_approval"),
        plannedBudget: numberValue("planned_budget"),
        remainingBudget: numberValue("remaining_budget"),
        budgetUsedRate: numberValue("budget_used_rate"),
        updatedAt: updatedAt ? updatedAt.toISOString() : "",
        categories: Array.from(categories.values()),
      };
    } catch (error) {
      console.warn("The sanitized budget feed could not be loaded.", error);
      return {
        available: false,
        error: error.message || "The sanitized budget feed could not be loaded.",
      };
    }
  }

  function sheetTimestamp(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number") {
      const serialDate = new Date(
        Date.UTC(1899, 11, 30) + value * 86400000,
      );
      return new Date(
        serialDate.getUTCFullYear(),
        serialDate.getUTCMonth(),
        serialDate.getUTCDate(),
        serialDate.getUTCHours(),
        serialDate.getUTCMinutes(),
        serialDate.getUTCSeconds(),
      );
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

  function sheetBoolean(value, fallback = false) {
    if (value === true || value === false) return value;
    const clean = String(value ?? "").trim().toLowerCase();
    if (!clean) return fallback;
    return ["true", "yes", "1"].includes(clean);
  }

  async function loadSharedYearSources() {
    const settings = config.sharedSettings || {};
    const spreadsheetId = spreadsheetIdFrom(settings.spreadsheetUrl);
    if (!spreadsheetId || !settings.sheetTab) return;

    try {
      const table = await queryPublicSheet(
        spreadsheetId,
        settings.sheetTab,
        "select A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T where A is not null",
      );
      const remoteSources = {};
      let currentYear = "";

      (table.rows || []).forEach((row) => {
        const yearKey = normalizeYearKey(sheetCell(row, 0));
        if (!/^\d{4}-\d{4}$/.test(yearKey)) return;
        const isActive = sheetBoolean(sheetCell(row, 10), true);
        if (!isActive) return;
        const isCurrent = sheetBoolean(sheetCell(row, 11), false);
        if (isCurrent) currentYear = yearKey;
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
          isActive,
          isCurrent,
          settingsUpdated: sheetTimestamp(
            sheetCell(row, 12, true) || sheetCell(row, 12),
          ),
          settingsStatus: String(sheetCell(row, 13) || "").trim(),
          eventMetricsSheetTab:
            String(sheetCell(row, 14) || "").trim() ||
            "Event_Metrics_Public",
          budgetTrackerUrl: String(sheetCell(row, 15) || "").trim(),
          budgetExportSheetUrl: String(sheetCell(row, 16) || "").trim(),
          budgetExportSheetTab:
            String(sheetCell(row, 17) || "").trim() || "Budget_Public",
          bankingUrl: String(sheetCell(row, 18) || "").trim(),
          fundraisingUrl: String(sheetCell(row, 19) || "").trim(),
        };
      });

      if (Object.keys(remoteSources).length) {
        sharedYearSources = { ...sharedYearSources, ...remoteSources };
        if (currentYear) config.currentAcademicYear = currentYear;
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
    const eventMetricsTab =
      source.eventMetricsSheetTab || "Event_Metrics_Public";
    const monthlyMetricsTab =
      source.monthlyMetricsSheetTab || "Monthly_Metrics_Public";
    const semesterMetricsTab =
      source.semesterMetricsSheetTab || "Semester_Metrics_Public";
    const [leaderboard, statusTable, metricsResult, monthlyResult, semesterResult] =
      await Promise.all([
      queryPublicSheet(
        spreadsheetId,
        leaderboardTab,
        "select E,G,H,I,J,K,L,M,N where B is not null",
      ),
      queryPublicSheet(
        spreadsheetId,
        "System_Status",
        "select A,B where A is not null",
      ).catch(() => ({ rows: [] })),
      queryPublicSheet(
        spreadsheetId,
        eventMetricsTab,
        "select A,B,C,D,E,F,G,H,I,J,K,L",
      )
        .then((table) => ({ table, error: null }))
        .catch((error) => ({ table: { rows: [] }, error })),
      queryPublicSheet(
        spreadsheetId,
        monthlyMetricsTab,
        "select A,B,C,D,E,F,G,H,I,J,K,L,M,N,O where A is not null",
      )
        .then((table) => ({ table, error: null }))
        .catch((error) => ({ table: { rows: [] }, error })),
      queryPublicSheet(
        spreadsheetId,
        semesterMetricsTab,
        "select A,B,C,D,E,F,G,H,I,J,K,L,M,N,O where A is not null",
      )
        .then((table) => ({ table, error: null }))
        .catch((error) => ({ table: { rows: [] }, error })),
      ]);

    const members = (leaderboard.rows || [])
      .map((row) => ({
        events: Number(sheetCell(row, 0)) || 0,
        updated: sheetTimestamp(
          sheetCell(row, 1, true) || sheetCell(row, 1),
        ),
        eventTypes: eventTypeColumns.map((type) => ({
          ...type,
          count: Number(sheetCell(row, type.column)) || 0,
        })),
      }));

    const totalCheckIns = members.reduce(
      (sum, member) => sum + member.events,
      0,
    );
    const repeatAttendees = members.filter(
      (member) => member.events >= 2,
    ).length;
    const highlyEngagedAttendees = members.filter(
      (member) => member.events >= 4,
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
    const metricRows = metricsResult.table.rows || [];
    const eventRows = metricRows
      .map((row) => ({
        id: String(sheetCell(row, 0) || "").trim(),
        name: String(sheetCell(row, 1) || "").trim(),
        date: sheetTimestamp(sheetCell(row, 2)),
        type: normalizeEventType(sheetCell(row, 3)),
        attendance: Number(sheetCell(row, 4)) || 0,
        formStatus: String(sheetCell(row, 5) || "").trim(),
        status: String(sheetCell(row, 6) || "").trim(),
      }))
      .filter((event) => event.id && event.name);
    const healthMetrics = {};
    metricRows.forEach((row) => {
      const key = String(sheetCell(row, 8) || "").trim();
      if (!key || key.toLowerCase() === "metric") return;
      healthMetrics[key] = {
        value: sheetCell(row, 9),
        status: String(sheetCell(row, 10) || "").toUpperCase(),
        detail: String(sheetCell(row, 11) || "").trim(),
      };
    });
    const attendedEvents = eventRows.filter((event) => event.attendance > 0);
    const metricsAvailable = !metricsResult.error && eventRows.length > 0;
    const parsePeriodMetric = (row, keyName) => {
      const rawRepeatRate = Number(sheetCell(row, 8)) || 0;
      return {
        periodKey: String(sheetCell(row, 0) || "").trim(),
        [keyName]: String(sheetCell(row, 0) || "").trim(),
        label: String(sheetCell(row, 1) || "").trim(),
        start: sheetTimestamp(sheetCell(row, 2)),
        uniqueAttendees: Number(sheetCell(row, 3)) || 0,
        totalCheckIns: Number(sheetCell(row, 4)) || 0,
        eventsHeld: Number(sheetCell(row, 5)) || 0,
        averageTurnout: Number(sheetCell(row, 6)) || 0,
        repeatAttendees: Number(sheetCell(row, 7)) || 0,
        repeatAttendanceRate:
          rawRepeatRate <= 1 ? rawRepeatRate * 100 : rawRepeatRate,
        newAttendees: Number(sheetCell(row, 9)) || 0,
        topEventType: normalizeEventType(sheetCell(row, 10)),
        topEventName: String(sheetCell(row, 11) || "").trim(),
        topEventAttendance: Number(sheetCell(row, 12)) || 0,
        updated: sheetTimestamp(
          sheetCell(row, 13, true) || sheetCell(row, 13),
        ),
        highlyEngagedAttendees: Number(sheetCell(row, 14)) || 0,
      };
    };
    const monthlyMetrics = (monthlyResult.table.rows || [])
      .map((row) => parsePeriodMetric(row, "monthKey"))
      .filter((month) => /^\d{4}-\d{2}$/.test(month.monthKey));
    const semesterMetrics = (semesterResult.table.rows || [])
      .map((row) => parsePeriodMetric(row, "semesterKey"))
      .filter((semester) => ["fall", "spring"].includes(semester.semesterKey));
    const aggregateUpdated = sheetTimestamp(
      healthMetrics.last_updated?.value,
    );
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
        events: metricsAvailable
          ? eventRows.filter((event) => event.type === type.name).length
          : null,
        color: type.color,
      }))
      .filter((type) => type.count > 0 || Number(type.events) > 0);
    const attendanceTrend = attendedEvents
      .filter((event) => event.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-8)
      .map((event) => ({
        label: event.name,
        shortLabel:
          event.name.length > 13
            ? `${event.name.slice(0, 12).trim()}…`
            : event.name,
        date: event.date.toISOString(),
        attendance: event.attendance,
        type: event.type,
      }));
    const operations = [];
    const reviewCount = Number(healthMetrics.open_review_items?.value) || 0;
    const pastFormsOpen = Number(healthMetrics.past_forms_open?.value) || 0;

    if (reviewCount > 0) {
      operations.push({
        severity: "warning",
        title: `${formatNumber(reviewCount)} attendance review item${
          reviewCount === 1 ? "" : "s"
        } open`,
        detail:
          "Review duplicate, unmatched, or otherwise flagged submissions before the next website refresh.",
        actionLabel: "Open review queue",
        actionUrl: `${source.pointsMasterUrl || ""}#gid=635067478`,
      });
    }
    if (pastFormsOpen > 0) {
      operations.push({
        severity: "warning",
        title: `${formatNumber(pastFormsOpen)} past event form${
          pastFormsOpen === 1 ? "" : "s"
        } still open`,
        detail:
          "Close attendance choices for completed events so members cannot select an old event.",
        actionLabel: "Open events sheet",
        actionUrl: `${source.pointsMasterUrl || ""}#gid=1941217076`,
      });
    }
    if (!metricsAvailable) {
      operations.push({
        severity: "warning",
        title: "Event metrics feed needs attention",
        detail:
          "The privacy-safe Event_Metrics_Public tab could not be read, so event-level KPIs are temporarily unavailable.",
        actionLabel: "Open public export",
        actionUrl: source.attendanceSheetUrl,
      });
    }
    operations.push({
      severity: systemStatus === "LIVE" ? "success" : "warning",
      title:
        systemStatus === "LIVE"
          ? "Public attendance totals are connected"
          : `Point system status: ${systemStatus.toLowerCase()}`,
      detail:
        "Member totals and event aggregates are loading from the privacy-safe website export.",
      actionLabel: "Open public export",
      actionUrl: source.attendanceSheetUrl,
    });

    return {
      meta: {
        academicYear: source.label,
        lastUpdated: aggregateUpdated
          ? aggregateUpdated.toISOString()
          : latestUpdate
            ? latestUpdate.toISOString()
          : new Date().toISOString(),
        isDemo: false,
        isPartial: !metricsAvailable,
        sourceLabel: metricsAvailable
          ? "Public aggregate exports"
          : "Public leaderboard export",
      },
      kpis: {
        uniqueAttendees: members.length,
        totalCheckIns,
        eventsHeld: metricsAvailable ? attendedEvents.length : null,
        averageTurnout:
          metricsAvailable && attendedEvents.length
            ? totalCheckIns / attendedEvents.length
            : metricsAvailable
              ? 0
              : null,
        repeatAttendanceRate: members.length
          ? (repeatAttendees / members.length) * 100
          : 0,
        repeatAttendees,
        highlyEngagedAttendees,
        engagementGoal: Number(source.engagementGoal) || 250,
      },
      attendanceTrend,
      eventTypes,
      allEvents: eventRows,
      monthlyMetrics,
      semesterMetrics,
      upcomingEvents: [],
      operations,
      health: [
        {
          label: "Year settings",
          status: source.isCurrent === false ? "NOTICE" : "LIVE",
          detail:
            source.settingsStatus ||
            (source.settingsUpdated
              ? `Updated ${formatCompactDate(source.settingsUpdated)}`
              : "Shared settings loaded"),
        },
        {
          label: "Attendance",
          status: systemStatus === "LIVE" ? "LIVE" : "ACTION",
          detail: `${formatNumber(members.length)} member totals available`,
        },
        {
          label: "Event metrics",
          status: metricsAvailable ? "LIVE" : "ACTION",
          detail: metricsAvailable
            ? `${formatNumber(eventRows.length)} configured events`
            : "Aggregate event feed unavailable",
        },
        {
          label: "Monthly reporting",
          status: monthlyResult.error ? "ACTION" : "LIVE",
          detail: monthlyResult.error
            ? "Monthly aggregate feed unavailable"
            : `${formatNumber(monthlyMetrics.length)} review periods ready`,
        },
        {
          label: "Semester reporting",
          status: semesterResult.error ? "ACTION" : "LIVE",
          detail: semesterResult.error
            ? "Semester aggregate feed unavailable"
            : `${formatNumber(semesterMetrics.length)} semester presets ready`,
        },
      ],
    };
  }

  function normalizeEventType(value) {
    const clean = String(value || "").trim().toLowerCase();
    const match = [
      ["general body", "General Body"],
      ["social", "Social"],
      ["tabling", "Social"],
      ["company", "Company Info Sessions"],
      ["sponsor", "Company Info Sessions"],
      ["technical", "Technical Workshops"],
      ["workshop", "Technical Workshops"],
      ["build", "Build Nights / Projects"],
      ["project", "Build Nights / Projects"],
      ["volunteer", "Volunteering / Outreach"],
      ["outreach", "Volunteering / Outreach"],
      ["committee", "Committee Work"],
    ].find(([needle]) => clean.includes(needle));
    return match ? match[1] : String(value || "Other").trim();
  }

  function unescapeIcalText(value) {
    return String(value || "")
      .replace(/\\n/gi, " · ")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  function parseIcalDate(value) {
    const clean = String(value || "").trim();
    const match = clean.match(
      /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/,
    );
    if (!match) return null;
    const parts = match.slice(1, 7).map((part) => Number(part || 0));
    return match[7]
      ? new Date(
          Date.UTC(
            parts[0],
            parts[1] - 1,
            parts[2],
            parts[3],
            parts[4],
            parts[5],
          ),
        )
      : new Date(
          parts[0],
          parts[1] - 1,
          parts[2],
          parts[3],
          parts[4],
          parts[5],
        );
  }

  function parseIcalEvents(text) {
    const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "");
    const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const now = new Date();
    const horizon = new Date(now.getTime() + 180 * 86400000);
    const results = [];

    blocks.forEach((block) => {
      const property = (name) => {
        const line = block
          .split(/\r?\n/)
          .find((entry) => entry.toUpperCase().startsWith(`${name}`));
        return line ? line.slice(line.indexOf(":") + 1) : "";
      };
      const rawStart = property("DTSTART");
      const start = parseIcalDate(rawStart);
      if (!start) return;
      const isAllDay = /^\d{8}$/.test(rawStart);
      const base = {
        title: unescapeIcalText(property("SUMMARY")) || "ASME event",
        location: unescapeIcalText(property("LOCATION")),
        type: "Chapter event",
      };
      const recurrence = property("RRULE");
      const countMatch = recurrence.match(/(?:^|;)COUNT=(\d+)/);
      const untilMatch = recurrence.match(/(?:^|;)UNTIL=([^;]+)/);
      const until = untilMatch ? parseIcalDate(untilMatch[1]) : horizon;
      const maxOccurrences = Math.min(Number(countMatch?.[1]) || 30, 60);
      const occurrences =
        recurrence.includes("FREQ=WEEKLY") ? maxOccurrences : 1;

      for (let index = 0; index < occurrences; index += 1) {
        const date = new Date(start.getTime() + index * 7 * 86400000);
        if (date > horizon || (until && date > until)) break;
        if (date.getTime() < now.getTime() - 2 * 60 * 60 * 1000) continue;
        results.push({
          ...base,
          date: date.toISOString(),
          time: isAllDay
            ? "All day"
            : new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }).format(date),
          status: base.location ? "Confirmed" : "Needs location",
        });
      }
    });

    return results
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .filter(
        (event, index, all) =>
          index ===
          all.findIndex(
            (candidate) =>
              candidate.title === event.title && candidate.date === event.date,
          ),
      )
      .slice(0, 4);
  }

  async function fetchTextWithTimeout(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Calendar request: ${response.status}`);
      return await response.text();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function loadCalendarEvents(source, year) {
    const feed = String(source.calendarIcalUrl || "").trim();
    if (!feed) {
      return {
        events: [],
        health: {
          label: "Calendar",
          status: "ACTION",
          detail: "No iCal feed configured",
        },
        operations: [
          {
            severity: "warning",
            title: "Calendar feed is not configured",
            detail:
              "Add the public Google Calendar basic.ics URL in the shared year settings.",
            actionLabel: "Open year settings",
            actionUrl: "#year-settings",
          },
        ],
      };
    }

    const cacheKey = `${calendarCacheKeyPrefix}${feed}`;
    try {
      const text = await fetchTextWithTimeout(calendarSnapshotUrl);
      const snapshot = JSON.parse(text);
      if (snapshot?.schemaVersion !== 1) {
        throw new Error("The hourly calendar snapshot version is not supported.");
      }
      const entry = snapshot?.calendars?.[normalizeYearKey(year)];
      if (!entry || typeof entry.ical !== "string") {
        throw new Error("The hourly calendar snapshot does not include this year.");
      }
      if (String(entry.feedUrl || "").trim() !== feed) {
        throw new Error("The calendar feed is waiting for the next hourly sync.");
      }

      const generatedAt = new Date(entry.generatedAt || snapshot.generatedAt);
      const ageMs = Date.now() - generatedAt.getTime();
      if (Number.isNaN(ageMs) || ageMs < 0) {
        throw new Error("The hourly calendar snapshot has an invalid timestamp.");
      }
      if (ageMs > calendarFallbackMaxAgeMs) {
        throw new Error("The hourly calendar snapshot is more than 24 hours old.");
      }

      const events = parseIcalEvents(entry.ical);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ savedAt: generatedAt.getTime(), events }),
      );
      return calendarResult(
        events,
        ageMs <= calendarLiveMaxAgeMs ? "LIVE" : "NOTICE",
        ageMs <= calendarLiveMaxAgeMs
          ? "Hourly calendar sync connected"
          : `Last hourly sync ${formatCompactDate(generatedAt)}`,
      );
    } catch (error) {
      console.warn("Generated calendar snapshot could not be loaded.", error);
    }

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "{}");
      const savedAt = new Date(cached.savedAt);
      const ageMs = Date.now() - savedAt.getTime();
      if (
        Array.isArray(cached.events) &&
        !Number.isNaN(ageMs) &&
        ageMs >= 0 &&
        ageMs <= calendarFallbackMaxAgeMs
      ) {
        return calendarResult(
          cached.events.filter((event) => new Date(event.date) >= new Date()),
          "NOTICE",
          `Using browser fallback from ${formatCompactDate(savedAt)}`,
        );
      }
    } catch (error) {
      console.warn("Calendar cache could not be read.", error);
    }
    return calendarResult([], "ACTION", "iCal feed unavailable");
  }

  function calendarResult(events, status, detail) {
    const missingLocation = events.filter(
      (event) => !event.location || event.status === "Needs location",
    );
    const operations = [];
    if (missingLocation.length) {
      operations.push({
        severity: "warning",
        title: `${missingLocation.length} upcoming event${
          missingLocation.length === 1 ? "" : "s"
        } need${missingLocation.length === 1 ? "s" : ""} a location`,
        detail:
          "Add locations in Google Calendar so members and officers see complete event details.",
        actionLabel: "Open calendar",
        actionUrl: "#calendar",
      });
    }
    if (status === "ACTION") {
      operations.push({
        severity: "warning",
        title: "Upcoming calendar could not refresh",
        detail:
          "The dashboard could not reach the public iCal feed and no usable cached events were available.",
        actionLabel: "Open calendar",
        actionUrl: "#calendar",
      });
    }
    return {
      events,
      health: { label: "Calendar", status, detail },
      operations,
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
            : resource.settingKey === "budgetTrackerUrl"
              ? `${source?.label || "Current year"} Budget Tracker`
            : resource.title;
      return { ...resource, title, url };
    });
  }

  function configureHubSearch(resources = []) {
    const sections = [
      {
        type: "section",
        sectionId: "overview",
        title: "Overview",
        description: "Chapter snapshot, attendance KPIs, and meeting pulse",
        icon: "home",
        keywords: "dashboard health attendance kpi summary",
      },
      {
        type: "section",
        sectionId: "events",
        title: "Events",
        description: "Turnout trends, engagement goal, and event review",
        icon: "calendar",
        keywords: "calendar turnout performance event types",
      },
      {
        type: "section",
        sectionId: "members",
        title: "Members",
        description: "Participation mix, retention, and engagement depth",
        icon: "users",
        keywords: "members attendance repeat participation",
      },
      {
        type: "section",
        sectionId: "finances",
        title: "Finances",
        description: "Budget totals, pending approval, and remaining funds",
        icon: "wallet",
        keywords: "budget income expenses finance money",
      },
      {
        type: "section",
        sectionId: "operations",
        title: "Operations",
        description: "Items that need officer attention",
        icon: "check-square",
        keywords: "tasks actions review queue",
      },
      {
        type: "section",
        sectionId: "resources",
        title: "Resources",
        description: "Officer tools, workspaces, and chapter links",
        icon: "link",
        keywords: "tools links sharepoint sheets forms",
      },
    ];
    const resourceItems = resources.map((resource) => ({
      type: "resource",
      title: resource.title,
      description: resource.description,
      category: resource.category || "Resource",
      url: resource.url || "",
      icon: resource.icon || resource.quickAction?.icon || "link",
      keywords: `${resource.label || ""} ${resource.category || ""}`,
    }));
    activeHubSearchItems = [...sections, ...resourceItems];
    renderHubSearchResults(elements.searchInput?.value || "");
  }

  function closeHubSearch() {
    if (!elements.searchDialog) return;
    if (typeof elements.searchDialog.close === "function") {
      if (elements.searchDialog.open) elements.searchDialog.close();
    } else {
      elements.searchDialog.removeAttribute("open");
    }
  }

  function openHubSearch() {
    if (!elements.searchDialog) return;
    setMobileNavigation(false);
    elements.searchInput.value = "";
    renderHubSearchResults("");
    if (typeof elements.searchDialog.showModal === "function") {
      elements.searchDialog.showModal();
    } else {
      elements.searchDialog.setAttribute("open", "");
    }
    window.setTimeout(() => elements.searchInput.focus(), 30);
  }

  function renderHubSearchResults(value) {
    if (!elements.searchResults) return;
    const query = String(value || "").trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = activeHubSearchItems
      .filter((item) => {
        if (!terms.length) return true;
        const haystack = `${item.title} ${item.description} ${item.category || ""} ${item.keywords || ""}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, terms.length ? 12 : 9);

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "hub-search-empty";
      empty.textContent = `No Hub results found for “${value.trim()}”.`;
      elements.searchResults.replaceChildren(empty);
      return;
    }

    elements.searchResults.replaceChildren(
      ...matches.map((item) => {
        const result = item.type === "resource" && item.url
          ? document.createElement("a")
          : document.createElement("button");
        result.className = "hub-search-result";
        result.setAttribute("role", "option");
        if (result.tagName === "BUTTON") result.type = "button";
        if (item.type === "resource" && item.url) {
          result.href = item.url;
          result.target = item.url.startsWith("#") ? "_self" : "_blank";
          result.rel = item.url.startsWith("#") ? "" : "noopener";
          result.addEventListener("click", closeHubSearch);
        } else if (item.sectionId) {
          result.addEventListener("click", () => {
            closeHubSearch();
            const navLink = document.querySelector(
              `.nav-link[href="#${item.sectionId}"]`,
            );
            if (navLink) navLink.click();
          });
        }

        const icon = document.createElement("span");
        icon.className = "hub-search-result-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.append(createHubIcon(item.icon || "link"));
        const copy = document.createElement("span");
        copy.className = "hub-search-result-copy";
        const title = document.createElement("strong");
        title.textContent = item.title;
        const description = document.createElement("small");
        description.textContent = item.description;
        copy.append(title, description);
        const kind = document.createElement("span");
        kind.className = "hub-search-result-kind";
        kind.textContent = item.type === "section" ? "Section" : item.category;
        result.append(icon, copy, kind);
        return result;
      }),
    );
  }

  async function loadDashboard(year) {
    const source = getYearSource(year);
    if (!source) {
      showDataError("No data source is configured for this academic year.");
      return;
    }

    const resources = resolveYearResources(source);
    renderResources(resources);
    renderQuickActions(resources);
    configureHubSearch(resources);
    const eventOperations = resources.find(
      (resource) => resource.title === "Event Operations",
    );
    const attendanceCheckIn = resources.find((resource) =>
      resource.settingKey === "attendanceFormUrl",
    );
    const emptyPlanLink = document.getElementById("empty-plan-event");
    const emptyCheckInLink = document.getElementById("empty-open-checkin");
    [
      [emptyPlanLink, eventOperations?.url],
      [emptyCheckInLink, attendanceCheckIn?.url],
    ].forEach(([link, url]) => {
      if (!link || !url) return;
      link.href = url;
      link.target = url.startsWith("#") ? "_self" : "_blank";
      link.rel = url.startsWith("#") ? "" : "noopener";
    });
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
      const [calendar, budget] = await Promise.all([
        loadCalendarEvents(source, year),
        loadBudgetSummary(source),
      ]);
      data.upcomingEvents = calendar.events;
      data.budget = budget;
      data.health = [
        ...(data.health || []),
        calendar.health,
        {
          label: "Budget feed",
          status: budget.available ? "LIVE" : "ACTION",
          detail: budget.available
            ? "Aggregate-only financial totals connected"
            : budget.error || "Sanitized budget feed unavailable",
        },
      ];
      data.operations = [
        ...(data.operations || []),
        ...calendar.operations.map((item) => ({
          ...item,
          actionUrl:
            item.actionUrl === "#calendar"
              ? source.calendarUrl || source.calendarIcalUrl
              : item.actionUrl,
        })),
      ];
      if (!budget.available && source.budgetExportSheetUrl) {
        data.operations.push({
          severity: "warning",
          title: "Budget summary needs attention",
          detail:
            "The Hub could not read the aggregate-only budget export. The private transaction workbook remains unaffected.",
          actionLabel: "Open budget tracker",
          actionUrl: source.budgetTrackerUrl || "#resources",
        });
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
    renderHealth([
      {
        label: "Dashboard data",
        status: "ACTION",
        detail: message,
      },
    ]);
  }

  function renderDashboard(data, source = {}) {
    data.monthlyMetrics = (data.monthlyMetrics || []).map((item) => ({
      ...item,
      periodKey: item.periodKey || item.monthKey,
    }));
    data.semesterMetrics = (data.semesterMetrics || []).map((item) => ({
      ...item,
      periodKey: item.periodKey || item.semesterKey,
    }));
    activeDashboardData = data;
    selectedPeriod = "ytd";
    populatePeriodFilter(
      data.semesterMetrics || [],
      data.monthlyMetrics || [],
    );
    renderSelectedPeriod();
    renderBudget(data.budget || {}, source);
    renderUpcomingEvents(data.upcomingEvents || []);
    renderHealth(data.health || []);
    renderOperations(data.operations || []);
  }

  function populatePeriodFilter(semesters, months) {
    if (!elements.periodFilter) return;
    const yearOption = document.createElement("option");
    yearOption.value = "ytd";
    yearOption.textContent = "Year to date";
    const semesterGroup = document.createElement("optgroup");
    semesterGroup.label = "Semesters";
    semesterGroup.append(
      ...semesters.map((semester) => {
        const option = document.createElement("option");
        option.value = semester.semesterKey;
        option.textContent = semester.label || semester.semesterKey;
        return option;
      }),
    );
    const monthGroup = document.createElement("optgroup");
    monthGroup.label = "Months";
    monthGroup.append(
      ...months.map((month) => {
        const option = document.createElement("option");
        option.value = month.monthKey;
        option.textContent = month.label || month.monthKey;
        return option;
      }),
    );
    const children = [yearOption];
    if (semesters.length) children.push(semesterGroup);
    if (months.length) children.push(monthGroup);
    elements.periodFilter.replaceChildren(...children);
    elements.periodFilter.value = selectedPeriod;
    elements.periodFilter.disabled =
      months.length === 0 && semesters.length === 0;
  }

  function eventTrendFromRows(events) {
    return events
      .filter((event) => event.date && event.attendance > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-8)
      .map((event) => ({
        label: event.name,
        shortLabel:
          event.name.length > 13
            ? `${event.name.slice(0, 12).trim()}…`
            : event.name,
        date: event.date.toISOString(),
        attendance: event.attendance,
        type: event.type,
      }));
  }

  function eventTypesFromRows(events) {
    return eventTypeColumns
      .map((type) => {
        const matching = events.filter((event) => event.type === type.name);
        return {
          name: type.name,
          count: matching.reduce(
            (sum, event) => sum + (Number(event.attendance) || 0),
            0,
          ),
          events: matching.length,
          color: type.color,
        };
      })
      .filter((type) => type.count > 0 || type.events > 0);
  }

  function priorPeriodFor(period, periods) {
    const index = periods.findIndex(
      (candidate) => candidate.periodKey === period.periodKey,
    );
    return index > 0 ? periods[index - 1] : null;
  }

  function deltaFromPrior(current, previous, precision = 0, unit = "period") {
    if (previous === null || previous === undefined) {
      return `First ${unit} in this academic year`;
    }
    const difference = Number(current || 0) - Number(previous || 0);
    if (Math.abs(difference) < 0.0001) return `No change vs prior ${unit}`;
    const formatted = Math.abs(difference).toFixed(precision);
    return `${difference > 0 ? "+" : "−"}${formatted} vs prior ${unit}`;
  }

  function eventFallsInPeriod(event, period) {
    if (!event.date || !period?.start) return false;
    const start = new Date(period.start);
    const end = new Date(start);
    end.setMonth(end.getMonth() + (period.kind === "semester" ? 6 : 1));
    return event.date >= start && event.date < end;
  }

  function periodView(data) {
    const months = data.monthlyMetrics || [];
    const semesters = data.semesterMetrics || [];
    const month = months.find((item) => item.monthKey === selectedPeriod);
    const semester = semesters.find(
      (item) => item.semesterKey === selectedPeriod,
    );
    const period = month || semester;
    if (!period) {
      return {
        period: null,
        previous: null,
        kind: "year",
        unit: "period",
        label: "Year to date",
        events: data.allEvents || [],
      };
    }
    const kind = month ? "month" : "semester";
    period.kind = kind;
    return {
      period,
      previous: priorPeriodFor(period, month ? months : semesters),
      kind,
      unit: kind,
      label: period.label,
      events: (data.allEvents || []).filter((event) =>
        eventFallsInPeriod(event, period),
      ),
    };
  }

  function renderSelectedPeriod() {
    const data = activeDashboardData;
    if (!data) return;
    const months = data.monthlyMetrics || [];
    const view = periodView(data);
    const { period, previous, kind, unit, label, events } = view;

    if (!period) {
      renderAttendanceEmptyState(data.kpis || {});
      renderFreshness(data.meta || {});
      renderKpis(data.kpis || {}, data.meta || {});
      renderAttendanceChart(data.attendanceTrend || []);
      renderGoal(data.kpis || {}, data.meta || {});
      renderEventTypes(data.eventTypes || []);
      renderParticipationFunnel(data.kpis || {}, label);
      renderEventPerformance(events, label);
      const latestActive = [...months]
        .reverse()
        .find((month) => month.totalCheckIns > 0);
      renderHealthInsight(
        latestActive || null,
        latestActive ? priorPeriodFor(latestActive, months) : null,
        latestActive ? "month" : "year",
      );
      setText("period-summary", "All available activity");
      setText(
        "period-detail",
        "Use a semester or month preset for a focused meeting review.",
      );
      return;
    }

    const periodKpis = {
      uniqueAttendees: period.uniqueAttendees,
      totalCheckIns: period.totalCheckIns,
      eventsHeld: period.eventsHeld,
      averageTurnout: period.averageTurnout,
      repeatAttendanceRate: period.repeatAttendanceRate,
      repeatAttendees: period.repeatAttendees,
      highlyEngagedAttendees: period.highlyEngagedAttendees,
      engagementGoal: data.kpis?.engagementGoal,
    };
    renderAttendanceEmptyState(periodKpis);
    const periodMeta = {
      ...(data.meta || {}),
      lastUpdated: period.updated
        ? sheetTimestamp(period.updated)?.toISOString() ||
          data.meta?.lastUpdated
        : data.meta?.lastUpdated,
      isPartial: false,
    };

    renderFreshness(periodMeta);
    renderKpis(periodKpis, periodMeta, {
      period,
      previous,
      unit,
    });
    renderAttendanceChart(eventTrendFromRows(events), label);
    renderGoal(data.kpis || {}, data.meta || {}, period);
    renderEventTypes(eventTypesFromRows(events));
    renderParticipationFunnel(periodKpis, label);
    renderEventPerformance(events, label);
    renderHealthInsight(period, previous, kind);
    setText("period-summary", label);
    setText(
      "period-detail",
      period.eventsHeld
        ? `Top event: ${period.topEventName} · ${formatNumber(
            period.topEventAttendance,
          )} check-in${
            period.topEventAttendance === 1 ? "" : "s"
          } · Leading type: ${period.topEventType}`
        : `No recorded attendance for this ${kind} yet.`,
    );
  }

  function renderAttendanceEmptyState(kpis = {}) {
    const hasAttendance =
      Number(kpis.totalCheckIns || 0) > 0 ||
      Number(kpis.uniqueAttendees || 0) > 0 ||
      Number(kpis.eventsHeld || 0) > 0;
    const guide = document.getElementById("attendance-empty-guide");
    if (guide) guide.hidden = hasAttendance;
    document.body.classList.toggle("attendance-data-empty", !hasAttendance);
  }

  function renderFreshness(meta) {
    const target = document.getElementById("last-updated");
    const label = document.getElementById("freshness-label");
    const dot = document.getElementById("freshness-dot");
    const updated = meta.lastUpdated ? new Date(meta.lastUpdated) : null;
    dot?.classList.remove("is-stale", "is-unavailable");

    if (!updated || Number.isNaN(updated.getTime())) {
      target.textContent = meta.isDemo ? "Demo data" : "Not provided";
      if (label) label.textContent = "Data status";
      dot?.classList.add("is-unavailable");
      return;
    }

    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(updated);

    const ageHours = Math.max(0, (Date.now() - updated.getTime()) / 3600000);
    const isStale = ageHours > 24;
    if (label) {
      label.textContent = isStale ? "Data may be stale" : "Data refreshed";
    }
    dot?.classList.toggle("is-stale", isStale);
    target.textContent = `${formatted}${meta.isDemo ? " · Demo" : ""}`;
  }

  function renderKpis(kpis, meta, period = null) {
    const participantCount = Number(kpis.uniqueAttendees) || 0;
    const reliableRepeatRate = participantCount >= minimumReliableSample;
    setText("kpi-unique-attendees", formatNumber(kpis.uniqueAttendees));
    setText("kpi-total-checkins", formatNumber(kpis.totalCheckIns));
    setText("kpi-events-held", formatNumber(kpis.eventsHeld));
    setText("hero-kpi-unique", formatNumber(kpis.uniqueAttendees));
    setText("hero-kpi-checkins", formatNumber(kpis.totalCheckIns));
    setText("hero-kpi-events", formatNumber(kpis.eventsHeld));
    setText(
      "kpi-average-turnout",
      hasMetric(kpis.averageTurnout)
        ? Number(kpis.averageTurnout).toFixed(1)
        : "—",
    );
    setText(
      "kpi-repeat-rate",
      reliableRepeatRate && hasMetric(kpis.repeatAttendanceRate)
        ? `${Math.round(Number(kpis.repeatAttendanceRate))}%`
        : "—",
    );

    if (period?.period) {
      const selected = period.period;
      const previous = period.previous;
      const unit = period.unit || "period";
      setText(
        "kpi-unique-attendees-context",
        `${formatNumber(selected.newAttendees)} new participant${
          selected.newAttendees === 1 ? "" : "s"
        }`,
      );
      setText(
        "kpi-total-checkins-context",
        deltaFromPrior(
          selected.totalCheckIns,
          previous?.totalCheckIns,
          0,
          unit,
        ),
      );
      setText(
        "kpi-events-held-context",
        deltaFromPrior(selected.eventsHeld, previous?.eventsHeld, 0, unit),
      );
      setText(
        "kpi-average-turnout-context",
        deltaFromPrior(
          selected.averageTurnout,
          previous?.averageTurnout,
          1,
          unit,
        ),
      );
      setText(
        "kpi-repeat-rate-context",
        reliableRepeatRate
          ? `${formatNumber(selected.repeatAttendees)} repeat participant${
              selected.repeatAttendees === 1 ? "" : "s"
            }`
          : `Needs ${minimumReliableSample} participants for a stable rate`,
      );
    } else if (meta.isPartial) {
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
      setText(
        "kpi-repeat-rate-context",
        reliableRepeatRate
          ? "Attended two or more events"
          : `Needs ${minimumReliableSample} participants for a stable rate`,
      );
    } else {
      setText("kpi-unique-attendees-context", "Across all recorded events");
      setText("kpi-total-checkins-context", "All attendance submissions");
      setText("kpi-events-held-context", "Events with recorded attendance");
      setText("kpi-average-turnout-context", "Check-ins per event");
      setText(
        "kpi-repeat-rate-context",
        reliableRepeatRate
          ? "Attended two or more events"
          : `Needs ${minimumReliableSample} participants for a stable rate`,
      );
    }
  }

  function renderBudget(budget, source = {}) {
    const trackerLink = document.getElementById("budget-tracker-link");
    if (trackerLink) {
      const url = source.budgetTrackerUrl || "#resources";
      trackerLink.href = url;
      trackerLink.target = url.startsWith("#") ? "_self" : "_blank";
      trackerLink.rel = url.startsWith("#") ? "" : "noopener";
    }

    if (!budget.available) {
      [
        "budget-approved-income",
        "budget-approved-expenses",
        "budget-pending-approval",
        "budget-remaining",
        "budget-used-rate",
      ].forEach((id) => setText(id, "—"));
      setText("budget-period", source.label || "Not connected");
      setText("budget-planned-context", "Aggregate feed unavailable");
      setText(
        "budget-freshness",
        budget.error || "No sanitized budget feed is configured for this year.",
      );
      const emptyFill = document.getElementById("budget-progress-fill");
      if (emptyFill) emptyFill.style.width = "0%";
      const emptyProgress = emptyFill?.parentElement;
      if (emptyProgress) emptyProgress.setAttribute("aria-valuenow", "0");
      document.getElementById("budget-usage-card")?.classList.remove("is-warning");
      document.getElementById("budget-remaining-card")?.classList.remove("is-warning");
      setText("budget-used-label", "Budget used");
      const unavailableContext = document.getElementById("budget-used-context");
      if (unavailableContext) unavailableContext.hidden = true;
      if (emptyProgress) emptyProgress.hidden = false;
      renderBudgetCategories([]);
      return;
    }

    const money = (value) =>
      hasMetric(value) ? currencyFormatter.format(Number(value)) : "—";
    const rawRate = Number(budget.budgetUsedRate);
    const percent = Number.isFinite(rawRate)
      ? rawRate <= 1
        ? rawRate * 100
        : rawRate
      : 0;
    const boundedPercent = Math.max(0, Math.min(100, percent));
    const plannedBudget = Number(budget.plannedBudget) || 0;
    const categorizedExpenses = (Array.isArray(budget.categories)
      ? budget.categories
      : []
    ).reduce((sum, category) => sum + (Number(category.actual) || 0), 0);
    const approvedExpenses = Math.max(
      Number(budget.approvedExpenses) || 0,
      categorizedExpenses,
    );
    const remainingBudget = Number(budget.remainingBudget) || 0;
    const needsBudgetPlan = plannedBudget <= 0;

    setText("budget-period", budget.academicYear || source.label || "Current year");
    setText("budget-approved-income", money(budget.approvedIncome));
    setText("budget-approved-expenses", money(budget.approvedExpenses));
    setText("budget-pending-approval", money(budget.pendingApproval));
    setText("budget-remaining", money(budget.remainingBudget));
    setText(
      "budget-used-rate",
      needsBudgetPlan ? "Not set" : `${Math.round(percent)}%`,
    );
    setText(
      "budget-planned-context",
      `Of ${money(budget.plannedBudget)} planned`,
    );

    const fill = document.getElementById("budget-progress-fill");
    if (fill) fill.style.width = `${boundedPercent}%`;
    const progress = fill?.parentElement;
    if (progress) {
      progress.setAttribute("aria-valuenow", String(Math.round(boundedPercent)));
      progress.hidden = needsBudgetPlan;
    }
    const usageCard = document.getElementById("budget-usage-card");
    const remainingCard = document.getElementById("budget-remaining-card");
    const usageContext = document.getElementById("budget-used-context");
    usageCard?.classList.toggle("is-warning", needsBudgetPlan);
    remainingCard?.classList.toggle("is-warning", remainingBudget < 0);
    setText("budget-used-label", needsBudgetPlan ? "Budget plan needed" : "Budget used");
    if (usageContext) {
      usageContext.hidden = !needsBudgetPlan;
      usageContext.textContent = approvedExpenses
        ? `${money(approvedExpenses)} categorized spending without a planned budget`
        : "Add a planned budget to calculate usage";
    }
    renderBudgetCategories(budget.categories || []);

    const updated = budget.updatedAt ? new Date(budget.updatedAt) : null;
    setText(
      "budget-freshness",
      updated && !Number.isNaN(updated.getTime())
        ? `Aggregate-only totals · Refreshed ${new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(updated)}`
        : "Aggregate-only totals from the budget export",
    );
  }

  function renderBudgetCategories(categories) {
    const donut = document.getElementById("budget-category-donut");
    const total = document.getElementById("budget-category-total");
    const legend = document.getElementById("budget-category-legend");
    const bars = document.getElementById("budget-category-bars");
    if (!donut || !total || !legend || !bars) return;

    const colors = [
      chartPalette[2],
      chartPalette[1],
      chartPalette[0],
      chartPalette[3],
      chartPalette[4],
      chartPalette[5],
      chartPalette[6],
    ];
    const clean = (Array.isArray(categories) ? categories : [])
      .map((category) => ({
        label: String(category.label || category.slug || "Other"),
        actual: Math.max(0, Number(category.actual) || 0),
        planned: Math.max(0, Number(category.planned) || 0),
      }))
      .filter((category) => category.actual > 0 || category.planned > 0);

    const actualCategories = clean
      .filter((category) => category.actual > 0)
      .sort((a, b) => b.actual - a.actual);
    const visibleActual = actualCategories.slice(0, 6);
    if (actualCategories.length > 6) {
      visibleActual.push({
        label: "Other",
        actual: actualCategories
          .slice(6)
          .reduce((sum, category) => sum + category.actual, 0),
        planned: 0,
      });
    }
    const actualTotal = visibleActual.reduce(
      (sum, category) => sum + category.actual,
      0,
    );
    total.textContent = currencyFormatter.format(actualTotal);
    legend.replaceChildren();

    if (!actualTotal) {
      donut.style.background = "conic-gradient(var(--border) 0 100%)";
      donut.setAttribute("aria-label", "No approved spending by category yet");
      const empty = document.createElement("p");
      empty.className = "budget-empty-state";
      empty.textContent = "No approved spending yet.";
      legend.append(empty);
    } else {
      let cursor = 0;
      const stops = visibleActual.map((category, index) => {
        const start = cursor;
        cursor += (category.actual / actualTotal) * 100;
        return `${colors[index % colors.length]} ${start}% ${cursor}%`;
      });
      donut.style.background = `conic-gradient(${stops.join(", ")})`;
      donut.setAttribute(
        "aria-label",
        `Approved spending by category, ${currencyFormatter.format(actualTotal)} total`,
      );
      legend.append(
        ...visibleActual.map((category, index) => {
          const row = document.createElement("div");
          row.className = "budget-legend-row";
          const marker = document.createElement("i");
          marker.style.background = colors[index % colors.length];
          marker.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.textContent = category.label;
          const value = document.createElement("strong");
          value.textContent = currencyFormatter.format(category.actual);
          row.append(marker, label, value);
          return row;
        }),
      );
    }

    bars.replaceChildren();
    const paced = clean
      .sort((a, b) => b.actual - a.actual || b.planned - a.planned)
      .slice(0, 8);
    if (!paced.length) {
      const empty = document.createElement("p");
      empty.className = "budget-empty-state";
      empty.textContent = "Add category budgets to see pacing.";
      bars.append(empty);
      return;
    }

    bars.append(
      ...paced.map((category) => {
        const row = document.createElement("div");
        row.className = "budget-category-row";
        const rate = category.planned > 0
          ? (category.actual / category.planned) * 100
          : category.actual > 0
            ? 100
            : 0;
        if (category.planned <= 0 && category.actual > 0) {
          row.classList.add("is-unplanned");
        } else if (category.actual > category.planned && category.actual > 0) {
          row.classList.add("is-over");
        }
        const heading = document.createElement("div");
        heading.className = "budget-category-row-head";
        const label = document.createElement("strong");
        label.textContent = category.label;
        const value = document.createElement("span");
        value.textContent = category.planned > 0
          ? `${currencyFormatter.format(category.actual)} of ${currencyFormatter.format(category.planned)}`
          : `${currencyFormatter.format(category.actual)} · plan needed`;
        heading.append(label, value);
        const track = document.createElement("div");
        track.className = "budget-category-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", `${category.label} budget used`);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute(
          "aria-valuenow",
          String(Math.round(Math.min(100, Math.max(0, rate)))),
        );
        const fill = document.createElement("span");
        fill.style.width = `${Math.min(100, Math.max(0, rate))}%`;
        track.append(fill);
        row.append(heading, track);
        return row;
      }),
    );
  }

  function renderAttendanceChart(items, periodLabel = "") {
    const svg = document.getElementById("attendance-chart");
    const chartWrap = svg.closest(".chart-wrap");
    const chartPanel = svg.closest(".trend-panel");
    const legend = document.getElementById("attendance-chart-legend");
    const summary = document.getElementById("trend-summary");
    svg.replaceChildren();
    legend.replaceChildren();

    if (!items.length) {
      chartWrap?.classList.add("is-empty");
      chartPanel?.classList.add("is-chart-empty");
      svg.setAttribute("viewBox", "0 0 700 160");
      svg.setAttribute("preserveAspectRatio", "none");
      const baseline = svgElement("line", {
        x1: "56",
        y1: "116",
        x2: "664",
        y2: "116",
        class: "chart-grid-line chart-empty-grid",
      });
      const ticks = [56, 208, 360, 512, 664].map((x) =>
        svgElement("line", {
          x1: String(x),
          y1: "108",
          x2: String(x),
          y2: "124",
          class: "chart-grid-line chart-empty-grid",
        }),
      );
      const message = svgElement("text", {
        x: "350",
        y: "80",
        "text-anchor": "middle",
        class: "chart-axis-label",
      });
      message.textContent = "No attendance data available";
      svg.append(baseline, ...ticks, message);
      summary.textContent = "No events";
      return;
    }

    chartWrap?.classList.remove("is-empty");
    chartPanel?.classList.remove("is-chart-empty");

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
        "stop-color": chartPalette[0],
        "stop-opacity": "0.19",
      }),
      svgElement("stop", {
        offset: "100%",
        "stop-color": chartPalette[0],
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
    const colors = chartPalette.slice(0, 5);
    eventTypes.forEach((type, index) => {
      const item = document.createElement("span");
      const dot = document.createElement("i");
      dot.style.backgroundColor = colors[index % colors.length];
      item.append(dot, document.createTextNode(type));
      legend.append(item);
    });

    summary.textContent = periodLabel
      ? `${items.length} event${items.length === 1 ? "" : "s"} · ${periodLabel}`
      : `${items.length} recent event${items.length === 1 ? "" : "s"}`;
  }

  function renderHealthInsight(period, previous, kind) {
    const container = document.getElementById("health-insight");
    const status = document.getElementById("health-insight-status");
    const copy = document.getElementById("health-insight-copy");
    container.classList.remove("is-positive", "is-watch", "is-alert", "is-neutral");

    if (!period) {
      container.classList.add("is-neutral");
      status.textContent = "Chapter pulse";
      copy.textContent =
        "Attendance will become more useful after the first recorded event.";
      return;
    }

    const checkIns = Number(period.totalCheckIns) || 0;
    const participants = Number(period.uniqueAttendees) || 0;
    const previousCheckIns = Number(previous?.totalCheckIns) || 0;
    const repeatRate = Math.round(Number(period.repeatAttendanceRate) || 0);
    const previousRepeat = Math.round(
      Number(previous?.repeatAttendanceRate) || 0,
    );
    const comparison = previousCheckIns
      ? Math.round(((checkIns - previousCheckIns) / previousCheckIns) * 100)
      : null;
    let tone = "is-neutral";
    let label = "Chapter pulse";

    if (checkIns === 0) {
      tone = "is-watch";
      label = "No activity yet";
    } else if (comparison === null) {
      tone = "is-positive";
      label = "Baseline established";
    } else if (comparison >= 0 && repeatRate >= previousRepeat) {
      tone = "is-positive";
      label = "Momentum building";
    } else if (comparison <= -20) {
      tone = "is-alert";
      label = "Turnout needs attention";
    } else {
      tone = "is-watch";
      label = "Worth watching";
    }
    container.classList.add(tone);
    status.textContent = label;

    if (!checkIns) {
      copy.textContent = `No check-ins are recorded for this ${kind} yet. Confirm upcoming events and attendance forms are ready.`;
      return;
    }

    const turnoutText =
      comparison === null
        ? `${formatNumber(checkIns)} check-ins establish the first ${kind} baseline`
        : `${formatNumber(checkIns)} check-ins are ${
            comparison >= 0 ? "up" : "down"
          } ${Math.abs(comparison)}% from the prior ${kind}`;
    const topEventText = period.topEventName
      ? `${period.topEventName} led turnout with ${formatNumber(
          period.topEventAttendance,
        )} check-in${period.topEventAttendance === 1 ? "" : "s"}.`
      : "No top event is available yet.";
    const repeatText =
      participants >= minimumReliableSample
        ? `repeat participation is ${repeatRate}%`
        : `repeat participation will be shown after ${minimumReliableSample} participants`;
    copy.textContent = `${turnoutText}; ${repeatText}. ${topEventText}`;
  }

  function renderParticipationFunnel(kpis, periodLabel) {
    const participated = Number(kpis.uniqueAttendees) || 0;
    const returned = Number(kpis.repeatAttendees) || 0;
    const engaged = Number(kpis.highlyEngagedAttendees) || 0;
    const widthFor = (value) =>
      `${participated ? Math.max(3, Math.round((value / participated) * 100)) : 0}%`;

    setText("funnel-period", periodLabel || "Year to date");
    setText("funnel-participated", formatNumber(participated));
    setText("funnel-returned", formatNumber(returned));
    setText("funnel-engaged", formatNumber(engaged));
    document.getElementById("funnel-participated-bar").style.width =
      widthFor(participated);
    document.getElementById("funnel-returned-bar").style.width =
      widthFor(returned);
    document.getElementById("funnel-engaged-bar").style.width = widthFor(engaged);
  }

  function renderEventPerformance(events, periodLabel) {
    const body = document.getElementById("event-performance-body");
    const sorted = [...events].sort(
      (a, b) => Number(b.attendance || 0) - Number(a.attendance || 0),
    );
    const attended = sorted.filter((event) => Number(event.attendance) > 0);
    const average = attended.length
      ? attended.reduce(
          (sum, event) => sum + Number(event.attendance || 0),
          0,
        ) / attended.length
      : 0;
    setText(
      "performance-summary",
      sorted.length
        ? `${formatNumber(sorted.length)} event${
            sorted.length === 1 ? "" : "s"
          } · ${periodLabel}`
        : `No events · ${periodLabel}`,
    );

    if (!sorted.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "performance-empty";
      cell.textContent = "No configured events fall within this review period.";
      row.append(cell);
      body.replaceChildren(row);
      return;
    }

    body.replaceChildren(
      ...sorted.slice(0, 8).map((event, index) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        name.dataset.label = "Event";
        const nameStrong = document.createElement("strong");
        nameStrong.textContent = event.name;
        name.append(nameStrong);
        const type = document.createElement("td");
        type.dataset.label = "Type";
        type.textContent = event.type || "Other";
        const date = document.createElement("td");
        date.dataset.label = "Date";
        date.textContent = event.date
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(event.date)
          : "TBD";
        const attendance = document.createElement("td");
        attendance.dataset.label = "Check-ins";
        attendance.className = "performance-number";
        attendance.textContent = formatNumber(event.attendance);
        const statusCell = document.createElement("td");
        statusCell.dataset.label = "Performance";
        const chip = document.createElement("span");
        const count = Number(event.attendance) || 0;
        if (count === 0) {
          chip.className = "performance-status is-empty";
          chip.textContent = "No check-ins";
        } else if (index === 0) {
          chip.className = "performance-status is-top";
          chip.textContent = "Top turnout";
        } else if (count >= average) {
          chip.className = "performance-status is-above";
          chip.textContent = "Above average";
        } else {
          chip.className = "performance-status is-below";
          chip.textContent = "Below average";
        }
        statusCell.append(chip);
        row.append(name, type, date, attendance, statusCell);
        return row;
      }),
    );
  }

  function goalPace(kpis, meta) {
    const target = Number(kpis.engagementGoal) || 0;
    const current = Number(kpis.uniqueAttendees) || 0;
    const yearMatch = String(meta.academicYear || "").match(/(\d{4})/);
    const startYear = Number(yearMatch?.[1]);
    if (!target || !startYear) {
      return { label: "Goal set", tone: "is-neutral", variance: null };
    }
    const start = new Date(startYear, 6, 1);
    const end = new Date(startYear + 1, 6, 1);
    const referenceCandidate = new Date(meta.lastUpdated || Date.now());
    const reference = Number.isNaN(referenceCandidate.getTime())
      ? new Date()
      : referenceCandidate;
    const clamped = new Date(
      Math.min(end.getTime(), Math.max(start.getTime(), reference.getTime())),
    );
    const elapsed =
      (clamped.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    const actual = current / target;
    const variance = Math.round((actual - elapsed) * 100);
    if (variance >= 0) {
      return { label: "On pace", tone: "is-positive", variance };
    }
    if (variance >= -10) {
      return { label: "Watch", tone: "is-watch", variance };
    }
    return { label: "Behind pace", tone: "is-alert", variance };
  }

  function renderGoal(kpis, meta, period = null) {
    const current = Number(kpis.uniqueAttendees) || 0;
    const target = Number(kpis.engagementGoal) || 0;
    const percent = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const remaining = Math.max(0, target - current);
    const ring = document.getElementById("goal-ring");
    const pace = goalPace(kpis, meta);
    const paceChip = document.getElementById("goal-status");

    ring.style.setProperty("--goal-progress", `${percent}%`);
    ring.setAttribute(
      "aria-label",
      `${formatNumber(current)} of ${formatNumber(target)} unique attendees, ${percent} percent`,
    );
    setText("goal-percent", `${percent}%`);
    setText("goal-current", formatNumber(current));
    setText("goal-target", formatNumber(target));
    paceChip.className = `pace-chip ${pace.tone}`;
    paceChip.textContent = pace.label;
    setText(
      "goal-note",
      period
        ? `${formatNumber(period.uniqueAttendees)} participant${
            period.uniqueAttendees === 1 ? "" : "s"
          } in ${period.label} · ${formatNumber(
            remaining,
          )} remaining to the annual goal.`
        : remaining
          ? `${formatNumber(
              remaining,
            )} more unique attendees to reach the annual goal${
              pace.variance === null
                ? "."
                : ` · ${Math.abs(pace.variance)} points ${
                    pace.variance >= 0 ? "ahead of" : "behind"
                  } expected pace.`
            }`
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
      return `${item.color || chartPalette[4]} ${start}% ${cursor}%`;
    });

    donut.style.background = segments.length
      ? `conic-gradient(${segments.join(",")})`
      : "var(--border)";
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
        dot.style.backgroundColor = item.color || chartPalette[4];

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
    const actionableItems = items.filter((item) => item.severity !== "success");
    const actionable = actionableItems.length;
    setText(
      "operations-count",
      `${actionable} open item${actionable === 1 ? "" : "s"}`,
    );
    setText("nav-alert-count", String(actionable));
    setText(
      "overview-attention-count",
      actionable
        ? `${actionable} open item${actionable === 1 ? "" : "s"}`
        : "All clear",
    );

    container.replaceChildren(
      ...(actionableItems.length
        ? actionableItems
        : [
            {
              severity: "success",
              title: "No open operational items",
              detail: "Connected systems are not reporting any action items.",
            },
          ]).map((item) => {
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
          action.append(
            document.createTextNode(item.actionLabel),
            createHubIcon(
              item.actionUrl.startsWith("#") ? "arrow-right" : "external",
            ),
          );
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

  function renderHealth(items) {
    const healthyContainer = document.getElementById("health-grid");
    const attentionContainer = document.getElementById("health-attention-grid");
    const healthySystems = document.getElementById("healthy-systems");
    if (!healthyContainer || !attentionContainer || !healthySystems) return;
    const createHealthItem = (item) => {
      const article = document.createElement("article");
      const status = String(item.status || "NOTICE").toLowerCase();
      article.className = `health-item is-${status}`;
      const header = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.label;
      const pill = document.createElement("span");
      pill.textContent = item.status || "NOTICE";
      header.append(title, pill);
      const detail = document.createElement("p");
      detail.textContent = item.detail || "No detail provided";
      article.append(header, detail);
      return article;
    };
    const healthy = items.filter(
      (item) => String(item.status || "").toUpperCase() === "LIVE",
    );
    const attention = items.filter(
      (item) => String(item.status || "").toUpperCase() !== "LIVE",
    );
    healthyContainer.replaceChildren(...healthy.map(createHealthItem));
    attentionContainer.replaceChildren(...attention.map(createHealthItem));
    attentionContainer.hidden = attention.length === 0;
    healthySystems.hidden = healthy.length === 0;
    healthySystems.open = false;
    setText(
      "healthy-systems-count",
      `${healthy.length} system${healthy.length === 1 ? "" : "s"} healthy`,
    );
  }

  function resourceCategoryKey(category = "") {
    return String(category)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "resource";
  }

  function resourceIconName(resource = {}) {
    const categoryIcons = {
      Attendance: "check-square",
      Communications: "mail",
      Events: "calendar",
      Finance: "wallet",
      Members: "users",
      "Officer Access": "lock",
      Operations: "settings",
      Public: "globe",
      Technology: "code",
    };
    return resource.icon || categoryIcons[resource.category] || "link";
  }

  function renderFrequentResources(resources) {
    if (!elements.frequentResourceGrid) return;
    const featured = resources
      .filter((resource) => resource.featured)
      .slice(0, 4);
    elements.frequentResourceGrid.replaceChildren(
      ...featured.map((resource) => {
        const action = resource.url
          ? document.createElement("a")
          : document.createElement("span");
        action.className = `frequent-resource is-${resourceCategoryKey(resource.category)}${
          resource.url ? "" : " is-disabled"
        }`;
        if (resource.url) {
          action.href = resource.url;
          action.target = resource.url.startsWith("#") ? "_self" : "_blank";
          action.rel = resource.url.startsWith("#") ? "" : "noopener";
        }
        const icon = document.createElement("span");
        icon.className = "frequent-resource-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.append(createHubIcon(resourceIconName(resource)));
        const copy = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = resource.title;
        const detail = document.createElement("small");
        detail.textContent = resource.category;
        copy.append(title, detail);
        action.append(icon, copy, createLinkChainIcon());
        return action;
      }),
    );
  }

  function renderResources(resources) {
    const container = document.getElementById("resource-grid");
    activeResources = resources;
    renderFrequentResources(resources);
    const categories = [...new Set(resources.map((resource) => resource.category))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const currentFilter = elements.resourceFilter?.value || "all";
    if (elements.resourceFilter) {
      elements.resourceFilter.replaceChildren(
        new Option("All categories", "all"),
        ...categories.map((category) => new Option(category, category)),
      );
      elements.resourceFilter.value = categories.includes(currentFilter)
        ? currentFilter
        : "all";
    }
    const selectedCategory = elements.resourceFilter?.value || "all";
    const query = String(elements.resourceSearch?.value || "")
      .trim()
      .toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const visibleResources = resources.filter((resource) => {
      const inCategory =
        selectedCategory === "all" || resource.category === selectedCategory;
      const haystack = `${resource.title} ${resource.description} ${resource.label} ${resource.category}`.toLowerCase();
      return inCategory && terms.every((term) => haystack.includes(term));
    });
    if (elements.frequentResources) {
      elements.frequentResources.hidden =
        selectedCategory !== "all" || terms.length > 0;
    }
    if (elements.resourceCount) {
      elements.resourceCount.textContent = `${visibleResources.length} resource${
        visibleResources.length === 1 ? "" : "s"
      }`;
    }
    if (!visibleResources.length) {
      const empty = document.createElement("section");
      empty.className = "resource-empty-state";
      empty.append(createHubIcon("search"));
      const title = document.createElement("h3");
      title.textContent = "No matching resources";
      const detail = document.createElement("p");
      detail.textContent = "Try a different search or choose All categories.";
      empty.append(title, detail);
      container.replaceChildren(empty);
      return;
    }
    container.replaceChildren(
      ...visibleResources.map((resource) => {
        const article = document.createElement("article");
        const categoryKey = resourceCategoryKey(resource.category);
        article.className = `resource-card is-${categoryKey}`;
        article.dataset.category = categoryKey;

        const category = document.createElement("span");
        category.className = "resource-category";
        category.append(createHubIcon(resourceIconName(resource)));
        category.append(document.createTextNode(resource.category));

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
          const label = document.createElement("span");
          label.textContent = resource.label;
          action.append(label, createLinkChainIcon());
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

  function renderQuickActions(resources) {
    const container = document.getElementById("quick-action-grid");
    if (!container) return;
    const actions = resources
      .filter((resource) => resource.quickAction)
      .slice(0, 8);

    container.replaceChildren(
      ...actions.map((resource) => {
        const action = resource.url
          ? document.createElement("a")
          : document.createElement("span");
        action.className =
          `quick-action${resource.url ? "" : " is-disabled"}`;
        if (resource.url) {
          action.href = resource.url;
          action.target = resource.url.startsWith("#") ? "_self" : "_blank";
          if (action.target === "_blank") action.rel = "noopener";
        }

        const icon = document.createElement("span");
        icon.className = "quick-action-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.append(createHubIcon(resource.quickAction.icon || "external"));

        const copy = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = resource.quickAction.label;
        const detail = document.createElement("small");
        detail.textContent = resource.url
          ? resource.quickAction.detail
          : "Setup needed";
        copy.append(title, detail);
        action.append(icon, copy);
        return action;
      }),
    );
  }

  function applyTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = resolved === "dark" ? "#061426" : "#f2f5f9";
    }
    [
      elements.themeToggle,
      elements.sidebarThemeToggle,
      elements.gateThemeToggle,
    ].forEach((button) => {
      if (!button) return;
      const label =
        resolved === "dark" ? "Switch to light theme" : "Switch to dark theme";
      button.setAttribute("aria-label", label);
      button.title = label;
    });

    if (elements.gateThemeToggle) {
      const gateLabel = elements.gateThemeToggle.querySelector(
        ".gate-theme-label",
      );
      if (gateLabel) {
        gateLabel.textContent = resolved === "dark" ? "Light mode" : "Dark mode";
      }
    }
    document
      .querySelectorAll(
        ".theme-icon use, .gate-theme-icon use, #sidebar-theme-toggle use",
      )
      .forEach((use) =>
        use.setAttribute(
          "href",
          resolved === "dark" ? "#icon-sun" : "#icon-theme",
        ),
      );
  }

  function setMobileNavigation(open) {
    const resolved = Boolean(open);
    document.body.classList.toggle("nav-open", resolved);
    elements.mobileMenuButton.setAttribute("aria-expanded", String(resolved));
    elements.mobileMenuButton.setAttribute(
      "aria-label",
      resolved ? "Close navigation" : "Open navigation",
    );
  }

  function applySidebarState(collapsed) {
    const desktop = window.matchMedia("(min-width: 1081px)").matches;
    const resolved = Boolean(collapsed && desktop);
    document.body.classList.toggle("sidebar-collapsed", resolved);
    elements.sidebarCollapse.setAttribute("aria-expanded", String(!resolved));
    elements.sidebarCollapse.setAttribute(
      "aria-label",
      resolved ? "Expand sidebar" : "Collapse sidebar",
    );
    elements.sidebarCollapse.title = resolved
      ? "Expand sidebar"
      : "Collapse sidebar";
  }

  function setupNavigation() {
    const navLinks = [
      ...document.querySelectorAll(".nav-link, .mobile-section-link"),
    ];
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(
        (section, index, all) =>
          section && all.findIndex((candidate) => candidate?.id === section.id) === index,
      );
    const mobileGroups = [
      ...document.querySelectorAll("[data-mobile-sections]"),
    ];
    const mobileViewport = window.matchMedia("(max-width: 720px)");
    let navigationTargetId = "";
    let navigationTimer = 0;

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

    const applyMobileSection = (sectionId = "overview") => {
      const isMobile = mobileViewport.matches;
      document.body.classList.toggle("mobile-section-view", isMobile);
      mobileGroups.forEach((group) => {
        const sectionIds = String(group.dataset.mobileSections || "").split(/\s+/);
        group.classList.toggle(
          "is-mobile-active",
          !isMobile || sectionIds.includes(sectionId),
        );
      });
    };
    setActiveMobileSection = applyMobileSection;

    let scrollFrame = 0;
    const updateNavigationFromScroll = () => {
      if (elements.appShell.hidden || navigationTargetId) return;
      if (mobileViewport.matches) {
        setActiveNavigation(window.location.hash.slice(1) || "overview");
        return;
      }
      const pageBottom = window.scrollY + window.innerHeight;
      const documentBottom = document.documentElement.scrollHeight;

      if (pageBottom >= documentBottom - 12) {
        setActiveNavigation(sections[sections.length - 1].id);
        return;
      }

      const readingLine =
        window.scrollY + Math.min(window.innerHeight * 0.3, 260);
      const activeSection = sections.reduce((current, section) => {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        return sectionTop <= readingLine ? section : current;
      }, sections[0]);
      setActiveNavigation(activeSection.id);
    };

    const releaseNavigationLock = () => {
      if (!navigationTargetId) return;
      navigationTargetId = "";
      window.clearTimeout(navigationTimer);
      navigationTimer = 0;
      updateNavigationFromScroll();
    };

    const navigateToSection = (sectionId, updateHistory = true) => {
      const target = document.getElementById(sectionId);
      if (!target) return;
      navigationTargetId = sectionId;
      applyMobileSection(sectionId);
      setActiveNavigation(sectionId);
      if (updateHistory && window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, "", `#${sectionId}`);
      }
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      window.clearTimeout(navigationTimer);
      navigationTimer = window.setTimeout(releaseNavigationLock, 850);
      setMobileNavigation(false);
    };

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigateToSection(link.getAttribute("href").slice(1));
      });
    });
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (navLinks.includes(link)) return;
      const sectionId = link.getAttribute("href").slice(1);
      if (!sections.some((section) => section.id === sectionId)) return;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigateToSection(sectionId);
      });
    });

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
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", releaseNavigationLock);
    }
    window.addEventListener("popstate", () => {
      const sectionId = window.location.hash.slice(1) || "overview";
      navigateToSection(sectionId, false);
    });
    mobileViewport.addEventListener("change", () => {
      const sectionId = window.location.hash.slice(1) || "overview";
      applyMobileSection(sectionId);
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        setActiveNavigation(sectionId);
      });
    });

    refreshNavigation = updateNavigationFromScroll;
    applyMobileSection(window.location.hash.slice(1) || "overview");
    if (!elements.appShell.hidden) updateNavigationFromScroll();
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

  function formatCompactDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, String(value)),
    );
    return element;
  }

  function createHubIcon(name = "link", className = "") {
    const icon = svgElement("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
    });
    icon.classList.add("ui-icon");
    if (className) icon.classList.add(className);
    const use = svgElement("use", { href: `#icon-${name}` });
    icon.append(use);
    return icon;
  }

  function createLinkChainIcon() {
    return createHubIcon("link", "link-chain-icon");
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
        budgetTrackerUrl: "",
        budgetExportSheetUrl: "",
        budgetExportSheetTab: "Budget_Public",
        bankingUrl: current.bankingUrl,
        fundraisingUrl: current.fundraisingUrl,
        isActive: true,
        isCurrent: false,
      },
      true,
    );
  });

  elements.settingsPublish.addEventListener("click", publishSettings);

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

  elements.periodFilter.addEventListener("change", () => {
    selectedPeriod = elements.periodFilter.value;
    renderSelectedPeriod();
  });

  const prepareHubPrint = () => {
    const yearLabel =
      elements.academicYear.selectedOptions[0]?.textContent?.trim() ||
      elements.academicYear.value ||
      "Current year";
    const periodLabel =
      elements.periodFilter.selectedOptions[0]?.textContent?.trim() ||
      "Year to date";
    document.body.dataset.printMode = "full";
    document.title = `ASME Officer Hub - Complete report - ${yearLabel}`;
    if (elements.printReportMeta) {
      elements.printReportMeta.textContent = `${yearLabel} · ${periodLabel} · ${new Intl.DateTimeFormat(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      ).format(new Date())}`;
    }
    if (elements.healthySystems) {
      if (!elements.healthySystems.dataset.printWasOpen) {
        elements.healthySystems.dataset.printWasOpen = String(
          elements.healthySystems.open,
        );
      }
      elements.healthySystems.open = true;
    }
  };

  const cleanupHubPrint = () => {
    if (elements.healthySystems?.dataset.printWasOpen) {
      elements.healthySystems.open =
        elements.healthySystems.dataset.printWasOpen === "true";
      delete elements.healthySystems.dataset.printWasOpen;
    }
    delete document.body.dataset.printMode;
    document.title = defaultDocumentTitle;
  };

  window.addEventListener("beforeprint", prepareHubPrint);
  window.addEventListener("afterprint", () => {
    cleanupHubPrint();
  });

  if (elements.printHubButton) {
    elements.printHubButton.addEventListener("click", () => {
      prepareHubPrint();
      window.print();
    });
  }

  [
    elements.themeToggle,
    elements.sidebarThemeToggle,
    elements.gateThemeToggle,
  ].forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      const nextTheme =
        document.body.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });
  });

  elements.sidebarCollapse.addEventListener("click", () => {
    const nextCollapsed = !document.body.classList.contains(
      "sidebar-collapsed",
    );
    localStorage.setItem(sidebarStorageKey, String(nextCollapsed));
    applySidebarState(nextCollapsed);
  });

  window.addEventListener("resize", () => {
    applySidebarState(localStorage.getItem(sidebarStorageKey) === "true");
  });

  elements.mobileMenuButton.addEventListener("click", () => {
    const opening = !document.body.classList.contains("nav-open");
    setMobileNavigation(opening);
  });

  if (elements.searchButton) {
    elements.searchButton.addEventListener("click", openHubSearch);
  }
  if (elements.searchClose) {
    elements.searchClose.addEventListener("click", closeHubSearch);
  }
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", () => {
      renderHubSearchResults(elements.searchInput.value);
    });
  }
  if (elements.resourceFilter) {
    elements.resourceFilter.addEventListener("change", () => {
      renderResources(activeResources);
    });
  }
  if (elements.resourceSearch) {
    elements.resourceSearch.addEventListener("input", () => {
      renderResources(activeResources);
    });
  }

  document.addEventListener("click", (event) => {
    if (
      document.body.classList.contains("nav-open") &&
      !elements.mobileMenuButton.contains(event.target) &&
      !document.getElementById("sidebar").contains(event.target)
    ) {
      setMobileNavigation(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openHubSearch();
      return;
    }
    if (
      event.key === "Escape" &&
      document.body.classList.contains("nav-open")
    ) {
      setMobileNavigation(false);
      elements.mobileMenuButton.focus();
    }
  });

  async function initialize() {
    showRandomMeetingQuote();

    const savedTheme = localStorage.getItem(themeStorageKey);
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    applyTheme(savedTheme || preferredTheme);

    sharedSettingsReady = loadSharedYearSources();
    await sharedSettingsReady;

    const sharedSettingsUrl =
      config.sharedSettings && config.sharedSettings.editUrl;
    [elements.settingsSharedLink, elements.settingsSharedAction].forEach(
      (link) => {
        if (link && sharedSettingsUrl) link.href = sharedSettingsUrl;
      },
    );
    elements.settingsPublish.hidden = !String(
      config.sharedSettings?.writeUrl || "",
    ).trim();

    populateYears();
    setupNavigation();
    applySidebarState(localStorage.getItem(sidebarStorageKey) === "true");

    if (isUnlocked()) {
      elements.gate.hidden = true;
      elements.appShell.hidden = false;
      await loadDashboard(elements.academicYear.value);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const hashTarget = window.location.hash
        ? document.querySelector(window.location.hash)
        : null;
      if (hashTarget) {
        setActiveMobileSection(hashTarget.id);
        hashTarget.scrollIntoView({ behavior: "auto", block: "start" });
      }
      refreshNavigation();
    } else {
      showGate();
    }
  }

  initialize();
})();
