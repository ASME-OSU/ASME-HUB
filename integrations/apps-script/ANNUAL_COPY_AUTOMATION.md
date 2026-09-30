# Private annual copy runner (optional S13)

This is a local, undeployed implementation. It creates private annual folders and native Google copies, with preview and interrupted-run reconciliation. It does not certify masters or establish annual readiness. Use the manual guide until setup and live gates pass.

Run one standalone Apps Script project manually in its editor, with Google authorization. Share that project privately with current officers as needed and confirm each officer's effective Drive rights. There is no web deployment, public write endpoint, Hub phrase authorization, client OAuth token, or role restriction. An execution creates My Drive files owned by the executing Google account: `intendedOwner` must match the effective account. Google email identities are trimmed and compared in lowercase for executor/source/result ownership; aliases, plus tags and distinct addresses are not collapsed. Exact saved configuration remains immutable on resume, including its original spelling. To retain chapter-account ownership, that account must execute. Other officers can edit private setup and working resources through their actual Google permissions, but the chapter account executes this version to preserve chapter ownership; ownership transfer and future-owner access require their own verified process. Shared drives are deliberately unsupported in this version.

## Concrete setup

1. Inspect and version a genuinely clean source. Current annual files and cleaned rehearsal copies are not automatically certified masters. Remove private records and year-specific inputs, inspect formulas, scripts, triggers, external imports and form settings, record review notes, and capture exact Drive ID/name/MIME/version/owner. This automation compares identity/version; it cannot infer whether a workbook is clean.
2. Confirm a private My Drive destination folder and intended owner. All effective permissions must be individually named Google users. Domain, anyone, groups, unknown permission identities and shared drives fail preflight. It checks returned permissions on the destination, ledger, sources and each new result. Domain restrictions and inherited access still require live verification. Do not use a public Control Center/audit tab for the ledger.
3. Provision a private `application/json` ledger file, contents `{"schema":1,"runs":{}}`, in a private location. Record its ID privately. Preserve it permanently and back it up through authorized Google version/export practices. Do not recreate an empty ledger to retry. The runner never bootstraps it automatically.
4. Create ONE private standalone Apps Script project. Paste `AnnualCopyEngine.gs.example` and `AnnualCopyRunner.gs.example` as separate `.gs` source files; install the example manifest; enable advanced Drive v3 and the associated Cloud Drive API where required. Broad Drive scope is required by the DriveApp ledger adapter for existing source files; inspect the code and Google's consent screen before granting. No installable trigger or deployment is required.
5. Set private Script Property `ANNUAL_COPY_CONFIG` to JSON of the shape below. Configure IDs/emails only in Google; keep this public source generic. Keep one project, namespace and ledger for the chapter. Script locks coordinate only executions in that same project. A second project or manually edited ledger bypasses that concurrency boundary; prohibit parallel independent runners and direct ledger edits while execution is possible.
6. Select `previewAnnualCopies`, authorize as the intended copied-file owner (grant both requested Drive and email scopes), Run/Debug and inspect the returned object privately. The return contains file IDs; do not copy it into public execution logs, Hub progress exports or public status. The runner first calls `ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL)`; missing granular-consent grants stop execution and request consent in the Apps Script IDE before configuration, locking or Google I/O. An “Authorization successful” message alone does not establish that every requested scope was granted. Preview performs metadata/ledger reads with a lock and no external writes.
7. Review the full plan, source certificates, intended ownership and folder audience. Select `createOrResumeAnnualCopies` only for the authorized isolated target. Run it again unchanged to test exact ID reuse. Save private execution evidence and verify returned Google IDs independently. No public sharing or deletion is part of this runner.

Example shape, placeholders only (replace the entire config privately):

```json
{
  "schema": 1,
  "namespace": "chapter-annual",
  "year": "2027-2028",
  "parentId": "PRIVATE_PARENT_ID",
  "ledgerId": "PRIVATE_JSON_LEDGER_ID",
  "intendedOwner": "owner@example.test",
  "items": [
    {"key":"annual","kind":"folder","parentKey":"root","name":"ASME 2027-2028"},
    {"key":"pointsFolder","kind":"folder","parentKey":"annual","name":"Points"},
    {"key":"points","kind":"copy","parentKey":"pointsFolder","name":"ASME Points Master — 2027–2028",
      "source":{"id":"CLEAN_SOURCE_ID","name":"Clean Points Master","mimeType":"application/vnd.google-apps.spreadsheet","owner":"owner@example.test","version":"CAPTURED_DRIVE_VERSION","cleanReviewed":true,"reviewNote":"Private source review reference and version notes"}}
  ]
}
```

Supported copy MIME types: native Google Sheets, Forms and Docs. Declare folders before their children. Use additional operations for Attendance, Points Export, Finance tracker/export and private draft settings as appropriate, once their clean sources pass review. At most 20 operations per plan; long runs can resume unchanged after the execution limit. Names are configurable and never used as identity.

## Durable state and recovery

The Google JSON ledger binds the exact configuration to the year; changed names, sources, owner, parent, namespace or config order are conflicts. Private per-file appProperties mark each operation in the same Google API application. Before a non-idempotent folder/copy request, persist and read back a pending intent. Once a result passes owner/parent/name/type/marker/privacy checks, persist its stable ID. An unchanged resume verifies every recorded file and searches all marker-result pages to detect missing/duplicate identities.

A timeout, execution termination or ledger acknowledgement failure stops work. On resume, one matching candidate can be reconciled; multiple candidates, incomplete search, a mismatched result or zero candidates for a pending operation block. **Zero search results are not proof that Google never created the file.** The runner never blindly retries pending creation, never deletes candidates, and never resets the ledger. Native Google copy calls have no idempotency guarantee here.

For an unknown outcome, stop all runners, preserve the ledger, inspect the private Google execution/request evidence and relevant Drive files, wait for indexing where appropriate, then resume unchanged to reconcile a visible valid marker. If the outcome remains unknown, keep the step blocked. A reviewed operator repair of the private ledger is an exceptional manual action, requiring evidence of what occurred, preserved prior content, and no concurrent runners; no automatic “clear pending” method is supplied. Source changes require renewed certification and a reviewed migration of the existing run, never a new namespace/empty ledger to force creation.

Metadata preflight is a snapshot. A source can change between read and copy; inspection of new copies and live privacy checks remain mandatory. Locking covers this project's runs, not direct Drive or ledger edits. Post-create privacy failure leaves the operation pending for investigation, since a file may already exist. Do not interpret an exception as proof of rollback. Permission changes are never attempted as automatic repair.

## Manual integration gates

Copying preserves native structure and may preserve stale references. It does not relink a Form, authorize IMPORTRANGE, reset every embedded reference, copy/install Apps Script triggers, validate public fields, publish exports, or write/activate Control Center settings. Form edit/respondent URLs must be read and verified in the copied Form; a Drive ID is not a verified respondent URL. Use the separate read-only Form destination validator, inspect actual Responses destination, perform authorized synthetic delivery/processing, reconcile test cleanup, repoint/authorize imports, verify finance totals and privacy, then save inactive/noncurrent draft annual references through authorized Google editing and independent readback. V02–V10 remain separate checks. Public release and activation require their own authorized action. A successful creation result establishes only private file identities.

## Local verification and live acceptance

`node --test test/annual-copy-engine.test.mjs test/annual-copy-adapter.test.mjs` exercises the exact engine and Apps Script adapter with fake Google I/O. Tests cover dry run, repeat ID reuse, timeout after creation, missing/ambiguous candidates, intent/commit acknowledgement loss, plan conflict, source change, permissions, effective identity, lock failure and post-copy failures. These tests do not establish deployed Google behavior.

Minimum live smoke: provision the private ledger/project, certify one synthetic clean native Sheet under the existing private rehearsal folder, plan one annual subfolder plus one copy, preview (confirm no files/ledger changes), create, independently verify distinct source/result IDs and private parent/owner/access, rerun unchanged and prove exact ID reuse. To test interruption safely, run an isolated fixture adapter that deliberately throws immediately after a real copy and before the engine receives the result; preserve the marker and pending ledger, resume with the standard adapter, and prove reconciliation without a second copy. Do not add a fault hook to production execution. Concurrent executions must demonstrate the script lock, and a deliberately unknown pending/no-candidate fixture must remain blocked. Document incoming-officer Google execution/access separately.

Official basis: [required granular consent](https://developers.google.com/apps-script/reference/script/script-app#requireAllScopes(AuthMode)), [native copy and inherited permissions](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy), [Script locks](https://developers.google.com/apps-script/reference/lock/lock-service), [application-private file properties](https://developers.google.com/workspace/drive/api/guides/properties), [Google authorization and execution identity](https://developers.google.com/apps-script/guides/services/authorization), [Drive capability and owner metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files). Reviewed September 30, 2026.
