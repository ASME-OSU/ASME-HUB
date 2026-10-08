# Private annual settings draft append

Install both `AnnualSettingsDraftEngine.gs.example` and `AnnualSettingsDraftRunner.gs.example` in the same private standalone Google Apps Script project as AnnualCopyEngine and AnnualSetupEngine. Use the setup runner's manifest with Drive, Sheets, Forms and user email scopes. The editor route below remains available; the optional authenticated Google page provides import, verification, reviewed save and readback. Preview performs Google reads and never changes Google resources or Script Properties. Adding the source files does not install or deploy the service or save a production year.

## Officer route through the Google page

1. Paste copied links in the relevant guide steps. Step 10 opens the inactive Year Settings draft. Review its public row fields and choose **Open authorized annual save**. The reviewed draft transfers directly; **Download Google save file** is the fallback.
2. Choose **Open authorized annual save**. The chapter service is connected for the 2027–2028 draft. Sign in as the configured chapter account and choose **Verify with Google**.
3. Google independently verifies the configured annual copies and setup, exact Google file types, observed Form editor/respondent URLs, closed responses, correct Points Master destination, settings schema and current year. Review the exact row and its public audience, record the audience review, then choose **Save inactive year and confirm**.
4. The existing engine journals intent, appends an inactive/noncurrent row, independently reads it back and checks that other rows remained unchanged. Its confirmation supplies the year and readback time. Return to the Hub and use **Compare with Google**; remaining guide checks and eventual activation are separate actions.

The connected deployment uses reviewed manual-copy rules for 2027–2028, runs as the signed-in chapter account and remains accessible only to that account. A maintainer must review and update the private year/rules before using this route for a later transition. Loading a draft never saves it or changes the current year.

The private administrator selects either the existing automated-copy configuration or the independently verified manual-copy mode described in [MANUAL_ANNUAL_VERIFICATION.md](MANUAL_ANNUAL_VERIFICATION.md). Uploaded links never establish their own authority. Without a connected service, use **Edit shared settings** and **Compare with Google**. The guide distinguishes collapsed **Current Hub settings** from **New-year draft links**, which are saved on the officer's device.

## Optional same-project web page installation

Add `ManualAnnualVerificationEngine.gs.example`, `ManualAnnualVerificationRunner.gs.example` and `AnnualSettingsWebApp.gs.example` as `.gs` files and `AnnualSettingsPage.html.example` as an HTML file named exactly `AnnualSettingsPage` in the **existing private standalone project**. Keep the copy/setup/settings engines, runners, private properties and ledgers intact. Do not create a bound or second project: separate projects would not share the annual script lock.

Use the existing setup manifest scopes and advanced Drive v3 service. `AnnualSettingsWebApp.appsscript.json.example` adds only `webapp: {"access":"MYSELF","executeAs":"USER_ACCESSING"}`. Deploy a web app with **Execute as: User accessing the web app** and **Who has access: Only myself**, using the configured chapter account. The page independently requires nonblank active and effective Google identities to match each other and `ANNUAL_COPY_CONFIG.intendedOwner`; an incorrectly configured deployment running as its owner does not authorize another visitor. No Hub phrase, browser role, downloaded file or preview ticket grants Google access.

Rehearse against the existing private fixture first. A chapter-authorized administrator may then connect the reviewed deployment URL with `annualSettingsSave: { url: "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec" }` in Hub configuration. Never connect a fixture service as the production save route. A missing URL accurately displays **not connected yet**. The direct transfer uses a URL fragment consumed by the official [`google.script.url.getLocation`](https://developers.google.com/apps-script/guides/html/reference/url) API. It never uses query parameters or carries an OAuth credential; loading the page only fills the draft and never verifies or saves. The fragment and fallback file contain private handoff links, so keep them on an officer device. The browser sends no OAuth credential and has no public write API; the Google-hosted page uses `google.script.run` under the signed-in user's authority.

The transferred draft or uploaded file selects only the eleven public row fields and exact handoff. The target Control Center, ledger, selected year and fixed timestamp come exclusively from private configuration. Incoming JSON key order is normalized to the existing trusted handoff and configured values, preserving the old journal's plan and digest. A successful preview stores a small per-user review record for 30 minutes without changing the private annual configuration. A new import clears its prior review record, including on failure. Saving repeats authentication and verification; a stale ticket, changed private target/configuration, changed copied resources or changed Google baseline blocks saving.

After an uncertain save, keep the original file and journal, then verify the same file and request the same reviewed save again. A recorded identical row reconciles by readback; a pending intent without its row blocks another append. The page never resets a journal. Tests cover authenticated access, immutable targets/timestamps, failed and expired imports, exact preview approval, configuration changes, actual browser transfer ordering, and repeat readback. Local tests do not certify a deployment or live Google execution.

After both annual setup phases have been approved and read back, put its exact observed `AnnualSetupEngine.handoff` result in private Script Property `ANNUAL_LINK_HANDOFF`. The writer independently repeats configuration readback from the private copy ledger, reads Google MIME/identity and FormApp URLs/destination, and requires the copied Form to remain closed. Pasted IDs or URL patterns alone do not prove newly created resources.

`AnnualCopyEngine.verifyCompleted` verifies the immutable historical copy plan, actor, every completed journal operation and actual copied identities, parents, private ownership and unique markers without reading evolving source masters. Template renames or newer master versions therefore do not invalidate completed annual copies. A missing or pending operation must be reconciled through the original copy workflow before setup/handoff. The creation workflow still requires the exact reviewed source name/version and never silently adopts a changed source.

Put explicit selections in private `ANNUAL_SETTINGS_DRAFT_CONFIG`:

```json
{
  "schema": 1,
  "year": "2027-2028",
  "controlCenterId": "REPLACE_WITH_REAL_CONTROL_CENTER_ID",
  "sheetName": "Hub_Settings_Public",
  "ledgerId": "REPLACE_WITH_SEPARATE_PRIVATE_JSON_LEDGER_ID",
  "draftTimestamp": "2026-09-30T12:00:00Z",
  "values": {
    "display_label": "2027–2028",
    "engagement_goal": 100,
    "leaderboard_tab": "Leaderboard_Public",
    "dashboard_json_url": "",
    "calendar_page_url": "",
    "calendar_ical_url": "",
    "status_note": "Annual draft; checks pending",
    "event_metrics_tab": "Event_Metrics_Public",
    "budget_export_sheet_tab": "Budget_Public",
    "banking_url": "",
    "fundraising_url": ""
  }
}
```

These are illustrative selections; inspect actual export tabs and intentionally choose each field and a fixed timestamp. The writer never copies current-year values implicitly. The target year must be consecutive within 2000–2199. Empty rows containing only blank or unchecked active/current cells are accepted and preserved exactly. Active blank-year rows or other content without a year are rejected. If the sheet is full, the append adds one physical row; it never replaces an unused checkbox row. Current and historical rows must have exact A:T headers, literal values, unique valid years and explicit flags, with exactly one active current year.

Run `previewAnnualSettingsDraft` privately and inspect `headers` and the exact 20 values in `row`. The Control Center's entire workbook is publicly readable: Points Master and budget tracker URLs themselves become public references, even if the target files require authorization. Confirm the intended public audience of every field, including any dashboard, banking or fundraising URL. If any operational reference must stay private, stop before approving and design a separate private authority/public projection. A hidden tab does not solve whole-file sharing.

Only after inspecting that exact preview and public audience, set private `ANNUAL_SETTINGS_DRAFT_APPROVAL`:

```json
{"year":"2027-2028","digest":"EXACT_PREVIEW_DIGEST","publicLinkReview":true,"reviewNote":"Describe the actual public audience review performed"}
```

Run `appendOrReadbackAnnualSettingsDraft`. It appends only an inactive, noncurrent row, durably journals pending intent first, then independently reads all values back and verifies the existing rows stayed unchanged. A repeat with the identical journal and exact Google row performs readback only. A changed row, duplicate target, changed plan, missing target after an uncertain attempt or unknown outcome blocks further appends. Preserve the journal and inspect Google; never delete a pending intent to force retry. Existing target rows cannot be replaced by this writer.

The same project lock serializes its annual engines; direct human edits and other projects do not participate, so coordinate editing during confirmation. The journal uses a separate private Drive JSON ledger, so additional years do not exhaust a Script Property. Provision it with {"schema":1,"runs":{}} and preserve it on every resume. Its owner, edit capability and private user-only permissions are checked before reads and writes. No audit tab is placed in the public workbook. Approval and snapshots stay private.

A matched draft readback proves this append's literal values, not activation, export privacy, publishing, sharing, scoring, import authorization or any manual readiness check. Perform those separately in isolated fixtures before a production annual append. This writer never opens responses, activates a year, changes sharing or marks checks PASS.

## Verification and save recovery

Use a separate chapter browser profile if Google selects a personal account. Keep the Hub Google save JSON and use **Download draft for another profile or retry** on the service before switching profiles. No `/u/1` account index is assumed. Verification time and expiry are displayed separately from the fixed configured draft timestamp; `last_updated` remains that immutable draft timestamp so recovery uses the same journal identity.

Each actor can hold five independent settings tickets for 30 minutes. Another browser tab does not replace the current ticket; five newer reviews may evict it. A malformed new import never repurposes an older ticket; the current page clears its own review. Wrong actor, expired/evicted ticket, changed private configuration and validation rejection require correcting the stated issue and verifying again.

A lost save response keeps the exact draft, review and ticket. **Save inactive year and confirm** first reconciles the locked private ledger and actual Google row. It appends only when no prior intent exists, reuses a matching committed row, and blocks an unresolved pending append or changed baseline. Do not reset a ledger, change a fixed draft timestamp or alter values to bypass an uncertain outcome. A double click dispatches one request. If the ticket expires, verify the same retained draft again. After confirmation, Compare with Google in the Hub.

Receipt fields distinguish `draftTimestamp` (configured row timestamp), `appendAttemptedAt` (acknowledged intent time), `firstConfirmedAt` (first matching Google readback observed) and `checkedAt` (latest matching readback). The actual remote append time cannot be inferred after a lost acknowledgment; first confirmation is labeled as such. Historical verified journals lacking intent time return null for `appendAttemptedAt`. None of these receipts activates the year.
