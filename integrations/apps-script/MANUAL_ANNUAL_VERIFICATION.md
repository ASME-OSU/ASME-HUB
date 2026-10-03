# Private verification of manually copied annual resources

Install the ManualAnnualVerification engine and runner alongside the existing annual engines and authenticated save page. The administrator enables manual mode by storing the reviewed rules below in a separate chapter-owned private Drive JSON file, then setting **ANNUAL_MANUAL_SETTINGS_CONFIG** to `{"schema":1,"intendedOwner":"chapter-account@example.org","rulesFileId":"REVIEWED_PRIVATE_RULES_JSON_FILE_ID"}` in that same private project's Script Properties. The full formula inventory stays in Drive because a Script Property value is limited to 9 KB. The service authenticates the chapter actor and verifies this rules file’s owner, MIME, private permissions and 250 KB size bound before reading it. With this property absent, the existing copy/setup journal mode is used. Keep production and rehearsal targets separate.

The private configuration fixes the chapter owner, consecutive selected year, allowed annual root folder, excluded canonical source and active-year original IDs, workbook schemas, exact export formula inventory and separate draft target/ledger. The Hub transfer selects seven links and eleven public row values; it cannot select the settings workbook, journal, trusted rules or owner. The verifier reads actual Google resources and builds its own canonical handoff. It never creates a fake copy/setup journal.

Rules-file configuration shape (replace all placeholders with reviewed values):

```json
{
  "schema": 1,
  "year": "2027-2028",
  "intendedOwner": "chapter-account@example.org",
  "annualRootId": "REVIEWED_PRIVATE_ANNUAL_ROOT_ID",
  "excludedSourceIds": ["POINTS_MASTER_SOURCE_ID", "FORM_SOURCE_ID", "POINTS_EXPORT_SOURCE_ID", "BUDGET_TRACKER_SOURCE_ID", "BUDGET_EXPORT_SOURCE_ID"],
  "publicExportReadersAllowed": true,
  "points": {"term": "Fall 2027"},
  "responseHeaders": ["THE_EXACT_TWELVE_REVIEWED_RESPONSE_HEADERS"],
  "schemas": [
    {"resource": "pointsMaster", "sheet": "Events", "headers": ["EXACT_REVIEWED_HEADERS"]},
    {"resource": "budgetTracker", "sheet": "Transactions", "headers": ["EXACT_REVIEWED_HEADERS"]},
    {"resource": "pointsExport", "sheet": "Leaderboard_Public", "headers": ["EXACT_REVIEWED_HEADERS"]},
    {"resource": "pointsExport", "sheet": "Event_Metrics_Public", "headers": ["EXACT_REVIEWED_HEADERS"]},
    {"resource": "budgetExport", "sheet": "Budget_Public", "headers": ["EXACT_REVIEWED_HEADERS"]}
  ],
  "imports": {
    "pointsExport": [{"sheet": "REVIEWED_TAB", "a1": "A2", "formulaTemplate": "=IMPORTRANGE(\"{{SOURCE_ID}}\",\"REVIEWED_SOURCE_RANGE\")"}],
    "budgetExport": [{"sheet": "REVIEWED_TAB", "a1": "A2", "formulaTemplate": "=IMPORTRANGE(\"{{SOURCE_ID}}\",\"REVIEWED_SOURCE_RANGE\")"}]
  },
  "draft": {
    "schema": 1,
    "year": "2027-2028",
    "controlCenterId": "REVIEWED_SETTINGS_WORKBOOK_ID",
    "sheetName": "Hub_Settings_Public",
    "ledgerId": "SEPARATE_PRIVATE_MANUAL_DRAFT_JSON_LEDGER_ID",
    "draftTimestamp": "2026-10-02T00:00:00Z",
    "values": {"USE_ALL_ELEVEN_FIELDS": "as documented in ANNUAL_SETTINGS_DRAFT.md"}
  }
}
```

This is a shape, not a runnable configuration. Review the exact source schemas and enumerate **every** import formula cell before provisioning it. For Points Export tabs whose headers currently show an import error, read the reviewed header contract from the corresponding Points Master staging tab (Website Staging for Leaderboard_Public; Dashboard Staging for Event_Metrics_Public). The copied export must resolve to those exact headers. Never certify an error string as a header schema.

The current templates have six Points import cells and thirty-five Budget import cells; one cell can contain several IMPORTRANGE calls. Formula templates must preserve the reviewed formula exactly, replacing only its intended private copied-master ID with `{{SOURCE_ID}}`. Provision the separate chapter-owned private JSON draft ledger with `{"schema":1,"runs":{}}`. Preserve all existing copy, setup and automated-draft ledgers.

Verification requires all six resources to be distinct, editable, chapter-owned My Drive resources with user-only permissions. When the trusted rules set `publicExportReadersAllowed: true`, the two reviewed exports may additionally have anyone-reader permission; public writers, domain grants and public master/folder access are rejected. Publication and the actual content of every export tab still require officer review. The annual folder must descend from the trusted root; all five files must descend from that annual folder. Original master IDs and wrong Google file types are rejected. The Form must be closed, have the observed editor/respondent links, and send responses to the copied Points Master. Exactly one linked response tab must have the twelve expected headers and no leftover test rows. Points Config must match the selected term/year, TESTING or PAUSED status, actual response tab and Form ID; budget dates must follow the selected aligned convention: August 1–July 31 annually, August 1–December 31 Fall and January 1–May 31 Spring. The separate Points/monthly boundary check must confirm August–July reporting, Spring through May and Summer June–July; the verifier does not infer those formula semantics from the Budget dates. All four workbook schemas and the selected public export tabs must match. Every export import formula/cell must match the private inventory and point only to its copied master. Stale source IDs in formulas or Read Me spreadsheet links are rejected.

Unused Control Center rows with only blank or unchecked active/current cells remain part of the exact settings baseline. They are not interpreted as academic years; any other blank-year content or enabled flag blocks saving.

My Drive root IDs can be shorter than copied-file IDs; ownership, editability and folder MIME are still checked independently. Google metadata object-key and permission ordering are canonicalized before hashing so equivalent responses do not invalidate an unchanged review.

A digest binds the actual resource snapshot and private rules to preview and save. The preview reuses the canonical handoff observed under its own lock; saving repeats the read-only verification under the same project lock, then uses the existing journaled append and exact readback engine. Any changed rule, file identity, formula, settings baseline or row stops the save. A repeat of an unchanged verified row performs readback only. The new year stays inactive and noncurrent.

Google structure verification does not certify bound script source/properties/triggers, response delivery/scoring, import authorization, public export content, financial totals or officer access. Officers still perform those guide checks and reconcile the rehearsal response before saving. The service never marks a manual check PASS, opens responses, changes sharing or activates a year.
