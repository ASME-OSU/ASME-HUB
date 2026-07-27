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
- An academic-year selector driven by one configuration file
- Aggregate attendance and event KPIs
- Attendance, engagement-goal, and event-type visualizations
- Upcoming events and an operations queue
- A central resource launcher
- Light and dark color themes
- A documented path from Google Forms/Sheets to a safe aggregate JSON feed

The repository currently uses sample aggregate data so the interface can be
reviewed without exposing member information.

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
| `assets/js/config.js` | Academic years, access digest, data URLs, and resource links |
| `assets/js/app.js` | Password check, data loading, charts, and interface behavior |
| `data/demo-dashboard.json` | Safe sample aggregate dataset |
| `integrations/apps-script/Code.gs.example` | Optional Google Sheets aggregate-feed starter |

## Connect the real tools

Edit the `resources` array in `assets/js/config.js`. Replace each empty `url`
with the official SharePoint, form, sheet, or other officer link:

```js
{
  title: "Officer SharePoint",
  description: "Files, templates, handoffs, and internal chapter documentation.",
  label: "Open SharePoint",
  url: "https://your-sharepoint-url",
  category: "Operations",
}
```

An empty URL intentionally appears as **Setup needed** instead of opening a
broken link.

## Connect Google Sheets safely

Recommended flow:

```text
Google Form → private response sheet → aggregate Apps Script endpoint → dashboard
```

1. Keep the response sheet private.
2. Make a separate `Dashboard Export` tab containing aggregate values only.
3. Copy `integrations/apps-script/Code.gs.example` into a bound Apps Script
   project.
4. Update the tab name or aggregation logic in the script.
5. Deploy it as a web app whose output can be read by the dashboard.
6. Replace the relevant `url` in `assets/js/config.js` with the `/exec` URL.
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

1. Create a new aggregate endpoint or JSON file for the new academic year.
2. Add one entry to `dataSources` in `assets/js/config.js`:

   ```js
   "2027-2028": {
     label: "2027–2028",
     type: "json",
     url: "https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT/exec",
   },
   ```

3. Change `currentAcademicYear` to `"2027-2028"`.
4. Update the attendance-form and point-system links in `resources`.
5. Verify the year selector can still load the prior year.
6. Check that the refreshed timestamp and figures match the source.

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

- Confirm the current academic year in `assets/js/config.js`.
- Confirm that the aggregate endpoint has no member-level data.
- Update SharePoint, form, sheet, and calendar links.
- Rotate the convenience password if needed.
- Verify the refreshed timestamp and all five KPI values.
- Check one desktop width, one tablet width, and one mobile width.
- Keep this README with the repository when ownership changes.
