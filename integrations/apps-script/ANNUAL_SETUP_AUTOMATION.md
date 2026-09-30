# Private annual setup and link handoff

Implementation for owner-editor execution in the same private Apps Script project as the copy runner. Local tests do not certify live Google behavior. Complete the isolated rehearsal before configuring real annual resources.

## What officers can do

In the guide, open **Annual links and automation handoff**, or choose **Enter annual links** on a copy/setup step. Paste the copied-file links or import the private runner's JSON. **Check and save links on this device** validates file URL types, the selected year, known master identities and duplicate file IDs. It does not check Google permissions or a Form connection. **Prepare Year Settings draft** fills the Hub form inactive/noncurrent. Google is still authoritative; this browser action does not write Google.

Changed saved links reopen affected reported checks. Link drafts are separate from progress exports and printing. They are stored in the browser profile: use a private officer device. A respondent Form URL must come from Google; do not construct it from the editor ID.

## Install privately

Add AnnualSetupEngine.gs.example, AnnualSetupRunner.gs.example, AnnualSettingsDraftEngine.gs.example and AnnualSettingsDraftRunner.gs.example alongside AnnualCopyEngine and AnnualCopyRunner. Install AnnualSetupRunner.appsscript.json.example. No web deployment is needed. This adds Forms and Sheets scopes to the existing Drive/email grants. The owner must review and consent to those new grants before execution. The scripts perform no publication, sharing, trigger installation, import-access grants, submission, deletion or activation.

Keep actual source IDs, immutable copy plans, review notes and approvals in private Script Properties. Public source files contain no private execution configuration.

## Copy and configure

1. Use the copy runner's existing immutable folder/native-copy plan and durable private JSON ledger. Plan an annual root and Attendance, Points, Finance, Communications and Transition Notes folders; copy the five master files into the appropriate folders. Certify input/source identity and version; inspect every copied bound script, property and trigger before configuration.
2. Set ANNUAL_SETUP_CONFIG with schema:1, year matching ANNUAL_COPY_CONFIG, resources mapping the names pointsMaster, attendanceFormEditor, pointsExport, budgetTracker, budgetExport and annualFolder to exact copy-operation keys. For each copied file, reviews[key] must record boundScriptsReviewed:true, propertiesAndTriggersReviewed:true, safeForConfiguration:true, sourceVersion and a nonempty reviewNote. These are officer assertions, never inferred from a filename.
3. Set points:{oldResponseTab:'Form Responses 2',term:'Fall YYYY',academicYear:'YYYY-YY'}. Set exports.pointsExport and exports.budgetExport to {sourceId:the respective master workbook ID,expectedFormulaCells:reviewed count}. Prepared current masters contain six Points Export import formulas and 34 Budget Export import formulas. Reinspect if the source changes.
4. Keep the copied Form closed and Points TESTING. Run previewAnnualDestination. Inspect the result privately, then set ANNUAL_SETUP_APPROVAL to {year,phase:'destination',digest:exact preview digest}. Run configureAnnualDestination. It links only an unlinked copied Form; an unexpected existing destination blocks. Readback confirms the actual workbook.
5. Run previewAnnualWorkbooks after Google creates the actual response tab. It requires one linked tab with the expected twelve headers and no responses. Review exact changes, set approval {year,phase:'workbooks',digest}, then configureAnnualWorkbooks. This updates response formula references, Config year/term/tab/Form ID, six budget dates, and export source IDs. Opening cash and the manual Huntington balance snapshot are preserved.
6. Run exportAnnualLinkHandoff after both configured phases pass fresh readback. Inspect result privately with a breakpoint and save its JSON in a private file for the guide. The handoff includes Google-observed Form editor/respondent URLs and real copied-file links. It does not certify import access, delivery/scoring, public fields, funding or incoming service access.

All mutation intents are acknowledged in the private copy ledger before writes. An uncertain result is reconciled by actual readback; a pending operation with a different or unchanged baseline blocks rather than blindly repeating a Form link or configuration write.

The prepared Points template has no installed event synchronization script. Enter/review event options manually until that separate integration is implemented and tested. The annual Form's visible title, description, events and publication still need officer review.

## Optional Google settings draft

Provision a separate private application/json draft ledger, initially {"schema":1,"runs":{}}. Do not reset it to retry. Set ANNUAL_LINK_HANDOFF to the exported JSON. Set ANNUAL_SETTINGS_DRAFT_CONFIG with schema:1, year, exact controlCenterId, sheetName:'Hub_Settings_Public', ledgerId for that separate ledger, fixed ISO draftTimestamp, and values containing every field listed below (explicit blanks are allowed):

- display_label, engagement_goal, leaderboard_tab, dashboard_json_url
- calendar_page_url, calendar_ical_url, status_note, event_metrics_tab
- budget_export_sheet_tab, banking_url, fundraising_url

Run previewAnnualSettingsDraft and review all twenty cells. The whole real Control Center is publicly readable: approve every literal and link for that audience. Set ANNUAL_SETTINGS_DRAFT_APPROVAL to {year,digest,publicLinkReview:true,reviewNote}. appendOrReadbackAnnualSettingsDraft rechecks the private handoff, exact headers and current flags, journals intent, appends one inactive/noncurrent row and reads it back. It never overwrites existing rows. Exact completed repeats reuse the row. Conflicts, unknown append outcomes and concurrent changes block. Use a private Control Center copy for the first rehearsal; do not point fixture configuration at production.

The existing current active year is preserved. Actual activation stays with the incoming team's reviewed handoff.

Official API basis: [Google Form destination and URL methods](https://developers.google.com/apps-script/reference/forms/form), [Spreadsheet operations](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app). Reviewed September 30, 2026.
