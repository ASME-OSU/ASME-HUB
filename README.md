# ASME Officer Hub

A lightweight operations dashboard for the ASME student chapter at The Ohio
State University. It gives officers one place to see aggregate participation
metrics, upcoming events, operational reminders, and links to the chapter's
working tools.

The project is plain HTML, CSS, and JavaScript and is designed to remain easy
to maintain through annual officer transitions. The only deployment-time build
step creates the hourly calendar snapshot; front-end development requires no
bundler or framework.

## What is included

- A polished desktop, tablet, and mobile dashboard
- Official ASME OSU branding and a persistent collapsible desktop navigation rail
- A session-based access screen
- An academic-year selector and no-code Year Settings panel
- Aggregate attendance and event KPIs
- A year-to-date, Fall/Spring, and monthly review selector with prior-period KPI comparisons
- An automatic chapter-health summary for quick officer-meeting discussion
- Attendance, engagement-goal, and event-type visualizations
- A participation funnel and selected-period event performance table
- Green/yellow/red engagement-goal pace indicators
- A print-ready meeting snapshot that can be printed or saved as a PDF
- Upcoming events from the hourly synchronized chapter calendar and an operations queue
- A compact system-health view for settings, attendance, event metrics, and calendar connections
- A compact quick-action strip for check-in, event planning, officer tasks, and the Points Master
- A central resource launcher
- Role-aware browser-only links and personal priorities
- A focused on-screen meeting view for officer reviews
- Light and dark color themes
- Installable app support for desktop, Android, iPhone, and iPad
- A documented path from Google Forms/Sheets to a safe aggregate JSON feed

The 2026–27 officer, attendance, member, communications, website, and source
code destinations are preconfigured. The live baseline reads the same
privacy-safe public leaderboard export used by the chapter website. It
calculates unique attendees, total check-ins, events with attendance, average
turnout, repeat attendance, recent-event turnout, and attendance by event type
without reading emails or raw form responses.

The desktop sidebar can collapse to an icon rail; that preference is saved in
the browser. Tablet and mobile widths always use the full slide-out drawer so
navigation labels remain visible. Section links update the URL hash, preserve
one active highlight throughout smooth scrolling, and support browser
back/forward navigation.

Phone layouts use safe-area spacing, 16-pixel form controls to prevent iOS
Safari from zooming the page when a selector or settings field receives focus,
larger touch targets, and stacked event-performance cards instead of a wide
desktop table. The mobile drawer locks background scrolling, closes with
Escape, and includes theme control when the compact top bar hides that button.
The unlock screen is also safe-area aware and vertically scrollable when a
phone keyboard reduces the viewport. Its theme control is available before
sign-in, and the saved theme follows the officer into the dashboard.

## Security boundary

The access screen is a convenience gate, not authentication. GitHub Pages is a
public static host: visitors who know how to inspect the site can download its
HTML, JavaScript, and JSON files. A static site cannot keep an access phrase or
verification secret in browser code. Keep the phrase unique to this Hub and
never reuse it for Microsoft, Google, banking, or any other account.

Do not commit names, emails, attendance rows, passwords with access to other
systems, or any other personally identifiable information. A production data
feed should return aggregate counts only. If officers eventually need
member-level records inside this hub, move that view behind Microsoft or Google
authentication on a platform that performs authorization on a server.

## Local preview

From the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The officer access phrase is distributed outside this repository. It is
case-sensitive, and successful access lasts for the current browser tab for 12
hours. Changing the SHA-256 digest in `assets/js/config.js` changes the phrase,
but does not turn the static access screen into secure authentication.

## Repository map

For annual rollover and future maintainers, start with the
[officer transition documentation](docs/officer-transition/README.md). It maps
the officer flow, script responsibilities, hosting/ownership, shared saves and
private handoff records, with maintenance and recovery instructions.

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard structure and accessible labels |
| `assets/css/styles.css` | Brand, layout, light/dark themes, and responsive rules |
| `assets/js/config.js` | Shared academic-year defaults, access digest, and resource links |
| `assets/js/app.js` | Password check, settings storage, Google Sheets loading, charts, and interface behavior |
| `data/demo-dashboard.json` | Safe sample aggregate dataset |
| `integrations/apps-script/Code.gs.example` | Optional Google Sheets aggregate-feed starter |
| `integrations/apps-script/SettingsWriter.gs.example` | Disabled legacy writer; see protected-write contract |

## Current tool connections

The `resources` array in `assets/js/config.js` is the single source of truth for
the launcher. It currently includes:

- Executive Board SharePoint and shared document library
- Event Operations and Officer Task Tracker SharePoint lists
- The 2026–27 attendance check-in form and Points Master
- The public member points dashboard
- Newsletter Builder and Career Packet
- The public website, event calendar, and ASME OSU GitHub organization

SharePoint and the private Google workbook enforce their own account access
after an officer follows a link from the Hub. The Officer Password Document,
in particular, still requires an authorized Microsoft account; the Hub never
reads or stores its contents.

### Browser-only personalization

Officers can choose **Manage my links** in the resource launcher to add a new
tool, assign it to one or more officer roles, pin it in that role's shortcuts,
reorder it, or export/import a JSON handoff file. These links use `localStorage`
and never enter the public configuration or shared settings sheet. Clearing the
site's browser data removes them unless they were exported first.

The **My priorities** command-center card follows the same browser-only model.
It is intended for short reminders and optional links back to an officer tool,
not as a copy of the private SharePoint task tracker. Do not enter names,
credentials, financial details, member records, or confidential tracker text.

Private SharePoint resources are launcher links only. The static Hub does not
request, cache, index, or display SharePoint list records. Showing task or event
tracker data inside the dashboard in the future would require Microsoft 365
authentication and authorization enforced by a protected backend; it should
not be implemented with a client-side token or a public GitHub Pages script.

## Year Settings

Use the gear button beside the academic-year selector, or choose **Year
settings** in the sidebar. The panel can:

- edit the current academic-year label and engagement goal
- paste a public leaderboard Google Sheet and tab name
- paste an optional full aggregate dashboard JSON URL
- update that year's attendance form, Points Master, and calendar links
- keep the calendar page and Google Calendar iCal subscription URL separate
- add the next academic year without editing code
- preview changes for the current browser tab
- compare intended values with a fresh public Google settings read
- restore a preview to the organization-wide shared values

Organization-wide settings live in the `Hub_Settings_Public` tab of the
[ASME Hub Control Center](https://docs.google.com/spreadsheets/d/156HoZkWmqjUghT3dXHRhepi7QahsqDvDgcQVs705oRM/edit#gid=1830416343).
The Hub reads that tab on load; open viewers and cached consumers may need a refresh. Use one row per academic year and preserve the existing column
headers.

The shared settings row also contains these rollover controls:

- `is_active`: show or hide the year for every viewer
- `is_current`: identify the year the hub should select by default
- `last_updated`: shared-settings freshness timestamp
- `status_note`: short officer-facing status message
- `event_metrics_tab`: privacy-safe event aggregate tab, normally `Event_Metrics_Public`
- `budget_tracker_url`, `budget_export_sheet_url`, and
  `budget_export_sheet_tab`: the annual private tracker link and its separate,
  aggregate-only dashboard feed
- `banking_url` and `fundraising_url`: yearly Finance resource destinations

Changes made in the Hub are temporary tab previews. Shared edits use **Edit shared settings**, which opens Google Sheets and requires Google edit permission. All current officers may edit through their authorized Google account. Preserve the previous row/version, re-read it before changing cells, coordinate concurrent edits, and wait for Google's saved status. Keep a new draft noncurrent and preserve historical years.

Use **Compare with Google** with the form set to your intended values. It compares a fresh public response, including inactive rows, without replacing the form or using tab previews/deployed defaults as evidence. Missing rows, duplicate keys, invalid current-year flags, schema errors, unavailable reads, and differences never claim success. Matching readback is not proof of editor identity or downstream refresh. Check a fresh Hub tab without previews and each independent consumer. Restore only affected cells from version history after reconciling other edits, then repeat readback.

The Control Center is currently public in full. Only intentionally public values belong in it; hidden tabs do not protect private notes, edit references, or audits. Public link visibility does not grant access to a private destination. Confirm the publication boundary before adding fields or resources.

The public-token writer has been removed from the client and its example disabled. This does not revoke any existing deployment. An authorized owner must inspect and retire any insecure live writer separately. The separate authenticated annual save service is connected for the inactive 2027–2028 draft; it does not edit current-year rows or activate years. See [the officer save flow](docs/officer-transition/system-flow.md), [annual save contract](integrations/apps-script/ANNUAL_SETTINGS_DRAFT.md), and [authorization, conflicts, readback, and recovery contract](integrations/apps-script/SETTINGS_WRITE_CONTRACT.md).

The **Events calendar page** is the human-facing web page. The **Google Calendar
iCal URL** is the public `basic.ics` subscription feed used by Google Calendar,
Apple Calendar, Outlook, and other compatible apps.

The full dashboard JSON still takes priority when both sources are present.
When an attendance Sheet is configured, the Hub first reads its
`System_Status` and requests member-derived data or dashboard JSON only when
`system_status` is exactly `LIVE`. A missing, failed, TESTING, or PAUSED status
leaves attendance data unavailable. A JSON-only dashboard must explicitly
include `meta.systemStatus: "LIVE"`; existing JSON-only feeds without this field
will remain unavailable until their generator supplies it. This display check
does not make a published JSON file private or prove its freshness. Generators
must separately suppress non-live output and refresh or remove old snapshots.
Without it, the hub combines `Leaderboard_Public`, `System_Status`,
`Event_Metrics_Public`, `Monthly_Metrics_Public`,
`Semester_Metrics_Public`, and the hourly generated calendar snapshot. This
built-in path fills all five KPIs, monthly and semester comparisons,
event-level turnout, participation depth, event-type attendance, upcoming
events, aggregate review reminders, and connection health.

## Check the actual attendance Form destination

For V02, use the [private authorized destination validator](integrations/apps-script/FORM_DESTINATION_VALIDATION.md) or inspect the actual destination in Google Forms. The standalone Apps Script reads Google’s actual linked workbook with read-only scopes and reports match, mismatch, unlinked, inaccessible, or invalid. Its setup and live execution remain pending; local tests cannot confirm annual linkage. Keep IDs and result evidence private. The Hub does not run this checker or automatically mark V02 passed. Confirm the response tab separately; submission and processing rehearsal remain separate checks.

## Officer meeting view

Choose **Meeting view** in the officer command center for a focused on-screen
layout that removes navigation, launchers, and detailed drill-down panels. Its
print action produces a short briefing with the role summary, headline metrics,
and command center.

Choose **Year to date**, **Fall**, **Spring**, or a month from **Review
period**. The selection updates the KPI cards, attendance chart, event-type
mix, participation funnel, event table, and chapter-pulse sentence together.

The funnel definitions are stable across every period:

- **Participated:** attended at least one event
- **Returned:** attended at least two events
- **Highly engaged:** attended at least four events

The event table ranks configured events by check-ins and labels the top,
above-average, below-average, and zero-check-in rows. Choose **Print / save
PDF** for a condensed meeting snapshot; the navigation, settings, resources,
and operational setup panels are omitted from the printed view.

The annual goal status compares actual unique-attendee progress with the
percentage of the July–June academic year that has elapsed:

- **On pace:** actual progress meets or exceeds elapsed-year pace
- **Watch:** actual progress is up to 10 percentage points behind pace
- **Behind pace:** actual progress is more than 10 percentage points behind

## Connect Google Sheets safely

The included live baseline uses:

```text
private Points Master → sanitized Website Export → Officer Hub aggregates
```

The Website Export contains:

- `Leaderboard_Public`: privacy-safe member totals used by the member-points page; the Hub query excludes the name column
- `System_Status`: point-system status
- `Hub_Settings_Public`: one organization-wide row per academic year
- `Event_Metrics_Public`: event names, dates, types, attendance totals, form state, and aggregate health counts
- `Monthly_Metrics_Public`: one privacy-safe aggregate row per month for participation, turnout, retention, and top-event summaries
- `Semester_Metrics_Public`: Fall and Spring privacy-safe aggregate rows using the same reporting fields

`Event_Metrics_Public` imports from the private Points Master
`Dashboard Staging` tab. That staging tab performs the aggregation; the public
tab must never contain name.# values, emails, notes, or raw submissions.

`Monthly_Metrics_Public` imports from the private
`Monthly Dashboard Staging` tab. The staging tab generates July through June
from the academic year in `Config!B3` and excludes synthetic `test.*` members.
Its monthly contract is:

| Column | Meaning |
| --- | --- |
| `month_key`, `month_label`, `month_start` | Stable month identifiers used by the dashboard filter |
| `unique_attendees`, `total_checkins`, `events_held` | Monthly participation volume |
| `average_turnout` | Check-ins divided by events with attendance |
| `repeat_attendees`, `repeat_rate` | Members who attended at least two events during that month |
| `new_attendees` | Members whose first valid attendance falls in that month |
| `top_event_type` | Event category with the most monthly check-ins |
| `top_event_name`, `top_event_attendance` | Highest-attended event in the month |
| `last_updated` | Aggregate freshness timestamp |
| `highly_engaged_attendees` | Members with four or more valid events in the month |

`Semester_Metrics_Public` imports from the private
`Semester Dashboard Staging` tab. It uses the same 15-column contract as the
monthly feed, with `period_key` values of `fall` and `spring`. Fall covers July
through December; Spring covers January through June. The
`highly_engaged_attendees` field always means four or more valid events inside
the selected month or semester.

The current no-code dashboard flow is:

```text
Google Form → private Points Master → Dashboard Staging
+ Monthly Dashboard Staging + Semester Dashboard Staging
→ privacy-safe Website Export → Officer Hub
```

1. Keep form responses, the Point Log, Roster, Review Queue, and Adjustments private.
2. Let `Dashboard Staging` calculate only event totals and aggregate health counts.
3. Let `Monthly Dashboard Staging` calculate July–June aggregate review rows.
4. Let `Semester Dashboard Staging` calculate the Fall and Spring aggregate rows.
5. Let `Event_Metrics_Public`, `Monthly_Metrics_Public`, and
   `Semester_Metrics_Public` import only their approved staging ranges.
6. Keep `event_metrics_tab` set to `Event_Metrics_Public` in shared settings.
7. Verify all public tabs contain no names, emails, notes, or raw submissions.
8. Keep the public `basic.ics` URL current so the upcoming-events panel can refresh.

The Apps Script example remains available if a future officer needs a more
custom aggregate JSON feed.

Because a URL included in static JavaScript is public, a token stored in this
repository would not secure the endpoint. Only publish non-sensitive aggregate
output.

### Budget health feed

The finance cards use a separate, aggregate-only Google Sheet. The budget
tracker stays private; the Hub never reads its transaction tabs directly.

```text
private annual budget tracker → Budget_Public export → Officer Hub cards
```

Each academic-year configuration contains five finance settings:

- `budgetTrackerUrl`: the private native Google Sheet officers open to manage the budget
- `budgetExportSheetUrl`: the separate read-only spreadsheet exposed to the Hub
- `budgetExportSheetTab`: the aggregate tab name, normally `Budget_Public`
- `bankingUrl`: the official bank sign-in page opened from Finance resources
- `fundraisingUrl`: the fundraising platform sign-in page opened from Finance resources

`Budget_Public` contains only approved aggregate budget information: academic
year, approved income and expenses, pending approval total, planned authority
when it is confirmed, remaining authority, budget-used rate, source timestamp,
export timestamp, unresolved-status aggregate, and planned/actual totals by
approved expense category. The category rows use `category_actual_<slug>` and
`category_planned_<slug>` keys so the Hub can build its spending-mix chart and
category-pacing bars. Use a percentage value for `budget_used_rate` (for
example, `1.25` means 125%) and label it with `display_format` `percent`.

Never publish OSU cash balance, Huntington cash balance, combined cash balance,
account numbers, transaction rows, payees, receipt links, reimbursement notes,
or other identifying financial details. The public export must not substitute a
cash balance for budget authority. `source_updated_at` means the time the
underlying ledger was last refreshed; `updated_at` is only the export refresh
time. The current public export has `updated_at` but no `source_updated_at`;
the Hub shows the feed as connected and notes that the ledger update time is
not published. To verify ledger freshness, the export owner must add a
`source_updated_at` metric row sourced from a real private tracker refresh
timestamp. Do not copy `updated_at` or `NOW()` into that row as a substitute.
If funding allocations are not confirmed, export a clear aggregate status
such as `funding_model_status = Needs confirmation`, not a fabricated zero.

At annual handoff:

1. Make the new annual budget tracker a native Google Sheet and keep it private.
2. Copy the prior `ASME Officer Hub Budget Export` spreadsheet.
3. Update its `IMPORTRANGE` source ID and source-cell references. Map only
   approved aggregate authority/actual fields; do not map account balances.
4. Click **Allow access** once from the export spreadsheet.
5. Verify the export contains aggregate values only, that category actuals
   reconcile to approved expenses (or explicitly disclose an uncategorized
   aggregate), then give the export file
   **Anyone with the link · Viewer** access.
6. Open **Year settings → Finance connections** in the Hub, paste the new
   tracker and export links, confirm the export tab, and publish for everyone.
   Bank and fundraising portal links can also be replaced there if they change.
7. Test the Hub in light and dark mode at desktop and mobile widths.

#### Funding authority confirmation workflow

The budget workbook uses a two-account planning model without exposing either
account's balance to the Hub. Follow this sequence whenever the annual funding
plan is set up or changed:

1. In the private tracker, enter only approved manual inputs in the yellow
   cells. `Funding Setup!B5:D6` holds each account's annual allocation,
   reserve and unpaid commitments (OSU row 5; Huntington row 6).
   `Funding Setup!B8` holds OSU restrictions or `None`. `Category Budgets!B5:C18`
   holds the category allocation for each account. Other cells calculate from
   those inputs and should not be overwritten.
2. Reconcile the category allocations to the approved account authority and
   review the calculated totals in the private tracker. Do not use cash
   balances, transactions, or other private ledger details as a substitute for
   authority.
3. Replace every `Enter dollar amount` prompt with a confirmed amount (zero
   for confirmed unused categories). `Category Budgets!B23:C23` must both
   equal zero. After reviewing the plan, check `Funding Setup!B10`.
   `Funding Setup!B12` returns `Confirmed` only when inputs, reconciliation,
   and review pass. Uncheck B10 before revising a plan. Old `Setup & Lists`
   funding cells and the hidden `Budgets` tab are compatibility outputs,
   not manual inputs.
4. In the separate `Budget_Public` export, publish the aggregate
   `funding_model_status` row alongside the existing totals. Its current source
   is the private tracker status cell through `IMPORTRANGE`; grant the import
   once from the export sheet, not from the Hub. The export automatically
   selects confirmed category totals when B12 is `Confirmed`; otherwise it
   retains the explicitly labeled legacy plan. No formula edits are needed
   for the treasurer to finish setup.
5. Verify the export and then the live Hub. Only the exact text `Confirmed`
   permits the Hub to label a plan as account authority and display the
   authority-used percentage. Every other value—including an empty value,
   `Ready for allocation entry`, `Needs confirmation`, or a legacy label—keeps
   the plan visibly marked as legacy and suppresses that percentage.

This guard is intentional: approved transaction totals may still appear in the
Hub while funding authority is awaiting confirmation, but officers must not
mistake a historical planning amount for approved authority.

The public export is intentionally separate from the attendance Website Export
so its access can be audited or revoked without affecting the points system.

## Data contract

Every configured data URL must return this shape:

```json
{
  "meta": {
    "academicYear": "2026–2027",
    "lastUpdated": "2026-07-27T09:30:00-04:00",
    "isDemo": false
  },
  "kpis": {
    "uniqueAttendees": 186,
    "totalCheckIns": 428,
    "eventsHeld": 17,
    "averageTurnout": 25.2,
    "repeatAttendanceRate": 41,
    "repeatAttendees": 76,
    "highlyEngagedAttendees": 29,
    "engagementGoal": 250
  },
  "attendanceTrend": [
    {
      "label": "Welcome Meeting",
      "shortLabel": "Welcome",
      "date": "2026-08-27",
      "attendance": 54,
      "type": "General Body"
    }
  ],
  "eventTypes": [
    {
      "name": "Industry",
      "count": 168,
      "events": 5,
      "color": "#ba0c2f"
    }
  ],
  "upcomingEvents": [
    {
      "title": "Fall Welcome Meeting",
      "date": "2026-08-27",
      "time": "6:30 PM",
      "location": "Hitchcock Hall 131",
      "type": "General Body",
      "status": "Confirmed"
    }
  ],
  "operations": [
    {
      "severity": "warning",
      "title": "One event needs a location",
      "detail": "The member social is still marked TBD.",
      "actionLabel": "Review events",
      "actionUrl": "https://example.com"
    }
  ]
}
```

Optional arrays may be empty. KPI values should be numbers, and
`repeatAttendanceRate` should be a percentage from 0 to 100.

## Start a new academic year

The annual rollover does not require changing the dashboard code.

1. Open **Year Settings** and choose **Add next year**.
2. Use the preview to confirm the generated key, label, and links.
3. Open **Edit shared settings** and add the row under Google authorization.
   Use **Compare with Google** to check the intended values after Google saves.
4. Paste the new public Website Export Sheet, attendance form, Points Master,
   calendar page, iCal feed, and optional full aggregate JSON feed.
5. Keep the draft `is_current` FALSE until annual activation checks pass. Preserve
   the current year and historical rows; set `event_metrics_tab` to the new public aggregate tab.
6. Create the new private `Dashboard Staging`,
   `Monthly Dashboard Staging`, and `Semester Dashboard Staging` tabs plus the
   public `Event_Metrics_Public`, `Monthly_Metrics_Public`, and
   `Semester_Metrics_Public` tabs with the same column contracts.
7. Confirm the new private monthly tab starts in July of the correct academic
   year and ends in June of the next calendar year.
8. When the draft is ready for public visibility, set `is_active` TRUE while
   keeping it noncurrent. Reload the Hub and check that year, Fall/Spring
   presets, and every expected month. Activation remains a separate decision.
9. Run **Sync calendar and deploy Pages**, or wait for the next hourly run, and
   confirm the new calendar reports **LIVE**.
10. Confirm the year selector can still load
   any prior years that should remain available.

The academic years shown in the selector come from the shared settings rows.
Set `is_active` FALSE to hide a year while preserving its historical row.

## Change the dashboard password

Generate a SHA-256 digest locally:

```bash
printf %s 'NEW ACCESS PHRASE' | shasum -a 256
```

Copy the digest into `access.passwordSha256` in `assets/js/config.js`. This phrase
is not Google write authorization. Do not write the plain access phrase into the
repository or commit message.

Again, this deters casual access only; it does not make GitHub Pages private.

## Install as an app

The published Officer Hub is a progressive web app (PWA). It can open in its
own app window and appear on an officer's home screen or app launcher.

- **Chrome, Edge, and Android:** open the published hub and choose **Install
  officer app** when the button appears. The browser's Install option also
  works.
- **iPhone and iPad:** open the hub in Safari, tap **Share**, and choose **Add
  to Home Screen**.

The service worker caches only the public app shell: HTML, CSS, JavaScript,
self-hosted fonts, logos, and install icons. Live attendance, settings, the
generated calendar snapshot, Google, and SharePoint requests are intentionally
not cached, so current dashboard data still requires a network connection.

The calendar is synchronized server-side by
`.github/workflows/pages.yml`. Once per hour, GitHub Actions reads the current
public year settings, downloads each active Google Calendar iCal feed, and
generates `data/calendar.json` inside the Pages artifact. The browser reads
that same-origin snapshot instead of relying on public CORS proxies. A failed
sync does not replace the previous successful Pages deployment.

When changing a cached app-shell file, update both the version query in
`index.html` and `SHELL_ASSETS` in `sw.js`, then increment `SHELL_CACHE`. This
ensures installed copies receive the new release instead of retaining an old
asset.

## Publish with GitHub Pages

After the dashboard branch is reviewed and merged:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Merge changes into `main`, or manually run **Sync calendar and deploy
   Pages** from the Actions tab.
4. Wait for the Pages deployment to finish. The scheduled workflow refreshes
   the calendar at minute 17 of every hour.
5. Test the published URL in a private browser window and on a phone.

## Officer handoff checklist

- Confirm the current academic year in Year Settings.
- Confirm that `Event_Metrics_Public` has no member-level data.
- Update the public export, form, Points Master, and calendar links.
- Rotate the convenience password if needed.
- Verify the refreshed timestamp and all five KPI values.
- Clear or document every warning in the operations queue.
- Confirm all four system-health cards are live or intentionally noted.
- Check one desktop width, one tablet width, and one mobile width.
- Keep this README with the repository when ownership changes.

## Shared chapter resource maintenance

**Tools and resources → Maintain shared chapter links** provides authorized direct Google editing and a fresh read-only resource refresh once a reviewed projection is configured. The default is **not connected**; the current shared launcher still uses bundled config plus annual Google settings. No resource tab or live migration has been verified. **Manage my links** remains visibly personal browser storage.

See [shared resource contract and migration map](integrations/apps-script/SHARED_RESOURCES_CONTRACT.md) for all 17 stable IDs, exact proposed A:H schema, public/private review gates, connection and recovery steps. Six annual actions keep their URL authority in Year Settings. Disable shared entries with explicit FALSE tombstones; deleting rows restores defaults. Failed reads show stale successful data or unconfirmed bundled defaults. A refresh checks the public response only; direct officer edit access and clean-browser live propagation require separate rehearsal. Roles influence presentation and never grant access.
