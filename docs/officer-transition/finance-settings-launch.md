# Finance, settings, acceptance and launch

Use this worked companion for T02 setup/settings, T03 finance/export acceptance and T05 activation, cleanup and handoff. It addresses rehearsal
questions N08–N10 and C10–C12. The figures below are fictional values observed in
the October 3, 2026 mock run. They explain the workflow; they do not approve real
funding, event bookings, public fields, activation or retention.

The coordinator keeps exact resource IDs, named holders, evidence and snapshots
in the private handoff tracker. The public examples here use resource labels.
Ask the coordinator for the private list of this year’s files. Match each example label to the correct file link before editing; save the Treasurer, Points maintainer and settings editor contacts there.

The chosen reporting convention is **August 1–July 31**, with **Fall August–
December, Spring January–May and Summer June–July**. For 2027–2028, the Budget
Tracker's Setup & Lists annual bounds B4/B5 are 2027-08-01 and 2028-07-31;
Fall B11/B12 are 2027-08-01 and 2027-12-31; Spring B13/B14 are 2028-01-01 and
2028-05-31. Points events and monthly reporting must use the same convention.
June/July belong to that year's Summer; August starts the next year. This is a
reporting rule, not confirmation of the fictional event dates or room bookings.

## Current run records and NO-GO

In **Transition to New Year**, choose an academic year and create a distinct named **Rehearsal** or **Production** run. Runs isolate progress and local annual-link drafts. Read any step using the step selector; Next remains available while a prerequisite is incomplete. Record independent later observations with the dependency warning, without marking the earlier dependency passed. Save a reason before choosing **Skipped**; record **Failed**, **Blocked**, and **Not checked** truthfully. Keep detailed evidence in the private tracker and use references in guide notes, because exports and printing include those notes.

A finished rehearsal means all five steps have a truthful disposition; complete, skipped, failed and blocked counts remain separate from check results. It always reports **NO-GO** for production. T05 can be marked complete only in a production run with all T01–T04 complete and all required manual checks passed; the coordinator still reviews current private evidence and authorizes launch. A skipped T01 never becomes real officer access. T05 cleanup/handoff remains available after NO-GO; record rehearsal T05 as Skipped with its reason and retain the cleanup receipt in the private tracker. There is no cleanup mark that authorizes launch.

The schema/guide versions travel with the run’s ID/name/year/mode. Legacy year-only progress is retained as a legacy rehearsal. Old sixteen-step versions 2–6 migrate to guide 7: step dispositions are summarized in notes, passed checks need recheck, and the complete raw original is backed up before any save. Named-run identity/mode survives migration; no old completion authorizes the revised launch. An import creates a separate run; imported production completions require fresh confirmation. Unknown/corrupt state is preserved, not overwritten. Create a new run to continue if recovery is needed. Exporting progress excludes annual private links; transfer those through the approved private handoff and review the destinations in the receiving browser.

## T03: calculated account ledgers and dated bank reconciliation

Use the reviewed repaired template for fresh annual copies. **Setup & Lists B6/B7** remain the opening OSU/Huntington cash inputs. **Dashboard A5/C5** calculate each account ledger from its opening cash plus in-year Approved/Cleared income minus Approved/Cleared expenses plus net transfers. **E5** combines those two ledgers. **G5** projects combined cash including pending income/expense; pending transfers between these accounts stay combined-neutral. Annual dates and the workbook timezone govern inclusion.

Manual bank snapshots are separate: **Dashboard B27/B28** for OSU/Huntington, **C27/C28** for their as-of dates, and **D27/D28** for ledger differences. Both a snapshot and date are required for a reconciliation difference. The former Huntington C5 snapshot is preserved at B28. A ledger is not evidence that the bank is reconciled; the Treasurer records statement/outstanding-item evidence privately. Keep opening inputs and snapshots, and do not publish cash balances, payees or transactions in the sanitized export.

For an isolated fixture, opening OSU $1,000/Huntington $500 and an approved Huntington expense $40 must produce $1,000/$460/$1,460 ledgers; a pending $25 expense affects projected combined cash to $1,435 only. Test income, transfer directions, Approved/Cleared/blank/Pending/Canceled states, July 31/August 1 and Fall/Spring/June–July. Funding/category-plan approval is a separate check. The remediation private copy passed sixteen native formula cases. Canonical ledger promotion and a fresh Budget copy’s matching C5 formula and zero baseline were subsequently confirmed by native readback; the full fresh-copy tracker/export/Hub operating loop still requires separate acceptance. If C5 remains a literal manual snapshot, ask the maintainer for the reviewed repair instead of overwriting it during routine setup.

## T03: distinguish the funding plan from transactions and legacy totals

Open the private Budget Tracker, then **Funding Setup**. **Funding authority** means the amount the chapter is approved to spend; it is separate from the account balance. The funding approval
status is `B12`; the confirmed allocation and remaining allocation are `B14` and
`B15`. These cells calculate; do not type into them. In the separate Budget Export,
read `Budget_Public` rows by `metric_key`, including `funding_model_status`,
`planned_budget`, `approved_expenses`, `remaining_budget` and `budget_used_rate`.
Read the Hub finance cards after the export itself agrees.

Only the exact status `Confirmed` allows the Hub to describe the selected plan as
funding authority and show the authority-used percentage. A spreadsheet status
checks entered amounts, reconciliation and the review checkbox. Real financial
approval still needs its actual supporting evidence. A mock `Confirmed` remains
mock funding.

The rehearsal showed two different calculations at once:

| Source and metric | Mock calculation | Observed result | Interpretation |
|---|---|---:|---|
| OSU account available allocation | 5,000 allocation − 200 reserve − 300 unpaid commitments | 4,500 | Fictional spendable allocation for category planning |
| Huntington available allocation | 2,000 allocation − 100 reserve − 100 unpaid commitments | 1,800 | Fictional spendable allocation for category planning |
| Confirmed category plan | 4,500 + 1,800 | 6,300 | Funding Setup B14 / export planned_budget |
| Approved/cleared income | One fictional cleared donation | 500 | Operating income; it does not automatically increase the approved plan |
| Approved/cleared expenses | One fictional approved meeting purchase | 125 | Dashboard B11 / export approved_expenses |
| Pending expenses | One fictional workshop request | 40 | Separate pending amount; excluded from approved expenses |
| Remaining confirmed allocation | 6,300 − 125 | 6,175 | Funding Setup B15 / export remaining_budget |
| Used rate | 125 ÷ 6,300 | 1.984126…%, displayed 2.0% | Share of confirmed plan already used |
| Legacy category plan | Sum of old Budgets values | 0 | Dashboard B13; historical compatibility plan, not approved authority |
| Legacy plan less approved actual | 0 − 125 | −125 | Dashboard B14; explains the apparent negative amount |

The −125 legacy result does not mean the bank is overdrawn. The 6,175 result is
remaining allocation, not an account balance. Pending requests, reserves and
unpaid commitments still need their own review. Preserve legacy formulas for
compatibility; use the confirmed figures and status together when deciding what
the plan means. A Dashboard improvement should show these confirmed figures
beside the legacy explanation without replacing transaction formulas.

### Funding evidence and the zero review

Before entering or revising a real plan, uncheck **Funding Setup B10**. Gather the
following evidence privately and record its source, date, applicable year,
approver and restrictions. Unknown amounts remain unknown; a template zero is
not evidence.

| Input / review | Editable location | Evidence to obtain |
|---|---|---|
| OSU allocation, reserve, unpaid commitments | Funding Setup B5:D5 | Approved amount available: dated allocation award/approval notice. Money set aside: approved reserve decision. Unpaid obligations: itemized approved orders/invoices not yet paid, without double counting |
| Huntington allocation, reserve, unpaid commitments | Funding Setup B6:D6 | Chapter-approved bank-funded annual plan; approved reserve decision; itemized unpaid orders/invoices assigned to that account |
| OSU restrictions, or confirmed None | Funding Setup B8 | Spending restrictions: allocation terms or written funding-office confirmation; check that each intended category/spend is permitted |
| Fourteen category amounts per account | Category Budgets B5:C18 | Reviewed annual category plan; justification for each amount, including every retained zero |
| Opening balances | Existing authorized ledger/account reconciliation, not these six funding cells | Starting balances: dated account statement and reconciled ledger with outstanding items. Keep account details private; do not substitute balance for allocation |
| Review and approval | Private approval record, then Funding Setup B10 | Treasurer review and the chapter's actual required financial approval; do not invent approvers or dates |

There are **six** funding dollar inputs in B5:D6 and **28** category inputs in
B5:C18. The copied category zeros already satisfy a numeric-count check, so a
student must review all 28 positions. Record each zero as **reviewed unused** or
**unresolved** in the private worksheet/checklist. Do not check B10 while any zero
is unresolved. Enter a confirmed zero for unused funding inputs as well.

Verify all amounts are nonnegative, reserves plus commitments do not exceed each
allocation, and category totals match each account's available amount. Both
**Category Budgets B23:C23** must be zero. Then check B10 and read B12. A
`Needs confirmation` message identifies an unfinished input/reconciliation/review;
repair the input rather than overwriting the status formula. If amounts change,
uncheck B10 and repeat the review. Old **Setup & Lists** funding cells and the
hidden **Budgets** tab are compatibility outputs, not funding-entry locations.

Finally compare the tracker, export and Hub. Record actual values and refresh
times. Connected exports can lag behind a completed review. If the tracker says
Confirmed but the export still shows earlier figures, leave the reviewed inputs
and B10 unchanged while the import refreshes; reopen the export and compare the
funding status, plan, expenses and remaining amount. Do not redo approval just to
force a refresh. If it remains stale or errors, ask the Treasurer and maintainer
to check the import source, authorization and errors and record the unresolved
check. Verify the Hub only after the export agrees. A private import authorization or spreadsheet readback does not establish
a successful public Hub display. See the [funding workflow](../../README.md#funding-authority-confirmation-workflow).

## T02: separate preparation, save and operating states

| State | Action | What persists / becomes visible | Evidence needed |
|---|---|---|---|
| 1. Device draft | Save new-year links or preview in the Hub | Browser/device state only | Export/import on the intended second device; review target year and links |
| 2. Google saved draft | Verify actual resources and save an inactive/noncurrent row through the authorized Google page, or use the documented direct editor route | A Google row exists; year stays out of normal selector and is not default | Google save/readback receipt, exact A:T row, Compare with Google |
| 3. Visible year | Authorized editor sets `is_active=TRUE` after approved review | Eligible for normal year selection; `is_current=FALSE` keeps existing default | Fresh source read and fresh Hub selector check; independent consumers remain separate |
| 4. Current year | Authorized activation sets target `is_current=TRUE`, with `is_active=TRUE`, and outgoing `is_current=FALSE` | Target becomes default; exactly one current active row | Reopen both Google rows: exactly one active year must be current. Reopen the Hub, website and other tools using these settings and check each result |

A tab-only Preview is another browser-only state; it changes neither the Google row nor the other consumers. **Points LIVE** and **Form Accepting responses** are separate operating switches after the approved launch checks. Enter a positive numeric engagement goal before preview/save; blank and zero are rejected.

The transition guide can select a target for preparation even when the normal
year selector hides its inactive row. Importing a Google save file, opening a
preview, verifying resources and saving Google are separate actions. Verification
does not save. A saved draft does not activate Points or open the attendance Form.

The local [AnnualProvisioner source](../../integrations/apps-script/transition-simple/AnnualProvisioner.gs) creates/resumes its own annual run and reads back the exact twenty columns with inactive/noncurrent flags. Its three standalone/two canonical bound files now have saved/reopened source hashes matched to reviewed code. Actual execution, configuration/authorization, bound-menu trigger and complete provisioner acceptance remain pending; source installation does not certify Google setup/access/activation or update the existing version3 web deployment. Do not execute the older installed bundle until its retirement guard is updated/read back; never run legacy bulk setup against proxy templates. Saving new helper files does not update the existing deployed web version. Budget and Points Export Config B1 identify the corresponding private annual working master; T03 reviews Allow access and effective output separately.

After an uncertain save, preserve the journal and verify the **same** draft to
reconcile what Google already contains. Do not create another year row or change
current flags as a diagnostic step. See the [annual-save contract](../../integrations/apps-script/ANNUAL_SETTINGS_DRAFT.md)
and [readback/recovery rules](../../integrations/apps-script/SETTINGS_WRITE_CONTRACT.md).

### Provisioner readback and existing annual-save fallback

The coordinator names **one settings editor** in the private handoff. After the new provisioner is installed and accepted, T02 reviews its exact inactive-row receipt and independently uses **Compare with Google**. The older authenticated annual-save service remains a separate fallback/reconciliation route for a reviewed draft; it is not proof that the new provisioner is installed. That editor uses **Year Settings → Open authorized annual save**, signs in with the
chapter Google account in its browser profile, chooses **Verify with Google**, reviews the full public
row, then chooses **Save inactive year and confirm**. After saving, use **Compare
with Google** and reopen the Control Center to compare all twenty columns A
through T with the intended values. Record the observation privately.

Preserve a downloaded draft before changing account/profile or retrying. An unable-to-open Google page may be account/profile routing: open the configured chapter profile and sign in there; do not guess `/u/1` or treat it as a global outage. A rejected expired/changed verification means reimport the same draft, choose Verify with Google again, review its verification time/expiry, then save immediately. A configured draft timestamp, verification time and actual save/readback receipt time have different meanings. If the network response is uncertain, inspect the row and reconcile the same journal before retrying. Never remove actor, expiry or concurrent-edit protections to force a save.

If that page is unavailable or an existing row needs reconciliation, the named
settings editor uses **Year Settings → Edit shared settings** to open the chapter
Control Center's `Hub_Settings_Public` tab. Review the headers and latest rows,
coordinate with other editors, and preserve a private before-state. Add or amend
only the approved target row in the exact column order below; keep K
`is_active=FALSE` and L `is_current=FALSE`, preserve the outgoing/current row,
and keep private notes out of this public sheet. Reopen it after saving and
compare A:T plus the outgoing flags; confirm one row per academic-year key.
A maintainer reviews uncertainty, conflicting values, duplicate rows or a
changed schema before retrying. Routine officers do not activate a year while
saving its draft. The direct route is for the named authorized editor, not a
second concurrent writer.

### Worked twenty-column row

The mock Control Center recorded the following A:T row at row 3. Resource labels
below stand for the exact URLs in the private `year-settings-draft.json`; these
labels are **not values to paste** into Google. This preserves the complete field
order without publishing private operational references. Every real value and
linked destination needs an audience review, because the Control Center is
publicly readable.

| Column | Exact header | Mock value / resource label | Review before real use |
|---|---|---|---|
| A | academic_year | `2027-2028` | One row per key; correct target |
| B | display_label | `MOCK 2027–2028` | Replace only with approved real label |
| C | engagement_goal | `65` | Carried mock assumption; actual authority unresolved |
| D | attendance_sheet_url | Mock Points Export URL | Exact reviewed export, not master |
| E | leaderboard_tab | `Leaderboard_Public` | Actual tab exists and approved fields |
| F | dashboard_json_url | Blank | No aggregate endpoint claimed; inspect actual configured consumer route |
| G | attendance_form_url | Observed mock respondent URL | Obtain from Form; not constructed from editor ID |
| H | points_master_url | Mock Points Master URL | Private operational reference audience reviewed |
| I | calendar_page_url | Existing chapter calendar page | Reuse was a mock assumption |
| J | calendar_ical_url | Existing calendar public iCal URL | Reuse and target-year events unverified |
| K | is_active | `FALSE` | Inactive preparation state |
| L | is_current | `FALSE` | Existing production default remains |
| M | last_updated | `2026-10-03T13:30:00-04:00` | Literal recorded in mock row; not proof of a runtime save check time |
| N | status_note | `MOCK ONLY — not approved or active` | Public note, no private review details |
| O | event_metrics_tab | `Event_Metrics_Public` | Actual tab and approved aggregate fields |
| P | budget_tracker_url | Mock private Budget Tracker URL | Private operational reference audience reviewed |
| Q | budget_export_sheet_url | Mock Budget Export URL | Sanitized aggregate source |
| R | budget_export_sheet_tab | `Budget_Public` | Actual tab exists; status accompanies plan |
| S | banking_url | Existing banking portal login page | Generic portal link; no account data |
| T | fundraising_url | Existing fundraising portal login page | Generic portal link; no credentials |

The mock connector independently read the complete row. Production A1:T5
remained unchanged in the comparison evidence. The production annual save page
was not successfully exercised by the October 3 mock run. The October 7 V3 same-draft re-verification/retry later saved and matched readback at 2026-10-07T21:11:21.514Z; retain its earlier rejected preview as recovery evidence, not an unresolved inability to save. Neither observation proves
target-year public audience acceptance or activation readiness. Compare with
Google checks form fields; inspect M/N/O directly as well and retain all twenty
cells in the private snapshot.

## T05: a completed evidence entry is not an automatic gate PASS

Use one row per check in the shared private acceptance tracker. A check needs the
owner/named holder, exact resource/version, expected and observed result, time,
evidence reference, recovery result and next action. Record `NOT RUN`, `NOT
VERIFIED` or `PENDING` when that is what happened. Use PASS only for the precise
check actually performed on the required final files. A prior mock PASS never
passes a real annual gate. Changed policy/configuration/resources invalidate
affected evidence.

This is a **completed mock evidence entry** for finance, grounded in retained
receipts. It does not change the tracker A04/C03 status:

| Tracker field | Filled example |
|---|---|
| id / gate | A04 and C03 / V06, mock finance arithmetic subcheck |
| owner_role / named_holder | Treasurer / mock operator; real successor unassigned |
| status | OBSERVED MOCK; production acceptance remains PENDING |
| source_id_version | Exact mock Budget Tracker and Budget Export IDs in private resources.json; spreadsheet formula snapshot in connector-receipts.json |
| update_method | Scoped mock funding/category inputs and three fictional transaction rows; native private imports authorized |
| expected_action_result | 500 income, 125 approved expense, 40 pending; confirmed plan 6,300; remaining 6,175; reconciliation 0/0; used rate about 2% |
| observed_result | Tracker/export figures matched; legacy Dashboard remained 0/−125; no actual authority or live Hub check established |
| checked_at | Observed October 3, 2026; receipt lacks exact read time. Export reported refreshed Oct 3, 2026 1:27 PM; this is not the independent check timestamp |
| evidence_path | Private mock evidence/connector-receipts.json → budgetTestResults; evidence/public-export-results.json → budget; STEP_BY_STEP.md finance results |
| refresh_interval | Not measured; record actual consumer refresh before acceptance |
| due_date | Not assigned; coordinator must set with actual holder |
| restore_action / restore_result | Preserve mock example for review; real cleanup/restore not performed; production settings exact before/after comparison unchanged |
| next_action | Obtain actual funding evidence; review all zeros; verify actual tracker/export/Hub and consumer restore; repeat for final target-year files |

Configuration and readback have narrower scope than the full operating loop.
In that **October 3** mock, Form delivery/scoring/duplicate/unmatched cases were **NOT RUN**, and populated TESTING/PAUSED suppression was **NOT VERIFIED**. The separate October 4 round-2 Form check observed ordinary scoring and private populated suppression, and found a profile-recovery failure before repair; see the dated results in the [Points guide](annual-points-setup.md#dated-rehearsal-results). Newsletter transfer has its own dated evidence. Actual target-year phone checks and successor acceptance remain separate unverified annual checks. Do not fill
their PASS cells using the finance record. A record can be complete while its
gate remains open.

Before T05, use the mapping below to match every required guide check with the coordinator’s launch gates and private tracker row. If an automation is optional, record the manual verified route and reason;
required FAILED, stale, conflicting or unverified checks block activation.

### Guide checks and the coordinator's launch checklist

Officers use the Hub's **V01–V10** checks. The coordinator uses the broader
**V01–V11** launch checklist in the private handoff/readiness record. The first
ten IDs refer to the corresponding topics below, but launch requires current
evidence from the actual annual files and tools, not only a Hub progress mark.

| Hub guide check | Coordinator launch topic |
|---|---|
| V01 | Approved clean originals and intended annual copies, scripts and integrations |
| V02 | Exact Form destination, response tab and twelve headers |
| V03 | Actual delivered submission in the intended annual file |
| V04 | Points, duplicates, unmatched identities and profile recovery |
| V05 | Public field approval and complete signed-out/privacy checks, including snapshots/caches |
| V06 | Actual funding evidence, tracker/export figures and approved Hub output |
| V07 | Google saved row, public audience review, fresh values and settings flags |
| V08 | Calendar sources and correct events/time zones in every required tool |
| V09 | Approved published website/CMS/pages, links and phone checks |
| V10 | Incoming officers perform their normal tasks in each required service |
| No additional Hub checkbox | V11: incoming coordinator exports/resumes progress and links in another browser/device, and demonstrates safe recovery from an uncertain operation |

Before changing the current year, the coordinator also records the actual
handoff/intake decision and captures a fresh production snapshot and rollback
record. Use the [ordered launch](#t05-ordered-launch-and-intake-example) and
[rollback inventory](#rollback-inventory) below; these are launch prerequisites,
not extra checkboxes that activate the year automatically.

## T05: ordered launch and intake example

No real handoff/intake date has been approved. The following is an ordered
execution example, to schedule only after all required target-year gates pass.
The mock decision remains **DO NOT ACTIVATE**: Google draft inactive/noncurrent,
Points TESTING, Form closed, production year unchanged. Calendar/newsletter/site
packets are preparation evidence.

1. **Coordinator:** confirm actual launch and intake-opening decisions, named
   operators, current PASS evidence, public-field approval and remaining policy
   facts. Record optional deferred work. Keep attendance closed during changes.
2. **One settings editor:** capture latest A:T headers, outgoing and target rows,
   flags, source/version/read time and each consumer's before-state privately.
   Check for concurrent edits. Confirm one current active outgoing row and an
   inactive/noncurrent target. Capture Form destination/schema/choices, Points
   status, imports, budget authority, and deployment/workflow references.
3. **Editor:** make only approved activation flag changes: target active/current
   true, outgoing current false. Preserve historical rows and established archive
   behavior. Independently reread both rows; verify exactly one current active
   year. Open a fresh Hub and check selected/default year and actual resource IDs.
4. **Consumer owners:** update and independently inspect Points/feed/cache,
   finance, calendar, Website/CMS and Newsletter sources. Record actual refresh
   completion, event time zone, destinations and signed-out allowed output where
   required. Hub flags do not edit those independent sources. Keep campaigns
   unsent and attendance closed while checks are incomplete.
5. **Points officer:** verify final destination, raw headers, response-derived
   processing, duplicate/unmatched behavior, public allowlist and populated
   TESTING/PAUSED suppression from the final-file rehearsal. In manual mode,
   maintain exact reviewed Event-ID choices separately from Events. Set Points
   **LIVE** only at the approved stage and inspect public output after refresh.
6. **Attendance operator:** at the explicitly approved intake stage, open the
   exact Form's response controls, enable acceptance and verify the actual
   respondent link in a fresh context. Record acceptance state and observed time.
   `Events.form_open=TRUE` does not itself reopen a manually operated Form; LIVE
   Points does not reopen it either. If publication is required, verify the actual
   publication controls as well. A check of the destination alone cannot prove
   submission/scoring. Run only the approved final-file test and reconcile it.
7. **Coordinator:** accept the verified consumer/intake state, record launch
   outcome and transfer operating ownership. Communications sends or publication
   need their own actual authorization and recorded result.

If a required check fails before intake, leave intake closed. If it fails after
opening, close the target Form promptly, pause target-year writes/campaigns and
use the captured before-state. Record what actually happened before retrying.

### Rollback inventory

| Owner / consumer | Restore and verify separately |
|---|---|
| Settings editor / Google + Hub | Compare latest revisions; restore exact changed flags/cells; reread both rows and fresh Hub; preserve concurrent edits |
| Points officer / Form + processing | Close intake; capture any received records; restore reviewed destination/config/choices as needed; reconcile received responses, logs, reviews and totals; preserve actual submissions |
| Points officer + Webmaster / public points and caches | Return target to approved non-live state; restore each source; rerun supported workflows; verify signed-out tabs/feeds and refreshed snapshots |
| Treasurer / tracker, export and Hub | Restore captured affected inputs/imports only after review; independently reconcile selected plan/status, approved totals and Hub cards |
| Calendar owner + Webmaster / calendars, Website, CMS | Restore each independently captured source/content/deployment; regenerate feeds and inspect live event/time/link output |
| Communications / browser defaults, drafts and Brevo | Import captured outgoing state into the affected browser; inspect draft/footer/unsubscribe. A sent campaign cannot be assumed retractable; follow actual service incident process |

A rollback is complete only when the individual consumer owners record observed
restored results. Keep new annual files non-live for repair. Do not delete copies,
responses or entire rows as a default rollback. Restoring Google flags alone does
not restore external calendars, CMS content or browser newsletter drafts.

## T05: retain, clean, archive and hand off

Record each item below in the private inventory with exact resource/version,
current owner, incoming owner, audience, approved retention rule or **decision
pending**, action taken and independent evidence. No chapter retention duration
was established by this mock; do not invent one. Preserve records pending the
authorized decision.

| Inventory item | Owner role | Closeout action and completion evidence |
|---|---|---|
| Outgoing annual Forms, response/Points workbooks, finance records | Points officer / Treasurer | Preserve historical source and recoverable version; identify archive location and approved access; record current operating links |
| Incoming annual copies and settings rows | Coordinator / maintainers | Record exact IDs, flags, script/property/trigger disposition and operating owners; verify final target-year resources rather than copy titles |
| Settings/consumer snapshots and rollback record | Settings editor / consumer owners | Retain privately with source revisions and actual restored/launch outcome; record recovery owner |
| Synthetic Form responses, roster/log entries, adjustments and test events | Points officer | Inventory exact test markers; reconcile dependencies before any approved cleanup; preserve receipts; independently verify intended clean state. Never delete real submissions |
| Fictional finance inputs/transactions | Treasurer | Keep this mock worked example clearly labeled. Final real files must have approved real plan and no unexplained mock rows; record any approved cleanup and reconciliation |
| Newsletter exports, templates/defaults, campaign drafts | Communications | Preserve outgoing recoverable exports; verify incoming editable transfer; record send state and correct footer/unsubscribe; retain under actual approved rule |
| Calendar/site/leadership archives and sponsor content | Calendar owner / Webmaster / Corporate liaison | Preserve outgoing board history and approved content versions; record each independent deployment and actual incoming facts |
| Mock evidence, screenshots, receipts and local drafts | Coordinator | Keep rehearsal evidence separate from actual acceptance; record retain/archive/dispose decision and owner; do not publish private payloads |
| Shared private tracker and unresolved decisions | Incoming coordinator | Assign each open action, next step and due date; successor demonstrates resuming work from the inventory |

### Test cleanup checklist for the Points maintainer

The coordinator approves **retain as evidence** or **remove** for each marked
test record. Keep failure reproductions and receipts while they are needed for
repair; do not interpret “cleanup” as permission to erase them.

1. Close the copied Form's **Responses → Accepting responses** control and keep
   Points TESTING/PAUSED. Save a named spreadsheet version and a private response
   backup before any approved removal. Inventory each fictional identity,
   timestamp, event, Form response and linked response-sheet row; distinguish
   these from all real submissions.
2. If approved for removal, the maintainer opens **Responses → Individual** in
   the exact copied Form, matches the marked test submission and removes that
   individual response. Never use **Delete all responses** when any real response
   or retained test exists. Form deletion and spreadsheet cleanup are separate;
   check the linked sheet rather than assuming one removed the other.
3. In the actual linked response tab, match the same test marker/timestamp/event
   and clear only that raw response's A:L data cells, preserving row 1 headers,
   the response-tab structure and every calculated-sheet formula. With the proxy architecture, source_row indexes the filtered proxy; blank/deleted raw rows can make it differ from the actual response-sheet row. Locate the original by timestamp, exact fictional identity and event before clearing it; never use source_row alone as a raw-sheet deletion address. Do not delete
   Roster, Point Log, Member Totals or Review Queue formula rows. Confirm the
   Form remains linked and compare the remaining raw responses with the Form.
4. Review separately any approved test Adjustments and test Events inputs;
   clear only identified removable inputs after checking dependencies and
   historical event IDs. Keep all real member history and existing formulas.
5. Reopen the calculated Roster, Point Log, private Member Totals, Review Queue,
   each public export and any generated feed/snapshot after refresh. Verify the
   removed test contributes no profile, points, review item or public output.
   Record actual remaining response/test counts and retained evidence. If output
   persists, keep intake closed and investigate the source/import/cache before
   declaring cleanup complete.
6. The Points officer checks the recorded result and the coordinator records
   final status, intake state, retained test evidence and cleanup owner in the
   private handoff. A clean mock does not prove that real annual intake works.

For the **October 3** mock, three fictional finance rows were retained as a worked
example and no Form responses existed to clean. The **October 4 round-2** Form check retained five marked fictional responses as recovery evidence and closed intake. Production settings were unchanged,
and no real campaign or website update occurred. This describes rehearsal
closeout, not successor acceptance. Actual archive/cleanup/retention approval,
incoming access, launch, intake and consumer recovery remain
to be performed and recorded.
