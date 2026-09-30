# Settings editing and future write contract

The supported shared-edit path is Google Sheets under each officer's Google authorization. All current officers are eligible to edit; role filters and the public Hub phrase are not authorization. Effective edit access must be verified per officer. The client has no write endpoint and the legacy example refuses all requests. Existing deployed services have not been inspected or revoked by this local change.

## Direct edit and readback

Use the Control Center `Hub_Settings_Public` A:T schema, one row per academic year. Preserve headers, historical rows, and the current year while preparing a draft. Before editing, preserve a recoverable version and compare the latest cells with your intended changes; coordinate concurrent edits. Google version history covers direct edits, which are outside any future service audit. After Google reports saved, use **Compare with Google**. The comparator reads the public source afresh with a cache-busting request, bypasses fallback and preview data, checks headers/duplicates/current-year invariants, and compares the form fields even for inactive draft rows. Matching readback proves only what this response returned at that time; public feed propagation can lag. Timestamp, status, and event metrics tab columns are not compared because the form has no inputs for them; inspect those three cells in Google. A fresh tab without previews and independent consumer checks are still required.

A timeout, inaccessible sheet, malformed response, missing year, duplicate, invalid flag, or differing field must never report a shared save. Preserve the draft and inspect Google before retrying. Never retry a write based only on a read timeout. Restore affected cells from a known version only after reconciling concurrent edits; a whole-workbook restore can undo unrelated work. Recheck readback and independent consumers after recovery. Do not change the active year as a diagnostic step.

The current workbook's whole-file public sharing is a privacy boundary, including hidden/audit tabs. Only intentionally public values belong there. Private operational references, officer identities, secrets, and payload audits require a separate private authority; adding a hidden tab is insufficient. Do not expand the public schema until each field's intended audience is established.

## Requirements before a protected Hub writer is implemented

1. Prove deployed Google identity and effective authorization for all current officers, deny anonymous/nonofficer access server-side, and document ownership continuity. Never accept a client digest, role selector, or shared phrase as authority; never collect Google passwords in Hub.
2. Store private configuration and audit records privately. Publish only an explicit public allowlist into the compatible projection. Resolve duplicate consumer sources before migration. Keep A:T consumers working until independently tested.
3. Accept authenticated mutations using a protected method and validated schema, never JSONP/GET writes. Reject unexpected fields and formula injection. Bind CSRF protection to the authenticated session where applicable.
4. Require `requestId`, `yearKey`, `baseRevision`, and a validated patch. Use a server-controlled durable revision, not `NOW()` or client timestamps. Under a transaction/lock, compare the current revision before mutation; stale revision returns conflict and current authorized revision without overwriting. Direct Sheet changes must participate in revision detection or the writer must be disabled while direct edits are allowed.
5. Make request IDs idempotent. Track pending/committed/publication-pending states durably; a lost response is an unknown outcome, not a failed write or permission to repeat it. Reconcile by request ID and authorized readback before retry. Partial writes must have a documented repair path.
6. Keep draft updates separate from explicit activation. Reject duplicate keys and enforce exactly one active/current designation across the dataset. Return committed revision and canonical field values; independently read that revision back before claiming verified persistence. Track public projection readback separately from private commit success.
7. Record authenticated editor, server time, changed fields, revisions and request ID in private audit storage. Compare-before-restore uses the same authorization and revision requirements. Direct edits remain identified as outside service audit coverage.
8. Verify unauthorized, revoked, expired, conflict, duplicate request, timeout-after-commit, projection failure, validation failure, concurrent direct edit, restore conflict, and noncurrent draft cases in an isolated environment before deployment. Record actual deployed behavior and future-owner access.

This contract is not an implemented writer. Live access, publication privacy, and recovery rehearsal remain deployment/annual-readiness gates. No formal template approval queue is introduced.

## Form-to-Sheet field map

| Hub input | Google column header |
| --- | --- |
| Academic year key | academic_year |
| Display label | display_label |
| Engagement goal | engagement_goal |
| Public leaderboard Google Sheet | attendance_sheet_url |
| Leaderboard tab | leaderboard_tab |
| Full dashboard JSON URL | dashboard_json_url |
| Attendance form | attendance_form_url |
| Points Master | points_master_url |
| Events calendar page | calendar_page_url |
| Google Calendar iCal URL | calendar_ical_url |
| Show this year in selector | is_active |
| Use as default year | is_current |
| Google only: durable edit timestamp | last_updated |
| Google only: public status note | status_note |
| Google only: aggregate event tab | event_metrics_tab |
| Private budget tracker | budget_tracker_url |
| Sanitized budget export | budget_export_sheet_url |
| Budget export tab | budget_export_sheet_tab |
| Banking portal | banking_url |
| Fundraising portal | fundraising_url |
