# ASME annual setup

The standalone provisioner creates six folders and five annual template copies, observes the actual Form response tab, configures export pointers and budget dates, and appends exactly one inactive/noncurrent settings row. Repeating a year in the same workspace and Control Center resumes the interrupted run or verifies its existing draft. Practice and production roots keep separate saved runs. A completed retry refuses changed bindings, open intake or LIVE state instead of resetting them.

## Install once before handoff

1. Sign in as `asmeohiostate@gmail.com`. In a separate standalone Apps Script project, install `AnnualProvisioner.gs`, `AnnualReadiness.gs`, `EventSync.gs`, `SanityCheck.gs` and `ProvisionerWeb.gs`. Create an HTML file named **ProvisionerPage** with `ProvisionerPage.html`. Use the supplied `appsscript.json.example` manifest. Keep this project separate from the older settings service, which has another `doGet`.
2. Deploy as a web app with **execute as the user accessing the app**, **access only myself**. Open it as the chapter account and authorize the Google services. Use a browser profile signed in only to the chapter account; Google documents that multiple simultaneous Google sign-ins are unsupported for Apps Script web apps (https://developers.google.com/apps-script/guides/support/troubleshooting).
3. Open **Change saved workspace — chapter account** and paste the private annual workspace folder, intended Control Center, approved positive engagement goal and optional HTTPS calendar feed. Explicitly choose Real handoff or Practice only and save the setup. Existing workspace purpose cannot be switched. For rehearsal, use a private practice root and copied Control Center. No manually entered script properties are needed.
4. Put the app's verified `/exec` URL in `ASME_HUB_CONFIG.annualProvisioner.url`, separate from `annualSettingsSave.url`. Step 2 then offers **Open Annual Setup — manual fallback** under its help. Enable the connected sign-in route separately with [HUB_API_SETUP.md](HUB_API_SETUP.md).
5. For optional Practice cleanup and legacy menu compatibility, install `EventSync.gs`, `SanityCheck.gs` and **TestCleanup.gs** in the Points template's bound project before handoff. Routine new-year connection checks and automatic event updates run from the standalone project and do not require copied-menu consent. Preserve existing scoring handlers and reconcile any existing `onOpen` into one menu handler. The bound project needs the supplied OAuth scopes; only the standalone project needs the `webapp` manifest entry. Annual copies inherit the bound files. Reload a copy to see **ASME Tools**.

The existing editor routes remain `provisionReviewedAnnualYear('2027-2028')` and `provision2027_2028()`.

## Five officer steps

Use the [student walkthrough](../../../docs/officer-transition/student-walkthrough.md) as the primary officer guide. **Real handoff has 20 reviews; Practice has 16.** Complete source cleanup, configuration, authorization and deployment before handoff. Routine officers use the connected Hub actions; they do not install scripts in each annual copy.

1. **Choose your year:** select year/purpose and confirm shared workspace, approved account and help contact. Annual Setup access is checked in Step 2.
2. **Prepare this year’s files:** choose **Sign in with chapter Google account**, confirm the approved goal and separate Real/Practice workspace purpose, then **Create or reopen this year’s files**. The Hub saves all seven links automatically; teammates reuse those files. Main file buttons are under **Open files for review**, with the full list under **Help and recovery → All saved files and reference links**. If connected setup is unavailable, the external **Manual fallback** requires the approved single-account ASME profile and **Copy setup results → Paste setup results → Save setup results**. Downloads and detailed settings are optional backup/comparison tools. Compare actual destinations/settings with the summary and the Hub connection results; saving links does not pass reviews.
3. **Check attendance and finances:** Real handoff reviews actual data, approvals, reconciliation and readiness evidence. Practice uses isolated copies for the guide’s five fictional cases and budget inputs; never enter these in Real files.
4. **Check calendar and messages:** Real handoff reviews approved events/drafts. Practice uses fictional previews and an unsent MOCK issue. Keep progress, private links and editable newsletter as separate backups; verify assigned recovery with the three-file guide.
5. **Real — Approve and start the year:** only after required reviews, incoming acceptance and launch approval, the authorized owner sets verified new-row active/current TRUE and Points Config!B5 LIVE at the approved time; sets the previous year’s is_current FALSE preserving records; rechecks Hub, website, Form and newsletter. **Practice — Close and review your practice run:** keep TESTING, closed intake/events and inactive/noncurrent settings; record activation Skipped — Rehearsal only, reviewed retention/cleanup and the recorded practice result.

## Managed annual connections and event updates

[Google documents](https://developers.google.com/apps-script/api/how-tos/execute#limitations) that the execution API cannot create triggers. The Hub therefore checks read-only; explicit connect/stop executes through `google.script.run` on the separately deployed chapter-only Google page.

After create/reopen, choose Hub **Check connections**. A fresh matching report reveals **Open event update controls**, bound to the checked year, purpose, run key and configuration revision. Choose **Connect automatic event updates** on that Google-hosted page, then return and check again. Google-hosted `google.script.run` performs trigger changes in the authorized standalone chapter project; the Hub API cannot create triggers. Open the two exports and choose Google’s **Allow access** only for their matching annual source when requested, wait for calculation, then check connections again. Routine Real handoff does not require fictional scoring inputs or an expert certificate.

`checkAnnualReadiness` reads the saved annual identities, eight nonmanual Points structure checks, the reviewed six/35 import-cell map and matching Config pointers, error-free output headers, and the recorded managed trigger. On the Google-hosted page only, `enableAnnualEventUpdates` performs initial sync and installs one standalone `asmeAnnualEventsEdited` trigger for this workbook. Its **installed** state is separate from **observed** delivery after an actual Google Sheets Events edit. Neither operation opens intake, changes scoring inputs, publishes or launches the year. The report’s `ready` result is limited to connections/structure; it does not certify every source input, scoring formula, financial balance, public fields or officer approval.

The read-only API check and the Google-hosted connection/update actions accept the saved `{year, mode, expectedConfigRevision, expectedRunKey}` identity. Before stopping, the Hub first requests a read-only check with `action: "stop"`; its `readScope: "retirement"` is distinct from normal `readScope: "staging"`, allowing historical LIVE output while requiring the closed noncurrent identity. The server checks chapter ownership, private sharing, saved file identities and the matching annual run. Keep saved properties and run records intact when deploying an update. The Google-hosted `stopAnnualEventUpdates` action additionally requires `confirmStop: true`, a closed Form and a noncurrent year; it removes only that run’s recorded trigger UID. A quota error asks officers to retire an eligible old connection explicitly; it never deletes arbitrary triggers. Other bound projects’ and other accounts’ triggers remain outside this report’s visibility.

## Clear Test Data

The menu previews the sheet-row and Form-response counts and asks the operator to confirm removal. If both counts are zero, it instead reports that there is no test attendance to clear, without a removal confirmation or a new backup. All safety checks still run first. It requires TESTING, closed intake, closed event checkboxes and the exact annual Form/destination/response-tab binding. Every nonempty source row and every Form response must reference an event whose ID or name starts with `MOCK`. Mixed real/unmarked attendance, unknown events, formulas in raw input, wrong destinations and changed previews stop cleanup before removal.

The action archives raw rows, Form response IDs/timestamps/email/answers and metadata in `_Test_Backup_…`, verifies the backup by reading it back, and rechecks the unchanged source before clearing. It deletes only the reviewed Form response IDs, rechecks the sheet and closed TESTING state, then clears only A:L beneath the response header. An unexpected response or changed sheet stops cleanup; the verified backup remains available. Roster, Point Log and proxy formulas are preserved. Event definitions, adjustments and budget inputs retain their own review/cleanup procedure. Intake remains closed and Points TESTING.

Archived JSON dates use `{ "type": "date", "value": "…ISO timestamp…" }` for spreadsheet reconstruction. The archive preserves evidence; **original Google Form response IDs cannot be restored**. Keep the backup private until its retention decision. If cleanup stops after backup, inspect both stores and the archive before retrying. Repeating cleanup after all test attendance has been removed creates no additional archive.

## Template architecture

The canonical Points template requires a protected `_Raw_Ingest` query reading Config B7, with Roster/Point Log using stable proxy references. All six Points and 35 Budget import formulas read Config B1. The chapter Budget template's actual Huntington opening balance is **Setup & Lists B7**, and its ledger columns differ from the illustrative specification. Preserve the previously verified chapter formula rather than applying the example's B6/column mapping.

Source delivery, Google installation and web deployment are separate. Verify installed source, provision an isolated set of annual files, retry without duplicates, resolve imports, observe an automatic event edit, run pre-flight and exercise cleanup before intended production use.

## Student rehearsal instructions

Use [the student walkthrough](../../../docs/officer-transition/student-walkthrough.md) for the exact order, five cases, expected results and stop conditions. Connected setup saves all seven links automatically; the manual fallback uses **Copy setup results**, then **Paste setup results → Save setup results** in Step 2. The readable detailed summary supplies expected comparisons; it does not certify fresh Google values. **Download private links backup** is an optional later backup. Google Form copies may need **Publish** before testing; restrict responders to approved testers first. Publishing and accepting responses are separate controls. After testing, close acceptance even if the Form remains published.

## Saved workspace and annual questions

The private setup app receives only year and purpose in its URL. It reads the previous-year goal from its configured settings sheet, or the saved setup for an existing year. The annual goal is used for that year without changing the chapter default. It checks the loaded configuration identity and revision before writes and again under its script lock; another tab’s changes require reloading.

Older unclassified workspaces are not automatically trusted as Real handoff. The President confirms Practice explicitly or configures a separate reviewed Real workspace. New saved runs retain their purpose; Practice files cannot be relabeled as Real. These confirmations do not activate the year or approve funding, access or launch.


### Run setup inside Hub Step 2

The Hub can call these existing guarded functions directly through Google OAuth and an API executable deployment. See [HUB_API_SETUP.md](HUB_API_SETUP.md) for the one-time chapter configuration and acceptance checks. Until that configuration is completed, the private setup page remains the manual fallback.
