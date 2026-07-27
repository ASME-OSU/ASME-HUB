window.ASME_HUB_CONFIG = {
  appName: "ASME OSU Hub",
  currentAcademicYear: "2026-2027",
  access: {
    // SHA-256 digest of the current access phrase. See README.md to rotate it.
    passwordSha256:
      "90fe069c9b7c414f4bd9c545989cd7759c80b1bdfccbb7507ab85e0ed818f417",
    sessionHours: 12,
  },
  dataSources: {
    "2026-2027": {
      label: "2026–2027",
      type: "json",
      url: "data/demo-dashboard.json",
    },
  },
  resources: [
    {
      title: "ASME OSU website",
      description: "Public chapter information, events, leadership, and member resources.",
      label: "Open website",
      url: "https://org.osu.edu/asme/",
      category: "Public",
    },
    {
      title: "Events calendar",
      description: "Review upcoming chapter events and approved programming.",
      label: "Open calendar",
      url: "https://org.osu.edu/asme/calendar/",
      category: "Events",
    },
    {
      title: "Officer SharePoint",
      description: "Files, templates, handoffs, and internal chapter documentation.",
      label: "Add SharePoint link",
      url: "",
      category: "Operations",
    },
    {
      title: "Attendance form",
      description: "Member event check-in form for the current academic year.",
      label: "Add form link",
      url: "",
      category: "Attendance",
    },
    {
      title: "Point system",
      description: "Manage events, member points, and the current semester leaderboard.",
      label: "Add sheet link",
      url: "",
      category: "Members",
    },
    {
      title: "ASME OSU GitHub",
      description: "Website, dashboard, and chapter-tool source repositories.",
      label: "Open GitHub",
      url: "https://github.com/ASME-OSU",
      category: "Technology",
    },
  ],
};
