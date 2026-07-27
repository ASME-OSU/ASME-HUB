(function () {
  "use strict";

  const config = window.ASME_HUB_CONFIG;
  const unlockStorageKey = "asmeHubUnlockedUntil";
  const themeStorageKey = "asmeHubTheme";
  const numberFormatter = new Intl.NumberFormat("en-US");

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

  function showGate() {
    sessionStorage.removeItem(unlockStorageKey);
    elements.appShell.hidden = true;
    elements.gate.hidden = false;
    document.body.classList.remove("nav-open");
    window.setTimeout(() => elements.password.focus(), 50);
  }

  async function unlockDashboard() {
    const expiresAt =
      Date.now() + Number(config.access.sessionHours || 12) * 60 * 60 * 1000;
    sessionStorage.setItem(unlockStorageKey, String(expiresAt));
    elements.gate.hidden = true;
    elements.appShell.hidden = false;
    await loadDashboard(elements.academicYear.value);
  }

  function populateYears() {
    const years = Object.entries(config.dataSources);

    elements.academicYear.replaceChildren(
      ...years.map(([value, source]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = source.label || value;
        option.selected = value === config.currentAcademicYear;
        return option;
      }),
    );

    if (!elements.academicYear.value && years.length) {
      elements.academicYear.value = years[0][0];
    }

    updateYearLabel();
  }

  function updateYearLabel() {
    const source = config.dataSources[elements.academicYear.value];
    elements.sidebarYear.textContent =
      (source && source.label) || elements.academicYear.value;
  }

  function showLoading(isLoading) {
    elements.loadingLayer.hidden = !isLoading;
  }

  async function loadDashboard(year) {
    const source = config.dataSources[year];
    if (!source) {
      showDataError("No data source is configured for this academic year.");
      return;
    }

    showLoading(true);

    try {
      const response = await fetch(source.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Data request failed with status ${response.status}.`);
      }
      const data = await response.json();
      renderDashboard(data);
      updateYearLabel();
    } catch (error) {
      console.error(error);
      showDataError(
        "The dashboard data could not be loaded. Check the year URL in assets/js/config.js.",
      );
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
    renderKpis(data.kpis || {});
    renderAttendanceChart(data.attendanceTrend || []);
    renderGoal(data.kpis || {});
    renderEventTypes(data.eventTypes || []);
    renderUpcomingEvents(data.upcomingEvents || []);
    renderOperations(data.operations || []);
    renderResources(config.resources || []);
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

  function renderKpis(kpis) {
    setText("kpi-unique-attendees", formatNumber(kpis.uniqueAttendees));
    setText("kpi-total-checkins", formatNumber(kpis.totalCheckIns));
    setText("kpi-events-held", formatNumber(kpis.eventsHeld));
    setText(
      "kpi-average-turnout",
      Number.isFinite(Number(kpis.averageTurnout))
        ? Number(kpis.averageTurnout).toFixed(1)
        : "—",
    );
    setText(
      "kpi-repeat-rate",
      Number.isFinite(Number(kpis.repeatAttendanceRate))
        ? `${Math.round(Number(kpis.repeatAttendanceRate))}%`
        : "—",
    );
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
        small.textContent = `· ${formatNumber(item.events)} events`;
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
          if (!item.actionUrl.startsWith("#")) {
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

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        elements.mobileMenuButton.setAttribute("aria-expanded", "false");
      });
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!visible) return;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === `#${visible.target.id}`,
            );
          });
        },
        { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
      );
      sections.forEach((section) => observer.observe(section));
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? numberFormatter.format(numericValue)
      : "—";
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
})();
