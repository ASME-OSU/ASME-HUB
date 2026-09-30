# Private annual settings draft append

Install both `AnnualSettingsDraftEngine.gs.example` and `AnnualSettingsDraftRunner.gs.example` in the same private standalone Google Apps Script project as AnnualCopyEngine and AnnualSetupEngine. Use the setup runner's manifest with Drive, Sheets, Forms and user email scopes. Run as the effective Google officer with edit rights. This is a private editor action, not a deployed Hub endpoint. Preview performs Google reads and never writes. No production year append has been performed by adding these examples.

After both annual setup phases have been approved and read back, put its exact observed `AnnualSetupEngine.handoff` result in private Script Property `ANNUAL_LINK_HANDOFF`. The writer independently repeats configuration readback from the private copy ledger, reads Google MIME/identity and FormApp URLs/destination, and requires the copied Form to remain closed. Pasted IDs or URL patterns alone do not prove newly created resources.

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

These are illustrative selections; inspect actual export tabs and intentionally choose each field and a fixed timestamp. The writer never copies current-year values implicitly. The target year must be consecutive within 2000–2199. Current and historical rows must have exact A:T headers, literal values, unique valid years and explicit flags, with exactly one active current year.

Run `previewAnnualSettingsDraft` privately and inspect `headers` and the exact 20 values in `row`. The Control Center's entire workbook is publicly readable: Points Master and budget tracker URLs themselves become public references, even if the target files require authorization. Confirm the intended public audience of every field, including any dashboard, banking or fundraising URL. If any operational reference must stay private, stop before approving and design a separate private authority/public projection. A hidden tab does not solve whole-file sharing.

Only after inspecting that exact preview and public audience, set private `ANNUAL_SETTINGS_DRAFT_APPROVAL`:

```json
{"year":"2027-2028","digest":"EXACT_PREVIEW_DIGEST","publicLinkReview":true,"reviewNote":"Describe the actual public audience review performed"}
```

Run `appendOrReadbackAnnualSettingsDraft`. It appends only an inactive, noncurrent row, durably journals pending intent first, then independently reads all values back and verifies the existing rows stayed unchanged. A repeat with the identical journal and exact Google row performs readback only. A changed row, duplicate target, changed plan, missing target after an uncertain attempt or unknown outcome blocks further appends. Preserve the journal and inspect Google; never delete a pending intent to force retry. Existing target rows cannot be replaced by this writer.

The same project lock serializes its annual engines; direct human edits and other projects do not participate, so coordinate editing during confirmation. The journal uses a separate private Drive JSON ledger, so additional years do not exhaust a Script Property. Provision it with {"schema":1,"runs":{}} and preserve it on every resume. Its owner, edit capability and private user-only permissions are checked before reads and writes. No audit tab is placed in the public workbook. Approval and snapshots stay private.

A matched draft readback proves this append's literal values, not activation, export privacy, publishing, sharing, scoring, import authorization or any manual readiness check. Perform those separately in isolated fixtures before a production annual append. This writer never opens responses, activates a year, changes sharing or marks checks PASS.
