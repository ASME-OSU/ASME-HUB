# System flow and ownership

The Hub guides the real officer handoff by default. Incoming officers get access, review their annual tools, confirm Points and finance readiness, prepare communications and agree acceptance. Optional private practice is a separate officer exercise; ordinary handoff does not require five fictional submissions. The reviewed AnnualProvisioner creates the annual copies and inactive settings row. Officers compare that row with its private receipt. The Hub reads the chapter’s shared settings; a rehearsal uses its own private copied Control Center. The older authenticated annual-save service remains a separate workflow with its own supported template contract and journal.

The current guide has five steps.

```mermaid
flowchart TD
 A[T01: year and incoming access] --> B[T02: annual files and live connection checks]
 B --> C[Actual Form tab to Config B7 / protected raw proxy]
 B --> D[Export Config B1 to annual working master]
 B --> E[Read back inactive/noncurrent twenty-column row]
 C --> F[T03: Points and finance readiness evidence]
 D --> F
 E --> F
 B --> G[T04: communications and calendar]
 F --> H[T05: coordinator GO/NO-GO and cleanup/handoff]
 G --> H
```

The shared private checklist is the team record; Hub progress and saved links are local to one device. The President names who copies or imports officer observations into the shared record. Acceptance of the handoff may include assigned open work. Activation requires the separate approved launch record, operator and time.

<details>
<summary>Technical architecture, storage and legacy service reference</summary>

Complete one-time chapter configuration, reviewed canonical-source setup and Google API deployment before handoff. The normal officer route is Hub Step 2 → Sign in with chapter Google account → Create or reopen this year’s files. One operator uses asmeohiostate@gmail.com and teammates reuse its chapter-owned private Google files; use normal approved OSU login for Microsoft/shared university resources where applicable. Routine access has no independent reviewer gate. The editor functions `provisionReviewedAnnualYear(year)` and `provision2027_2028` remain technical recovery alternatives.

AnnualProvisioner creates/resumes five private copies, observes Google’s actual Form response tab, writes pointers/dates and reads back the inactive row. After a fresh matching Hub connection report, **Open event update controls** opens the bound Google-hosted page. Its explicit **Connect automatic event updates** action performs initial sync and installs one recorded `asmeAnnualEventsEdited` trigger in the authorized standalone project. Trigger changes run through `google.script.run` on that page, not the Hub execution API. **Check connections** reads saved identities, eight Points structural checks, both exports’ six/35 import-cell maps and source arguments, output headers/errors, and this project’s managed trigger. Google’s two export **Allow access** prompts remain normal officer actions. Connected means installed; a normal Google Sheets Events edit and matching Form choices establish observed delivery. A report does not certify all source inputs, scoring, finances, public sharing, personal access or launch approval.

Existing copied **ASME Tools → Sync Events to Google Form / Enable automatic event sync** menus are optional compatibility tools and can request per-copy consent. They are not required by the new routine Real path. Avoid duplicate update routes: the standalone report cannot inspect or delete another bound project’s or another account’s triggers. To retire this project’s recorded connection, first close the saved Form and make the year noncurrent, then use Step 5’s read-only retirement check, then the verified link to the Google page for explicit confirmation/stop. Lost-stop acknowledgment recovery finalizes only the saved pending journal and does not delete unrelated triggers.

Protected `_Raw_Ingest` reads Config B7; Roster/Point Log use stable proxy references. Both exports centralize import source IDs at Config B1 (six Points/35 Budget formula cells). Complete any one-time canonical migration with backed-up source/regression evidence before handoff; annual copies do not require bulk formula replacement.

The guide stores seven actual copied-file links, optional mock references and private record URLs by named run on the officer’s device. Format/duplicate/template checks do not certify Google access. Guide migration preserves raw historical originals. The current self-service criteria reopen affected old observations while retaining unchanged reviews, notes and run identity; viewing alone does not rewrite saved progress. A rehearsal or imported completion never authorizes production T05. A rehearsal can reach its separate completion GO after all 16 applicable checks pass, T01–T04 complete and T05 is skipped with a reason. Real handoff has 20 applicable reviews, excluding the six fictional exercise checks, and requires separate launch approval. Cleanup/handoff remains available while production is NO-GO.

The older authenticated annual-save service is a separate configured workflow. It does not adopt provisioner-created rows or validate the proxy/Config B1 import architecture; do not send those years through it. Its supported independent workflow is: **Open authorized annual save**, **Verify with Google**, review the public twenty-cell row/audience, **Save inactive year and confirm**, then independent **Compare with Google**. Its installation receipt does not certify the new helpers. Neither route activates the year, opens intake, grants sharing or approves a send.

See [current implementation and verification status](current-implementation.md) for the exact checks, local save/export boundaries and installation limits.

## Hosting and storage

Rehearsal T02 saves a private copied Control Center and optional provisioner-project editor reference alongside its seven links. **Compare saved links with setup summary** validates and retains that run’s browser draft, then offers direct native row comparison against the provisioner receipt. It never calls the legacy writer or switches the production settings source. Private reference fields are excluded from progress export and print. All access, permissions and exact saved values still need Google readback.

| Component | Host/control | What is stored there |
|---|---|---|
| Hub website and source | ASME-OSU GitHub organization / GitHub Pages | Public HTML, browser scripts, defaults and documentation |
| Annual setup, connections and event updates | Chapter-owned standalone Google Apps Script project | Owner-only API executable; saved annual registry, read-only structural checks and one explicitly connected managed trigger per year |
| Legacy Annual Verify and Save service | Chapter-owned standalone Google Apps Script project | Authenticated server code; self-only deployment running as the accessing chapter account |
| Control Center | Chapter Google Drive / Sheets | Shared `Hub_Settings_Public` rows; the entire workbook is publicly readable |
| Templates and annual copies | Chapter Google Drive | Canonical masters and new-year files; private masters are separate from reviewed public exports |
| Rules, ledgers and operational evidence | Chapter's private administrative/handoff folders | Trusted configuration, operation history, source snapshots and acceptance records |
| Guide progress, link drafts, personal links | Each officer's browser | Local state; export/import is needed to move it between devices |
| Other officer tools | Existing Ohio State, Microsoft 365, newsletter and finance services | Separate accounts and access controls; their ownership/access is not certified by this save service |

The Google project's owner was checked as the ASME chapter account, with
restricted access. The Hub lives in ASME-OSU's GitHub organization. There is no
additional personal hosting server. A developer's Git author name is different
from ownership of the Google files. The Hub access phrase and role selector do
not grant Google or Microsoft authorization.

## Existing authenticated annual-save verification scope

Google verification checks file identity, type, chapter ownership, editability,
folder ancestry, allowed permissions and excluded templates/originals/fixtures.
It checks a closed Form and its actual destination, response headers and empty
test body, Points configuration, budget dates, export schemas and the complete
reviewed import-formula inventory. The save engine checks the settings schema,
unique years, active/current flags and an unchanged baseline. Its review expires
after 30 minutes; save takes the project lock and checks resources again.

This paragraph describes the legacy verifier, not the current managed connection report. Officers still review actual public export contents, finance totals/authority, incoming chapter-login access and independent consumers. Optional delivery/scoring regression work belongs in isolated Practice copies; ordinary Real handoff does not require fictional records or copied-script consent. The service does not mark those checks PASS, open responses, change
sharing or activate a year. See the [verification contract](../../integrations/apps-script/MANUAL_ANNUAL_VERIFICATION.md)
for the exact conditions.

The public data flow is **attendance Form → private Points Master → reviewed
Points Export → Hub**, with **private Budget Tracker → Budget Export → Hub**.
The Hub also reads shared settings and the public chapter calendar. Published
settings contain public references even when the linked destination is private;
hidden tabs do not protect anything in a publicly readable workbook.

For current-year gear-panel edits, **Preview and refresh** affects that browser
tab. **Edit shared settings** opens Google Sheets for an authorized shared edit;
**Compare with Google** checks the intended saved values. For a provisioner-created year, compare its exact existing row directly against its private receipt. The legacy writer has a separate append journal and cannot adopt that row. Keep the two workflows and receipts distinct.

</details>
