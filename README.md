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
- Attendance, engagement-goal, and event-type visualizations
- Upcoming events and an operations queue
- A central resource launcher
- Light and dark color themes
- A documented path from Google Forms/Sheets to a safe aggregate JSON feed

The 2026–27 officer, attendance, member, communications, website, and source
code destinations are preconfigured. The live baseline reads the same
privacy-safe public leaderboard export used by the chapter website. It
calculates unique attendees, total check-ins, repeat attendance, and attendance
by event type without reading emails or raw form responses.

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
ASME OSU
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
- add the next academic year without editing code
- restore a shared year to the defaults in `assets/js/config.js`

Settings saved through the interface stay in that browser's `localStorage`.
They are not shared with every officer and must not be treated as secrets. To
make a new value the organization-wide default, copy the verified values into
the matching `dataSources` entry in `assets/js/config.js`.

The full dashboard JSON takes priority when both sources are present. Without
it, the public leaderboard source leaves event count, average turnout, the
event-by-event trend, and upcoming events blank because those values cannot be
derived accurately from member totals alone.

## Connect Google Sheets safely

The included live baseline uses:

```text
private Points Master → sanitized Website Export → Officer Hub aggregates
```

The Website Export must contain `Leaderboard_Public` and `System_Status`. The
leaderboard columns are the same privacy-safe columns consumed by the public
member-points page.

For the complete event-level dashboard, the recommended flow is:

```text
Google Form → private response sheet → aggregate Apps Script endpoint → dashboard
```

1. Keep the response sheet private.
2. Make a separate `Dashboard Export` tab containing aggregate values only.
3. Copy `integrations/apps-script/Code.gs.example` into a bound Apps Script
   project.
4. Update the tab name or aggregation logic in the script.
5. Deploy it as a web app whose output can be read by the dashboard.
6. Paste the `/exec` URL into **Year Settings → Full dashboard JSON URL**.
7. Open the endpoint directly and confirm it contains no names, emails, or raw
   attendance submissions.

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
2. Paste the new privacy-safe public leaderboard Sheet.
3. Paste the new attendance form and Points Master links.
4. Add the calendar and optional full aggregate JSON feed.
5. Save and verify the year selector can still load the prior year.
6. To publish the setup as a default for every officer, add the verified entry
   to `dataSources` in `assets/js/config.js`:

   ```js
   "2027-2028": {
     label: "2027–2028",
     dashboardUrl: "",
     attendanceSheetUrl: "https://docs.google.com/spreadsheets/d/...",
     attendanceSheetTab: "Leaderboard_Public",
     attendanceFormUrl: "https://docs.google.com/forms/d/.../viewform",
     pointsMasterUrl: "https://docs.google.com/spreadsheets/d/.../edit",
     calendarUrl: "https://org.osu.edu/asme/calendar/",
     engagementGoal: 250,
   },
   ```

7. Change `currentAcademicYear` when the new year should become the shared
   default.

Keep prior `dataSources` entries when historical comparisons should remain
available. Remove an entry only when officers should no longer see that year.

## Change the dashboard password

Generate a SHA-256 digest locally:

```bash
printf %s 'NEW ACCESS PHRASE' | shasum -a 256
```

Copy only the digest into `access.passwordSha256` in
`assets/js/config.js`. Do not write the new phrase into the repository or commit
message.

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
- Confirm that the aggregate endpoint has no member-level data.
- Update the public export, form, Points Master, and calendar links.
- Rotate the convenience password if needed.
- Verify the refreshed timestamp and all five KPI values.
- Check one desktop width, one tablet width, and one mobile width.
- Keep this README with the repository when ownership changes.
