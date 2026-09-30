# Shared resource projection and migration

Local implementation only. `sharedResources` starts with blank spreadsheet/tab/edit pointers. No resource tab, public projection, officer access or migration is certified. Until connected, edit the repository's `config.resources` for shared static links and authorized Google Year Settings for annual URLs. **Manage my links** remains personal browser storage.

## Proposed public read contract

A verified public projection must expose exactly A:H, in this order:

`resource_id | label | url | category | roles | sort_order | enabled | academic_year`

- Stable lowercase ID (letters, digits, hyphens); preserve IDs when renaming. `label` is the display title (100 characters); action text becomes `Open <label>`. Category is required (40 characters). HTTP/HTTPS absolute URLs only; no embedded credentials. No formulas in labels/categories. Google formulas that populate a reviewed projection are outside the Hub's authority.
- Roles are comma-separated IDs: `all`, `president`, `vice_president`, `treasurer`, `secretary`, `social_chair`, `webmaster`, `ecouncil`, `advisor`. Roles boost presentation relevance; shared links remain discoverable in every role. They never restrict access or authorize Google editing. Personal links are labeled and rank after shared tools.
- Order is an integer 0–999999. Enabled is explicit TRUE/FALSE. Year is blank for all years, otherwise consecutive `YYYY-YYYY`. Reject duplicate ID/year pairs, unknown columns, malformed rows, schemes/roles/flags/order/years. A blank physical row is ignored; a partial row is invalid. Any invalid response rejects the whole dataset.
- For the six annual IDs below, URL **must be blank**; their selected-year URLs remain authoritative in Year Settings, including deliberately blank values. A resource record may change presentation or disable these cards. It cannot replace annual configuration or update other consumers.
- Enabled scoped row overrides global enabled row and bundled card. Global FALSE is a tombstone across every year; it takes precedence even over a scoped TRUE. Scoped FALSE hides only that year. Missing IDs retain bundled defaults. Delete a row only when restoring fallback is intended; retire a link with FALSE. Empty valid dataset means no overrides, so all bundled defaults return. New year-scoped IDs appear only in that year.
- Network/schema failures retain the last successful source-specific snapshot, including tombstones, with an explicit stale timestamp. In-memory snapshot survives unavailable browser storage. Browser cache is revalidated and tied to spreadsheet ID/tab; different sources cannot borrow it. A fresh browser with no successful snapshot uses visibly unconfirmed bundled defaults on failure. Stale state has no freshness guarantee and never confirms save/activation.

## Explicit migration mapping

Map current entries once by stable ID. Existing URLs are references, not newly approved public metadata. Review destination visibility (particularly restricted officer references), and copy authorized values only after approving the public allowlist. No ready-to-import CSV of restricted links is supplied.

| Existing config title | Stable resource ID | URL authority after migration |
| --- | --- | --- |
| Executive Board SharePoint | executive-board | Approved resource row |
| Event Operations | event-operations | Approved resource row |
| Officer Task Tracker | officer-tasks | Approved resource row |
| Shared Documents | shared-documents | Approved resource row |
| Attendance Check-In | attendance-check-in | Annual `attendance_form_url`; resource URL blank |
| Activity Report | activity-report | Approved resource row |
| Points Master | points-master | Annual `points_master_url`; resource URL blank |
| 2026–2027 Budget Tracker | budget-tracker | Annual `budget_tracker_url`; resource URL blank |
| Huntington Online Banking | banking | Annual `banking_url`; resource URL blank |
| Zeffy | fundraising | Annual `fundraising_url`; resource URL blank |
| Officer Password Document | officer-passwords | Approved resource row only after explicit public-reference review |
| Member Points Dashboard | member-points | Approved resource row |
| Newsletter Builder | newsletter-builder | Approved resource row |
| Career Packet | career-packet | Approved resource row |
| ASME OSU Website | chapter-website | Approved resource row |
| Events Calendar | events-calendar | Annual `calendar_page_url`; resource URL blank |
| ASME OSU GitHub | chapter-github | Approved resource row |

Bundled descriptions, icons, access guidance, and annual setting keys remain compatible metadata. New rows use a generic description/icon. Existing role title preferences use stable ID to find bundled titles, and Event Operations lookups use its ID, so renaming does not break those behaviors.

## Authorized connection and rehearsal steps

1. Reuse the source/Google audits. Capture authorized current configuration and recoverable Google version privately. Resolve whole-file public sharing (hidden/audit tabs are public), duplicate settings consumers and private references before expanding publication. Choose private authority plus allowlisted public projection where required. Do not assume a tab exists.
2. Verify each current/incoming officer's actual Google edit access. Create/review the proposed A:H projection under Google authorization only when authorized for live work. Preserve original A:T annual schema, current year and historical rows. Store identities, notes, credentials and audit payloads privately.
3. Map each of these 17 IDs to reviewed title/category/roles/order/enabled/year; original array position ×10 supplies default order. Static approved URLs come from the current config; annual IDs stay blank. Seed a representative nonannual row and inactive draft-year row in an isolated source first; compare existing consumers before migrating all entries. Keep bundled fallbacks until compatible consumers pass.
4. Set `sharedResources.spreadsheetUrl`, exact verified `sheetTab`, and authorized `editUrl` only after the schema, public field allowlist and read access are ready. Connection bootstrap requires a repository change; ordinary future row edits do not. The edit URL must be HTTP/HTTPS; the reader uses the extracted Sheet ID and Google Visualization JSONP.
5. Edit directly in Google with authorized account, recoverable version, latest-cell comparison and concurrent-edit coordination. Wait for Google saved, use **Refresh shared resources**, inspect selected-year cards and target URLs, then verify a clean browser without previews/personal links. Fresh response only confirms the public response; no Hub save or other consumer update is claimed. Rehearse scoped and global FALSE, missing-row fallback, failed publication, storage failure, historical year and cell-level restore before enabling production.
6. Reconcile unknown outcomes in Google before retry. Restore only intended cells after comparing current edits with captured version; whole-file restore can undo unrelated work. Refresh and clean-browser-check again. Do not activate a year as a diagnostic. If connection fails, a source-specific stale/default indication is expected.

No client writes, public-token service, password collection or new auth design is introduced. The S07 [settings contract](SETTINGS_WRITE_CONTRACT.md) remains the authorization/privacy/recovery boundary. Retiring a previously deployed insecure writer remains an owner action. Public resource JSONP assumes an approved public source, never a private account endpoint.
