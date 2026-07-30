# ASME OSU Officer Hub

A lightweight operations dashboard for the ASME student chapter at The Ohio
State University. It gives officers one place to see aggregate participation
metrics, upcoming events, operational reminders, and links to the chapter's
working tools.

The project is plain HTML, CSS, and JavaScript. It has no build step and is
designed to remain easy to maintain through annual officer transitions.

## What is included

- A polished desktop, tablet, and mobile dashboard
- A session-based access screen
- An academic-year selector and no-code Year Settings panel
- Aggregate attendance and event KPIs
- A year-to-date/monthly review selector with prior-month KPI comparisons
- Attendance, engagement-goal, and event-type visualizations
- Upcoming events from the chapter iCal feed and an operations queue
- A compact system-health view for settings, attendance, event metrics, and calendar connections
- A central resource launcher
- Light and dark color themes
- A documented path from Google Forms/Sheets to a safe aggregate JSON feed

The 2026–27 officer, attendance, member, communications, website, and source
code destinations are preconfigured. The live baseline reads the same
privacy-safe public leaderboard export used by the chapter website. It
calculates unique attendees, total check-ins, events with attendance, average
turnout, repeat attendance, recent-event turnout, and attendance by event type
without reading emails or raw form responses.

## Security boundary

The access screen is a convenience gate, not authentication. GitHub Pages is a
public static host: visitors who know how to inspect the site can download its
HTML, JavaScript, and JSON files.

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

The initial dashboard password is:

```text
ASMEOSU
```

It is case-sensitive. Successful access lasts for the current browser tab for
12 hours.

## Repository map

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard structure and accessible labels |
| `assets/css/styles.css` | Brand, layout, light/dark themes, and responsive rules |
| `assets/js/config.js` | Shared academic-year defaults, access digest, and resource links |
| `assets/js/app.js` | Password check, settings storage, Google Sheets loading, charts, and interface behavior |
| `data/demo-dashboard.json` | Safe sample aggregate dataset |
| `integrations/apps-script/Code.gs.example` | Optional Google Sheets aggregate-feed starter |
| `integrations/apps-script/SettingsWriter.gs.example` | Optional no-sign-in shared-settings writer |

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
after an officer follows a link from the hub.

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
- publish a new or updated year for every viewer when the settings writer is connected
- restore a preview to the organization-wide shared values

Organization-wide settings live in the `Hub_Settings_Public` tab of the
[ASME Hub Control Center](https://docs.google.com/spreadsheets/d/156HoZkWmqjUghT3dXHRhepi7QahsqDvDgcQVs705oRM/edit#gid=1830416343).
The hub loads that tab before displaying an academic year, so one edit applies
to every viewer. Use one row per academic year and preserve the existing column
headers.

The shared settings row also contains these rollover controls:

- `is_active`: show or hide the year for every viewer
- `is_current`: identify the year the hub should select by default
- `last_updated`: shared-settings freshness timestamp
- `status_note`: short officer-facing status message
- `event_metrics_tab`: privacy-safe event aggregate tab, normally `Event_Metrics_Public`

Before the settings writer is connected, changes made directly in the hub are
temporary previews stored in `sessionStorage`; they disappear when that browser
tab is closed. Once connected, **Publish for everyone** creates a new year row
or updates the matching existing year and records the change in
`Settings_Audit`.

### Enable no-sign-in shared saves

This option deliberately uses the same convenience barrier as the dashboard.
It is suitable only for non-sensitive links, labels, and aggregate-data
configuration. Anyone who inspects the deployed source can recover the write
token and submit a settings change.

1. Create a dedicated `ASME Hub Control Center` Google spreadsheet.
2. Copy `Hub_Settings_Public` into it.
3. Create a standalone Apps Script project in the ASME admin account.
4. Copy in `integrations/apps-script/SettingsWriter.gs.example` and set its
   `SPREADSHEET_ID` to the dedicated workbook.
5. Run `setupSettingsWriter()` once and approve the requested spreadsheet
   access.
6. Deploy it as a web app that executes as the owner and allows anyone with the
   link to run it.
7. Paste the deployment `/exec` URL into
   `sharedSettings.writeUrl` in `assets/js/config.js`.
8. Update `sharedSettings.spreadsheetUrl` and `editUrl` to the dedicated
   workbook, then verify preview and organization-wide publishing separately.

The writer updates the matching academic-year row, appends new academic years,
allows one row to be marked current, and keeps a timestamped audit record.

The **Events calendar page** is the human-facing web page. The **Google Calendar
iCal URL** is the public `basic.ics` subscription feed used by Google Calendar,
Apple Calendar, Outlook, and other compatible apps.

The full dashboard JSON still takes priority when both sources are present.
Without it, the hub combines `Leaderboard_Public`, `System_Status`,
`Event_Metrics_Public`, `Monthly_Metrics_Public`, and the public iCal feed.
This built-in path fills all five KPIs, monthly comparisons, event-level
turnout, event-type attendance, upcoming events, aggregate review reminders,
and connection health.

## Connect Google Sheets safely

The included live baseline uses:

```text
private Points Master → sanitized Website Export → Officer Hub aggregates
```

The Website Export contains:

- `Leaderboard_Public`: privacy-safe member totals used by the member-points page
- `System_Status`: point-system status
- `Hub_Settings_Public`: one organization-wide row per academic year
- `Event_Metrics_Public`: event names, dates, types, attendance totals, form state, and aggregate health counts
- `Monthly_Metrics_Public`: one privacy-safe aggregate row per month for participation, turnout, retention, and top-event summaries

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

The current no-code dashboard flow is:

```text
Google Form → private Points Master → Dashboard Staging + Monthly Dashboard Staging
→ privacy-safe Website Export → Officer Hub
```

1. Keep form responses, the Point Log, Roster, Review Queue, and Adjustments private.
2. Let `Dashboard Staging` calculate only event totals and aggregate health counts.
3. Let `Monthly Dashboard Staging` calculate July–June aggregate review rows.
4. Let `Event_Metrics_Public` and `Monthly_Metrics_Public` import only their approved staging ranges.
5. Keep `event_metrics_tab` set to `Event_Metrics_Public` in shared settings.
6. Verify both public tabs contain no names, emails, notes, or raw submissions.
7. Keep the public `basic.ics` URL current so the upcoming-events panel can refresh.

The Apps Script example remains available if a future officer needs a more
custom aggregate JSON feed.

Because a URL included in static JavaScript is public, a token stored in this
repository would not secure the endpoint. Only publish non-sensitive aggregate
output.

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
3. Choose **Publish for everyone** when the settings writer is connected.
   Otherwise open **Edit shared settings** and add the row manually.
4. Paste the new public Website Export Sheet, attendance form, Points Master,
   calendar page, iCal feed, and optional full aggregate JSON feed.
5. Mark only the new row `is_current`, leave desired historical rows
   `is_active`, and set `event_metrics_tab` to the new public aggregate tab.
6. Create the new private `Dashboard Staging` and
   `Monthly Dashboard Staging` tabs plus the public `Event_Metrics_Public` and
   `Monthly_Metrics_Public` tabs with the same column contracts.
7. Confirm the new private monthly tab starts in July of the correct academic
   year and ends in June of the next calendar year.
8. Reload the hub and verify the year and monthly selectors can load both the
   new year and every expected review period.
9. Confirm the year selector can still load
   any prior years that should remain available.

The academic years shown in the selector come from the shared settings rows.
Remove a row only when officers should no longer see that year.

## Change the dashboard password

Generate a SHA-256 digest locally:

```bash
printf %s 'NEW ACCESS PHRASE' | shasum -a 256
```

Copy the digest into `access.passwordSha256` in `assets/js/config.js`. When the
no-sign-in settings writer is enabled, copy the same digest into
`ACCESS_TOKEN` in `SettingsWriter.gs` and redeploy the web app. Do not write the
plain access phrase into the repository or commit message.

Again, this deters casual access only; it does not make GitHub Pages private.

## Publish with GitHub Pages

After the dashboard branch is reviewed and merged:

1. Open the repository's **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose `main` and `/ (root)`.
4. Save and wait for the Pages deployment to finish.
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
