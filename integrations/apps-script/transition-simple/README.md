# ASME annual setup

The standalone provisioner creates six folders and five annual template copies, observes the actual Form response tab, configures export pointers and budget dates, and appends exactly one inactive/noncurrent settings row. Repeating a year in the same workspace and Control Center resumes the interrupted run or verifies its existing draft. Practice and production roots keep separate saved runs. A completed retry refuses changed bindings, open intake or LIVE state instead of resetting them.

## Install once

1. Sign in as `asmeohiostate@gmail.com`. In a separate standalone Apps Script project, install `AnnualProvisioner.gs`, `EventSync.gs`, `SanityCheck.gs` and `ProvisionerWeb.gs`. Create an HTML file named **ProvisionerPage** with `ProvisionerPage.html`. Use the supplied `appsscript.json.example` manifest. Keep this project separate from the older settings service, which has another `doGet`.
2. Deploy as a web app with **execute as the user accessing the app**, **access only myself**. Open it as the chapter account and authorize the Google services. Use a browser profile signed in only to the chapter account; Google documents that multiple simultaneous Google sign-ins are unsupported for Apps Script web apps (https://developers.google.com/apps-script/guides/support/troubleshooting).
3. Open **Change saved workspace — President or maintainer** and paste the private annual workspace folder, intended Control Center, approved positive engagement goal and optional HTTPS calendar feed. Explicitly choose Real handoff or Practice only and save the setup. Existing workspace purpose cannot be switched. For rehearsal, use a private practice root and copied Control Center. No manually entered script properties are needed.
4. Put the app's verified `/exec` URL in `ASME_HUB_CONFIG.annualProvisioner.url`, separate from `annualSettingsSave.url`. Step 2 then displays **Open Annual Setup**.
5. Install `EventSync.gs`, `SanityCheck.gs` and **TestCleanup.gs** in the Points template's bound project. Preserve existing scoring handlers and reconcile any existing `onOpen` into one menu handler. The bound project needs the supplied OAuth scopes; only the standalone project needs the `webapp` manifest entry. Annual copies inherit the bound files. Reload a copy to see **ASME Tools**.

The existing editor routes remain `provisionReviewedAnnualYear('2027-2028')` and `provision2027_2028()`.

## Five officer steps

1. **Choose your year:** answer the year/purpose questions and confirm setup/account access.
2. **Prepare this year’s files:** the saved chapter workspace and calendar are reused. Last year’s goal is a suggestion; the President approves the new goal. Existing years reopen with their original goal. Choose Copy setup results, paste them into Step 2, and save all seven links at once. A download is not required. Everyone uses the same files. Open the five working files. Intake stays closed, Points TESTING and the settings row inactive/noncurrent.
3. **Export Access & Test Check-in:** allow matching Points/Budget imports. In an isolated set of private practice files, create events whose ID or name begins with `MOCK`, sync them and complete all five fictional cases in the guide (first profile, duplicate, returning member, missing profile, late profile). Verify five arrivals, A’s annual 13 points and B’s 8; Fall totals are 5 and 0. Close intake again and run **Pre-Flight Sanity Check**. Enable automatic event sync once per annual copy.
4. **Communications & Calendar:** confirm the chapter calendar, website annual links, newsletter sender/reply-to and approved postal address.
5. **Activation & Go-Live:** close intake and event `form_open` checkboxes. Use **Clear Test Data** in the test files, resolve required reviews, then have the authorized owner set Points LIVE and the verified Control Center year active/current at the approved time. Retire the former current-year flag. Practice stays TESTING and inactive.

## Clear Test Data

The menu previews the sheet-row and Form-response counts and asks the operator to confirm removal. It requires TESTING, closed intake, closed event checkboxes and the exact annual Form/destination/response-tab binding. Every nonempty source row and every Form response must reference an event whose ID or name starts with `MOCK`. Mixed real/unmarked attendance, unknown events, formulas in raw input, wrong destinations and changed previews stop cleanup before removal.

The action archives raw rows, Form response IDs/timestamps/email/answers and metadata in `_Test_Backup_…`, verifies the backup by reading it back, and rechecks the unchanged source before clearing. It deletes only the reviewed Form response IDs, rechecks the sheet and closed TESTING state, then clears only A:L beneath the response header. An unexpected response or changed sheet stops cleanup; the verified backup remains available. Roster, Point Log and proxy formulas are preserved. Event definitions, adjustments and budget inputs retain their own review/cleanup procedure. Intake remains closed and Points TESTING.

Archived JSON dates use `{ "type": "date", "value": "…ISO timestamp…" }` for spreadsheet reconstruction. The archive preserves evidence; **original Google Form response IDs cannot be restored**. Keep the backup private until its retention decision. If cleanup stops after backup, inspect both stores and the archive before retrying. Repeating cleanup after all test attendance has been removed creates no additional archive.

## Template architecture

The canonical Points template requires a protected `_Raw_Ingest` query reading Config B7, with Roster/Point Log using stable proxy references. All six Points and 35 Budget import formulas read Config B1. The chapter Budget template's actual Huntington opening balance is **Setup & Lists B7**, and its ledger columns differ from the illustrative specification. Preserve the previously verified chapter formula rather than applying the example's B6/column mapping.

Source delivery, Google installation and web deployment are separate. Verify installed source, provision an isolated set of annual files, retry without duplicates, resolve imports, observe an automatic event edit, run pre-flight and exercise cleanup before intended production use.

## Student rehearsal instructions

Use [the student walkthrough](../../../docs/officer-transition/student-walkthrough.md) for the exact order, five cases, expected results and stop conditions. The text setup summary is readable evidence, not an importable Hub JSON file: manually paste its seven links into the Hub and save, then download the Hub private links backup. Google Form copies may need **Publish** before testing; restrict responders to approved testers first. Publishing and accepting responses are separate controls. After testing, close acceptance even if the Form remains published.

## Saved workspace and annual questions

The private setup app receives only year and purpose in its URL. It reads the previous-year goal from its configured settings sheet, or the saved setup for an existing year. The annual goal is used for that year without changing the chapter default. It checks the loaded configuration identity and revision before writes and again under its script lock; another tab’s changes require reloading.

Older unclassified workspaces are not automatically trusted as Real handoff. The President confirms Practice explicitly or configures a separate reviewed Real workspace. New saved runs retain their purpose; Practice files cannot be relabeled as Real. These confirmations do not activate the year or approve funding, access or launch.
