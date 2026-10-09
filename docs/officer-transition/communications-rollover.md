# Calendar, newsletter and public-page rollover

Use this with **T04 — Check calendars and prepare communications**; reviewed annual links/settings belong to T02 and activation/cleanup to T05. Ask the transition coordinator to record the
actual people responsible for communications, the calendar and website in the
private handoff checklist. A role listed here does not appoint a new officer. Contact the outgoing President or transition coordinator through [asme@osu.edu](mailto:asme@osu.edu) to obtain the private checklist and owner contacts.

## Officer route: start here

1. **T04 — shared tool links:** open the Hub and click the Newsletter Builder,
   career guide and chapter website cards. If a destination needs changing,
   choose Resources → Maintain shared chapter links → Edit shared resources in Google. The named authorized editor updates the reviewed stable row, waits for Google save, then chooses Refresh shared resources and checks the destination/read timestamp. Give missing-source or feed failures to the Webmaster using [the source instructions below](#webmaster-t04-shared-tool-links).
   Year-specific links are handled in T02; personal links change only your browser.
2. **T04 — calendar:** ask the calendar owner to confirm reuse of the existing
   calendar. Reuse keeps members' subscriptions. Have the event owner confirm
   each date, Eastern time, room and description before adding it through the normal Google Calendar event editor. For an approved isolated rehearsal select the training calendar explicitly, keep guests empty and check the Calendar field again before Save. Ask the
   Points officer to set attendance rules separately; an academic date on the
   calendar earns no automatic attendance credit.
3. **T04 — newsletter:** open [Newsletter Builder](https://asme-osu.github.io/ASME-Newsletter-Builder/)
   and follow [the editable handoff checklist](#t04-transfer-the-editable-newsletter-correctly).
   Export and verify an untouched backup before editing. A new tab shares this
   browser's saved draft, templates and defaults; use a separate browser profile
   for the incoming officer's transfer and New Issue check.
4. **T04 — public pages:** collect the approved board, event and sponsor facts
   in the private handoff. Give them to the Webmaster for a private page preview,
   then follow the approved publication decision. Record missing facts as PENDING.
   Keep the currently accurate public content until its replacement is approved.
5. **Before launch:** each tool's owner records what they checked, the actual
   result, time, evidence and recovery copy. The coordinator reviews these checks
   using [Finance, settings and launch](finance-settings-launch.md). Saving a
   draft, a readiness percentage or a Hub checkmark does not approve a send or launch.

## Current V3 results and owner inputs

The October 7 V3 rehearsal verified normal creation/deletion of Fall and Spring events on a private training calendar; the editor initially selected the production ASME Public calendar, so **verify the Calendar field before every Save and leave guests empty during rehearsal**. No production mock event was created. This proves event editing/cleanup, while propagation across all three consumers and target-year filtering require separate acceptance on the final implementation.

The exact Spring JSON was imported into a fresh builder with matching content and editability, and its matching HTML rendered locally; the original newsletter draft was restored. Generic filenames previously referred to the original issue, so loading the intended template and verifying subject/year/event before export is required. These local results do not establish delivery in remote email clients or image coverage when disconnected. WordPress Visual editor draft save/reload/preview succeeded for an unpublished rehearsal page. Keep that route separate from actual publication approval.

The official physical mailing address remains **PENDING owner confirmation**. Keep the builder’s missing-address warning, obtain the approved address from the responsible officer, enter it under Design, save approved defaults and inspect the exported HTML footer. The chapter email is not a postal address. Public membership/event/partner figures remain **PENDING approved facts**: source review found Join 466+/25+ and Sponsor 466+/25+/20+, while the dated V3 CMS observation showed Sponsor 126+/6+/5+. Reconcile the actual published surfaces, periods and definitions, or label their distinct approved bases beside each claim. Do not infer an approved replacement from these observations.

For T04, the coordinator must supply an approved facts record with each statistic's value, period, definition, source, as-of date and approver. Record the full postal address, approved sender and reply-to with approver and date in the private run checklist. The sending-service settings click path and account owner are **UNVERIFIED** in the available local evidence; the communications owner must open the actual chapter sending account, record the exact route and verify sender/reply-to there before the Hub publishes that instruction. Until then, mark T04-D Blocked. Builder preview and local fixtures do not verify sending-service identity, delivery or live calendar propagation. No address, current statistic or route is inferred from an older page or template.

## Dated evidence and current responsibilities

The source map below was reviewed October 3, 2026. Production was 2026–2027;
2027–2028 examples are private preparation with fictional or pending facts.
Before a real handoff, confirm the current year and source versions again.
The earlier isolated newsletter rehearsal passed draft/template transfer,
organization defaults, New Issue, reload and previews. The separate October 4
round 2 rehearsal proved only same-browser editable draft restoration: the
restored export's complete issue state matched its untouched backup. Round 2
cross-profile transfer/defaults/New Issue, template merge, future mobile/dark
preview, Check Links, calendar propagation and publication were **NOT RUN**.
The original draft was restored; defaults and the template library were unchanged;
two recoverable rehearsal revision snapshots remained. These dated rehearsals
do not complete the actual incoming officer's acceptance or authorize a send.
Keep the exact exports and findings in the private handoff.

The October 8 retained rehearsal subsequently confirmed the local fictional Fall/Spring previews in both tools on desktop/phone and downloaded editable-draft recovery. Fictional previews were removed and Upcoming restored. Those observations do not prove live Google propagation, remote email delivery or approved production facts. See [current implementation and verification status](current-implementation.md).

## Webmaster T04: shared tool links

The remediation config connects the chapter Control Center’s **Shared_Resources_Public** tab through the existing A:H contract, with its normal **Edit shared resources in Google** link. Release and an ordinary fresh-browser edit/refresh/restore test are still required before accepting this as the deployed routine workflow. In Resources, expand **Maintain shared chapter links**, open the editor with the authorized chapter account, preserve the latest row and a recoverable version, and coordinate changes. Keep stable IDs and headers; edit label, URL, category, comma-separated roles, order, TRUE/FALSE enabled and optional academic year. A FALSE row disables the shared item; deleting it restores its bundled fallback.

Wait for Google to report saved. Choose **Refresh shared resources**, check the response read time, then click the actual changed destination and repeat in a fresh browser with no personal links. An unavailable/invalid feed shows a stale or bundled fallback; that is not proof of a successful shared change. Reconcile Google before retrying and restore only the affected row after considering other editors. Private handoff/checklist references were intentionally reviewed for this projection; their contents and access stay private, and a listed reference does not grant access. Never place passwords, member records or private notes in the public rows.

The Webmaster changes [assets/js/config.js](../../assets/js/config.js) only for source connection, bundled fallback or deployment repair. Routine reviewed rows do not require a GitHub patch. If infrastructure is missing, identify the owner and requested editor/source receipt rather than calling a disabled editor connected.

Annual cards with a `settingKey` get their effective URLs from the selected
year's Google settings instead: attendance Form, Points Master, calendar,
budget tracker/export, banking and fundraising. Keep those annual values in
the reviewed year row. A personal browser link changes only that browser.

For a source connection or bundled fallback change, run the Hub's `npm run check` and `npm test`, review
the diff, and use the normal authorized GitHub merge/deployment route.
`.github/workflows/pages.yml` deploys main after checks and calendar sync.
Open the Hub in a separate browser profile where no personal links have been
added. Click the changed shared tool card and confirm its destination. Restore the old source value and redeploy
if the shared destination fails. A local edited file has not updated the live Hub.

## T04: decide whether to reuse the calendar

**Default preparation route: reuse the existing chapter calendar**, subject to
the calendar owner's recorded confirmation. The public website promises
“Subscribe once”; reuse preserves the calendar identity and existing
subscriptions. Add confirmed new-year events to that calendar, retain its
history, and update visible year labels separately. A new academic year alone
does not require a new calendar.

Create a new calendar only for an explicit owner-approved change of calendar
identity or operating policy. Existing subscribers must subscribe to the new
calendar; their old subscription does not migrate. Before changing consumers,
save the old ID, page URL, public iCal URL, iframe URL and subscribe URL. Update
every row of the source map below, publish the new subscription route and
verify it with a fresh account/session. Keep the old calendar and history while
the owner decides its archive policy. No test or fictional event belongs in the
real public calendar.

In Google Calendar on desktop: select the chapter calendar in **Settings →
Settings for my calendars → Integrate calendar**. Copy **Calendar ID**, **Public
address in iCal format** and the public/embed URL there. The public address is
different from a secret iCal address; never publish the secret address. The
calendar page URL used by the Hub remains the human-facing chapter webpage.
Keep the calendar's time zone and each timed event in **America/New_York**.

### Target-year preview and isolated rehearsal

The repaired Newsletter Calendar UI adds **Academic year (August–July)** with a `YYYY-YYYY` value, **Preview year**, **Upcoming**, **Load fictional Fall/Spring**, **Remove fictional events**, **Refresh chapter snapshot**, **Open Calendar** and **Open event editor**. Year preview changes this browser’s calendar view only. Fictional Fall/Spring records are local fixtures, create no Google events, and are marked TEST ONLY—DO NOT SEND if imported into an issue. They do not overwrite defaults/templates; use revision recovery after an intentional draft import. Remove fictional events, then Refresh chapter snapshot to return to official published JSON while retaining the selected year. Website’s matching controls are **Academic year (August–July)**, **Preview year**, **Upcoming dates**, **Refresh chapter snapshot**, **Load fictional Fall/Spring**, and **Remove fictional events**. Fictional mode hides the live embedded Google iframe; official year preview adjusts the iframe display dates while preserving the same calendar source. These controls require the reviewed release; source edits alone do not prove live behavior.

For actual rehearsal event creation, use an approved private training calendar in the Google editor, verify its Calendar field before every Save, and keep guests empty. Record one Fall and one Spring event’s title/date/time/timezone, inspect the intended preview consumers, delete only those events and verify removal. The regular production source remains the approved chapter calendar; a local fixture preview does not establish actual Google-to-JSON propagation. Ask the Webmaster for a receipt naming each consumer’s source ID, timezone, generation job, last generation/read time, changed event result and cleanup result. An annual Hub row change does not reconfigure Website or Newsletter.

### Webmaster: calendar sources and update routes

A **feed** is a saved event list that another tool downloads; a **workflow** is
the GitHub job that creates and publishes that list. The calendar owner confirms
events; the Webmaster checks these source/update routes.

The October 3 inspected public ID was
`c93730cdacb567b0f010d1367080e3028ec5c7657d9713b675ac9e5c437b9fba@group.calendar.google.com`.
Verify it again in the owner account before a real transition.

| Consumer | Exact source/editor | Publish/refresh path |
|---|---|---|
| Hub annual link and feed | Google `Hub_Settings_Public`: `calendar_page_url` column I is the chapter calendar webpage; `calendar_ical_url` column J is the **public** iCal address (JavaScript properties `calendarUrl` and `calendarIcalUrl`). Review through Year Settings and save/read back the target row. Deployed fallback is `assets/js/config.js` → `dataSources[year].calendarUrl/calendarIcalUrl`. | `scripts/sync-calendar.mjs` reads active years from Google; `.github/workflows/pages.yml` generates `data/calendar.json` in the Pages artifact. An inactive draft is intentionally absent from the snapshot. Do not activate a draft just to test its calendar. |
| Website event cards and homepage featured event | [ASME-OSU-Website/scripts/sync-calendar.mjs](https://github.com/ASME-OSU/ASME-OSU-Website/blob/main/scripts/sync-calendar.mjs): `CALENDAR_ID`, `TIME_ZONE`; derives `ICAL_URL` and `EMBED_URL`. | **Actions → Refresh public calendar feed → Run workflow**, `.github/workflows/update-calendar-feed.yml`; generated `data/calendar-events.json`; `Calendar Integration.js` renders it. Verify the public JSON after Pages publication. |
| Website iframe, subscribe button and visible year | [ASME-OSU-Website/Calendar Page.html](https://github.com/ASME-OSU/ASME-OSU-Website/blob/main/Calendar%20Page.html): subscribe `href`, iframe `src`, and `#acp-calendar-label`. | Edit repository source, then paste the whole reviewed custom HTML block into the matching WordPress Calendar page and preview/publish through the authorized route. GitHub publication does not paste HTML into WordPress. |
| Newsletter Calendar feed | [ASME-Newsletter-Builder/scripts/sync-calendar.mjs](https://github.com/ASME-OSU/ASME-Newsletter-Builder/blob/main/scripts/sync-calendar.mjs): `CALENDAR_ID`, `TIME_ZONE`; derives public iCal/embed URLs. The repaired Calendar UI exposes a target academic-year preview and local fixture mode; it does not change the canonical Google source. | **Actions → Sync public calendar → Run workflow**, `.github/workflows/sync-calendar.yml`; generated `calendar-events.json`; then **Calendar → Refresh chapter snapshot** in the builder. That button downloads the published JSON; it does not query Google or run Actions. |
| Newsletter Open Calendar link | [ASME-Newsletter-Builder/index.html](https://github.com/ASME-OSU/ASME-Newsletter-Builder/blob/main/index.html): Calendar section's **Open Calendar** anchor. | Update its embedded `src` calendar ID/time zone separately when replacing the calendar. Review normal repository checks and Pages publication. |
| Attendance and Points | Annual Points `Events` rows and copied Form's `Event ID` question; see [Annual Points setup](annual-points-setup.md). | Calendar import does not create Points rows or Form choices. Manual mode needs separate edits to both. Use the generated Points Event ID as the reconciliation key; a calendar UID is a different identifier. |

Source fields must agree on calendar identity; matching webpage titles alone
does not prove that. In the reuse route keep the existing ID/feed/iframe/subscribe
values and update only confirmed content and the visible year label.

### Select attendance events deliberately

The feed includes exams, breaks and commencement as well as chapter activities.
Import a chapter meeting/workshop/social/outreach item only when its owner
confirms date, start/end time, room, description and participation instructions.
Import an academic date as an informational item only when useful, and label it
as such. Academic dates earn no attendance points merely by being in a calendar.
The selected annual period is **August 1–July 31**; **Fall is August–December,
Spring January–May, Summer June–July**. Use that policy for event classification,
Points reporting, finance and acceptance. The Points officer approves the
category, value and open/close window separately. Keep tentative rooms, speakers, sponsor promises and dates in
the private draft until confirmed.

Keep a private reconciliation row for each approved chapter event:

| Field | Private rehearsal example, all fictional |
|---|---|
| Points Event ID | `20270826-001` |
| Title | `MOCK Welcome Meeting` |
| Date/time | August 26, 2027, 17:30–18:30 America/New_York |
| Location | Scott Laboratory E141 — unconfirmed mock room |
| Points category/value | General Body Meeting / 5 — simulated rule |
| Attendance choice | Generated Event ID plus reviewed event name/date using the exact format in the Points guide |
| Expected consistency | Same title/date/time/location in Hub card, Website card and iframe, Newsletter imported event; matching Points Event ID in Form and Points |
| Actual result | NOT RUN; no real calendar entry/import/publication |

Test a timed autumn event, a timed spring event and an all-day item in a private
fixture. Check July 31/August 1 annual rollover, December 31/January 1 and
May 31/June 1 semester boundaries using the selected policy; May remains Spring. Check local date, Eastern time and day-boundary handling separately.
For the real calendar use existing approved events as comparison evidence;
record the feed generation timestamp, consumer URL, observed fields and reviewer.

### Webmaster: refresh and stale-feed decisions

| Consumer | Scheduled generation | Officer confirmation |
|---|---|---|
| Hub | Hourly at minute 17, plus main pushes/manual dispatch | **Actions → Sync calendar and deploy Pages → Run workflow**. Check build and deploy results, then public `data/calendar.json`: `generatedAt`, target `calendars[year].feedUrl` and occurrence. Refresh Hub. The browser may show LIVE for a snapshot up to six hours old and fallback up to 24 hours; that badge alone is insufficient for annual acceptance. |
| Website | Hourly at minute 23 | Run the calendar-feed workflow, check public `data/calendar-events.json` `generatedAt` and event fields, then hard refresh the Calendar page and homepage. The repaired consumer reports generated/source-checked/browser-read times and annual coverage; verify that release and record those fields with the workflow result. A cached card can appear before the refreshed feed. |
| Newsletter | Hourly at minute 17 | Run the sync workflow, check published `calendar-events.json`, click **Refresh chapter snapshot**, and record its generated/source-checked/browser-read times and selected-year coverage. Use **Update Imported Event** or **Sync Imported Events** for already imported copies; feed refresh alone leaves editable issue content unchanged. |

Website and Newsletter sync scripts keep the existing JSON unchanged when the
event array matches the latest calendar read. Their `generatedAt` records the
last changed feed generation, rather than every successful poll. The repaired source writes `checkedAt`, `calendarId`, `windowStart` and `windowEnd` for successful reads and coverage, including the following complete academic year; verify the deployed JSON. A browser refresh rereads that JSON, while the scheduled job separately fetches Google. An older
timestamp alone does not prove a stale feed. In an unchanged-content check,
record the successful workflow run URL/time and its “Calendar is unchanged”
result alongside the JSON timestamp and matching event fields. For all-day
items compare the calendar date: Website serializes noon UTC and displays
Eastern time; Newsletter serializes midnight UTC and displays UTC for these
items. The different ISO times preserve the same intended date.

Schedules are targets, not a delivery guarantee. For this handoff use a **90
minute review window after a confirmed source edit** as a troubleshooting
threshold, not an assertion of chapter policy or actual propagation speed. If
the event is absent after that window, the webmaster dispatches the relevant
workflow and checks the result, public JSON and source identity. If dispatch
fails, publication is stale, the workflow is disabled, or the expected event
still differs, record FAIL/BLOCKED with the owner and preserve the previous
source/content until repaired. Do not pass the check because the iframe updated
while cards or newsletter stayed stale. A launch requires a successful calendar
read **after** the relevant edit and observed matching output, even within 90
minutes. If an edit changes an event title, date, time or other published details, check
those details in the published calendar data and each tool, including the changed
feed and its new generation timestamp; a successful unchanged-content result cannot
prove that a missing changed event propagated.

## T04: transfer the editable newsletter correctly

Use the hosted builder's **Templates** and **Settings** controls. The code and
[builder user guide](https://github.com/ASME-OSU/ASME-Newsletter-Builder/blob/main/USER_GUIDE.md)
establish these separate scopes:

| Control/file | Contains | Does not transfer |
|---|---|---|
| **Templates → Export Draft .json** / **Import Draft .json**; `asme-newsletter-draft.json` | Versioned editable issue: events and the calendar-source information saved with them, enabled sections, appearance, featured/announcement content, quick links, issue text, footer, logos/social URLs, unsubscribe, subject and inbox preview text (preheader) | Saved organization-default record, custom template library, previous-draft/revision history, auto-sort/editor preferences, Brevo login/lists/campaigns |
| **Templates → Export .json** / **Import .json**; `asme-newsletter-templates.json` | Array of user-saved templates with name, saved date and issue state | Current unsaved issue, saved organization-default record, revisions/preferences or Brevo configuration. Import merges into the incoming library and replaces templates with the same name. |
| **Settings → Save as Defaults** | Saves current branding/footer/three quick links/social URLs and unsubscribe field for future new issues in **that browser** | No exported file or cross-browser sync. The outgoing browser's defaults are not automatically installed by draft import. |
| **Restore ASME Defaults** | Resets and saves bundled official starting fields on this browser | Does not recover the outgoing officer's reviewed chapter defaults; bundled footer still needs address confirmation. |
| HTML download / **Copy HTML for Brevo** | Rendered email HTML | Editable builder project or saved defaults/templates; preview/readiness does not establish a sent email result. |

1. Load the intended saved template if exporting a particular Fall/Spring issue; inspect its subject, issue year/date and event in preview before **Templates → Export Draft .json**. A numbered filename such as JSON (15) is not evidence of which issue was exported. If the custom
   template library is used, also choose **Export .json** for that library.
   Find each file in your browser Downloads list and confirm it exists and is
   not empty. Open the draft JSON as text: it should identify
   `asme-newsletter-draft`, show an export date (`exportedAt`) and include the
   expected issue under `state`. The library file is a list of saved templates.
   Save dated, distinct filenames in the annual Communications folder and keep
   an untouched backup. If the download indicator times out, inspect Downloads
   before retrying; a file may have downloaded successfully. Ask the Webmaster
   to inspect any unreadable file before overwriting a draft. Never use
   **Clear Saved Draft** as the first handoff action.
2. In a separate browser/profile (not another tab), export and verify any
   existing incoming draft before
   **Import Draft .json**. Import the issue file; confirm the actual subject,
   inbox preview text (preheader), issue date, each event/featured section, signature, three quick
   links, logos, footer/address, social destinations and `{{ unsubscribe }}`.
   Compare them with the outgoing file and visible editor. Dismiss any import
   success alert, then export the imported issue and compare the saved fields.
   A success alert alone does not verify that the correct issue was imported.
3. Import the templates file separately if needed. Before doing so, compare
   names and preserve incoming templates that would be replaced. Open each
   required saved template and review its carryover content.
4. Restore the intended handoff draft after template inspection. Review
   **Links**, **Design** footer and **Settings** fields, then **Save as Defaults**
   on the incoming browser. This is how current issue fields become that
   browser's future defaults. Subject, signature and event dates are issue
   content, not organization defaults.
5. Export the verified incoming issue. In the isolated incoming profile use
   **New Issue**, compare its branding, three quick links, social URLs,
   footer/address and unsubscribe with the saved-default checklist, then
   re-import the verified issue. Reopen/reload to check persistence. Record
   exact file, browser/profile, comparison fields, time and result privately.
6. Review Desktop, Mobile and Email dark mode previews; run **Check Links** and
   open any “Could not verify” destinations manually. The readiness score checks
   selected content fields; it cannot verify approved facts, sender, recipient
   list or send permission. The communications officer must obtain the actual
   approved mailing address, sender and recipient list and record who approves
   sending. Leave these PENDING until confirmed; obtain authorization for any
   actual test email or campaign.

Before using a starter or saved template, inspect **Events**, **Featured**,
**Announce**, **Links**, **Design** and **Settings**. Replace old May/June sample
events, outdated issue text and outgoing-year President signature. Confirm every
employer benefit, room, RSVP destination, sponsor statement and image. Review
disabled sections too: switching a section Off hides it from the email but keeps
its old fields in the editable export. Recheck them before turning it On. Starting
a new issue still creates a placeholder event; remove or replace it. Keep the
unsubscribe field exactly `{{ unsubscribe }}` and obtain a verified mailing
address; the bundled city/organization text is not confirmation of a full address.

Source inspection explains transfer scope. Record the actual incoming
officer's cross-profile transfer and New Issue/defaults check as **NOT RUN** until
performed, even where the earlier isolated rehearsal passed. No email was sent
in either documented rehearsal.

## Webmaster T04: public-page source and publication map

Website sources live in
[ASME-OSU-Website](https://github.com/ASME-OSU/ASME-OSU-Website).
Edit the source, preview it, then update the matching **WordPress Pages → page →
custom HTML/code editor** through the chapter's authorized publishing route. Routine content can also use **WordPress Admin Login → Pages → intended page → Visual editor**: preserve the current content, edit an approved draft, choose Save Draft, reload, then Preview on desktop/mobile. Do not publish until the responsible content owner approves. Confirm that preview is the intended draft, and keep rehearsal pages unpublished and out of menus. Repository and CMS updates remain separate when repository-managed custom blocks are changed.
Preserve the current editor/formatting settings. Never assume a GitHub merge
updated a WordPress page. Compare the live rendered result after publication;
WordPress can insert extra paragraphs/breaks into otherwise correct source.

| Public surface | Exact repository file/field | Separate publication/acceptance |
|---|---|---|
| [Leadership](https://org.osu.edu/asme/leadership/) | `Leadership Page.html`: `.lb-current-year`, `.lb-year-tabs`, `.lb-year-panel` | Paste reviewed block into Leadership. Verify incoming cards plus outgoing archive and every prior archive tab on desktop/phone. |
| [Calendar](https://org.osu.edu/asme/calendar/) | `Calendar Page.html`; source/feed map above | Paste Calendar block for label/embed changes; verify cards **and** iframe **and** subscribe route. |
| [Member resources](https://org.osu.edu/asme/member-resources/) | `Member Resources Page.html` | Paste matching block; open Join, career and membership/points destinations. Keep existing icons and page structure (including inline SVG and semantic HTML wrappers). |
| [Join](https://org.osu.edu/asme/join/) | `Join Page.html`, `Join Page Integration.js` | HTML paste plus deployed script when changed; review normal Brevo/signup route. Link inspection does not prove a real signup delivery. |
| [Member points](https://org.osu.edu/asme/member-points-page/) | `Member Points Page.html`, `Member Points Integration.js`; existing export configuration in source | Deploy JS/required footer and paste page block if changed; verify only reviewed sanitized target export and status/snapshots. No private master link goes in public source. |
| Sponsors | `Current Sponsors Page.html`, `Sponsor ASME Page.html` | Copy only renewed/approved listings and destinations into matching WordPress pages; verify logos, benefits and inquiry links. A year change alone does not renew sponsorship. |
| Homepage | `Home Page.html`, `Calendar Integration.js` | Paste Home block for content changes; deploy JS for feed changes. Verify featured event/date independently of Calendar iframe. |
| Shared footer/contact/social/year | `Footer.html`, `Footer Integration.js` | Compare the live WordPress shared code before editing. The README records **Settings → Advanced Settings → Additional code** header/footer paths; the live footer may also use a GeneratePress element. Identify its active source first, preserve other shared code, then preview/publish the reviewed block. Do not paste a duplicate footer. |
| [Career guide](https://asme-osu.github.io/ASME-Career-Packet/) | [ASME-Career-Packet/config.js](https://github.com/ASME-OSU/ASME-Career-Packet/blob/main/config.js): `edition`, compensation source/value/reference year, prep plans, offer-fit weights; `index.html` recommendations/resource-review wording | Follow repository README: validate with `node scripts/validate.mjs`, run repository browser tests and review print/PDF. Main/root GitHub Pages deploys; no WordPress paste for the guide itself. Verify edition and resource-review claims reflect actual review. |

For Website edits use its `npm ci`, `npm run check`, `npm test` and build checks.
Shared generated header/sponsor/navigation blocks have source/build commands in
the Website README; edit the generator source and regenerate rather than editing
generated copies. If CSS changes, use the README's jsDelivr purge/cache-buster
route. Keep a copy of each prior WordPress block and source revision for rollback.

### Worked board-archive patch for the 2027–2028 preparation

This example uses the existing markup identifiers and preserves the outgoing
board intact. It does not provide invented incoming names or publish a future
board. Stage it privately until all seven incoming roles and publication date
are approved.

1. Save the full existing `Leadership Page.html` and current live WordPress
   block. Copy the complete current `.lb-grid` containing **all seven**
   `article.leader-card` entries, including each role, name, image/alt text,
   email and LinkedIn link. Do this before changing current-year cards.
2. Add this button first inside `.lb-year-tabs`:

   ```html
   <button type="button" id="lb-tab-2627" class="lb-year-tab active"
     data-year="2627" role="tab" aria-selected="true"
     aria-controls="lb-2627">2026–2027</button>
   ```

3. Add the new panel before `lb-2526`. Its completed wrapper is:

   ```html
   <div id="lb-2627" class="lb-year-panel active" role="tabpanel"
     aria-labelledby="lb-tab-2627">
     <div class="lb-year-panel-header"><h2>2026–2027 Executive Board</h2></div>
     <!-- Insert the complete unchanged outgoing .lb-grid copied in step 1. -->
   </div>
   ```

   The new archive must retain these seven outgoing roles from the baseline:
   President, Vice President / Corporate Liaison, Treasurer, Administrator,
   Social Chair, Webmaster and E-Council Representative. Do not replace actual
   historic people with mock placeholders in the archive.
4. Remove `active` from the previous `lb-tab-2526` and `lb-2526`; set that tab's
   `aria-selected="false"` and that panel's `hidden` attribute. Keep all older
   tabs/panels unchanged. Exactly one past tab/panel starts active. Existing
   click code selects `lb-` plus the button's `data-year`; no new handler is
   needed for `2627`.
5. Only after approved incoming facts exist, change the current heading to
   `2027–2028 Executive Board` and replace its seven cards with confirmed roles,
   names, photos/alt text and approved contacts. Review role changes explicitly.
   With missing appointments leave the **private draft pending** and retain
   the currently accurate public board until an approved publication decision.
6. Check each archive tab, new-card links/headshots, mobile layout and duplicate
   IDs in local/WordPress preview. Publish the reviewed block only through the
   authorized route; repeat on live desktop/phone. A source patch/preview is
   not a published-page PASS.

Calendar reuse example: change only `#acp-calendar-label` from
`ASME 2026–27 Events · Eastern Time` to `ASME 2027–28 Events · Eastern Time`
when that label is approved for publication. Keep the existing iframe and
subscribe ID in the reuse route. Career preparation example: set `edition` to
`2027–28` in a private reviewed change; review compensation evidence and
resources separately, keeping their actual reference years rather than simply
changing every `2026` string to `2027`.

## Collect facts and record pending work

| Owner | Required confirmed input | If pending |
|---|---|---|
| President | Appointed roles/names, approved photos/contacts and publication date | Keep draft private; no invented officers or premature heading |
| Calendar/event owner | Approved date/time/zone, room, speaker, description and cancellation status | Keep tentative event off public calendar and attendance selection |
| Points officer | Approved period/category/value and verified sync or manual Form choices/open-close decisions | No automatic credit from calendar or newsletter import |
| Corporate liaison | Renewal period, approved logo/use terms, benefit wording and contact destination | Preserve only currently accurate public commitment; do not imply renewal |
| Communications officer | Mailing address, sender, issue date, subject/signature, links and recipient/list approval | Save unsent editable draft; no campaign/test-send evidence claim |
| Webmaster | Current source revision, reviewed patch, WordPress active block, deployed feeds and desktop/phone results | Record blocked consumer and recovery source; do not substitute local preview |

Keep expected result, actual result, exact source/URL, observation time, owner,
status and next action in the private acceptance record. Optional features need
an explicit coordinator-approved N/A reason; uncertainty is not PASS.

## Webmaster source evidence and limits

The map was checked against the Hub checkout and read-only existing local sibling
repositories at these revisions: Newsletter `3e252d35ad9ba2f6b54b359f45ba26c11b495f1f`,
Website `d7891a0f91c55fa6dccfb8e7946111b510c634f8`, Career
`b74308aa2ad2f1b8c8ec3b267fb4114576e66a97`. Website sponsor and Career UI files
already had local edits; this procedure does not adopt or publish those edits.
The linked repository main may advance: verify the current source, active
WordPress editor and deployment before a real rollover. The actual incoming officer’s cross-device acceptance, calendar propagation, target-year phone checks, board/sponsor
decisions, publication and send remain unverified until officers perform and
record them. Public docs contain no private roster, funding evidence or handoff
resource inventory.
