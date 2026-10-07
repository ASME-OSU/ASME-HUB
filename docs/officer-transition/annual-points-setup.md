# Annual Points, attendance and export setup

Use this guide beside T05–T09 in **Transition to New Year**. Ask the coordinator to name a Points maintainer and record their contact in the private handoff checklist. The Secretary/Points officer copies the files, enters reviewed settings, manages the Form and checks results. The maintainer changes response formulas, import sources and date formulas, then supplies the completed checks. There is no installed one-click annual setup button.

## Normal officer setup

1. In the [Officer Hub](https://asme-osu.github.io/ASME-HUB/), open T05–T07 and make copies from **01 Points Master**, **02 Attendance Form** and **03 Points Export**. Rename the annual files and save their links in the private checklist. A retained `TEMPLATE — MAKE A COPY` sheet heading describes their origin; identify your copy by its annual filename, folder and file link. Keep the original templates unchanged.
2. In the copied Points Master, open the **Config** tab. Set B2 to your fall term and B3 to your academic year (`Fall 2027` / `2027-28` for 2027–2028). Set B5 to **TESTING** during setup. **PAUSED** also hides public member output and is used when operations are stopped for review.
3. In the copied Form, open **Responses** and turn **Accepting responses** off. Update only its year and helper text; preserve question titles, stored choice labels and the twelve-column response order. Link it to the copied private Points Master, then use **View in Sheets** to record the actual response tab name.
4. Give the maintainer both file links and that exact tab name. Have them finish [response wiring](#1-maintainer-procedure-link-the-actual-response-tab), [date checks](#4-use-the-aligned-augustjuly-year-n06) and [export connections](#5-maintainer-procedure-connect-the-export-to-this-years-working-file). Ask them to record the named backup version, expected/actual replacement counts, final formula sources and observed output. If no maintainer is assigned, mark wiring blocked and ask the coordinator to assign one.
5. Review Events inputs and maintain the Form dropdown [manually](#3-events-and-the-form-run-in-manual-mode-n05). Run the approved fictional [delivery, scoring, recovery and privacy tests](#6-delivery-scoring-recovery-and-privacy-evidence) with the Points officer. Check private Member Totals and Review Queue while testing; public names remain hidden in TESTING/PAUSED. Close the Form afterward and use the maintainer-led [cleanup checklist](finance-settings-launch.md#test-cleanup-checklist-for-the-points-maintainer).

Keep all annual copies private until their audience review and release checks pass. Do not edit thousands of formulas as a routine officer setup step. The following detailed procedures are for the named maintainer and retain the exact contracts needed for review.

### Dated rehearsal results

The **October 3, 2026** rehearsal checked native linking and saved formulas/import values; it submitted no attendance. Those delivery/scoring/populated-privacy cases were **NOT RUN on October 3**. A separate **October 4 round-2** test delivered five actual Form submissions: first profile, duplicate, second event and missing-profile handling worked, but the first complete profile after a skipped profile failed before repair. The October 4 repair recalculated those same five preserved responses as 5, 0, 8, 0 and 5 points; the recovered profile became ACTIVE with initials display, while its earlier unmatched event stayed zero/review. This is saved-formula recalculation on the retained browser submissions, not five new submissions after repair. TESTING/PAUSED suppression passed on that private populated mock pair; signed-out output, live Hub rendering and LIVE monthly/semester contribution were not tested there. Consult the coordinator's dated round-2 results and repair verification in the private handoff. These records do not pass checks on your real annual copies; repeat them on the intended files.

## 1. Maintainer procedure: link the actual response tab

1. Open the **copied** attendance Form in edit mode. Select **Responses → Link to Sheets → Select existing spreadsheet** and choose this year's **copied Points Master**. Use **View in Sheets** to open the destination. Compare its `/spreadsheets/d/…` file ID with the annual Points link, not only its title.
2. Copy the exact generated tab name. Google chose `Form Responses 3` in the rehearsal; your copy may differ. The approved template’s old, unlinked response tab is named `Form Responses 2`; confirm its name and contents in this copy. Keep it until you have checked the new connection and reviewed every test submission. Do not rename or delete tabs to make the setup appear correct.
3. Verify A:L contains this order, without extra questions inserted between columns:

   | Column | Header |
   |---|---|
   | A | Timestamp |
   | B | Email Address |
   | C | OSU name.number |
   | D | Is this your first submission this academic year? |
   | E | Preferred first name |
   | F | Last name |
   | G | Year in school |
   | H | Major |
   | I | Public leaderboard display |
   | J | Public alias |
   | K | Event ID |
   | L | Optional note |

4. In Points `Config`, set **B7** to the observed response tab and **B16** to the copied Form's editor ID (the ID in `/forms/d/ID/edit`). Keep B5 `TESTING`; review B2 term and B3 year separately.
5. Before changing formulas, record this copy’s expected counts: search all sheets within formulas for the exact old quoted tab fragment, and inventory its occurrences and distinct formula cells. Save those counts privately with the file/version; if the UI cannot provide both, have the maintainer collect a formula inventory before replacement. Save a named version through **File → Version history → Name current version**, such as `Before annual response wiring — 2027–2028`. In **Edit → Find and replace**, enter these exact fragments for the rehearsal example:

   ```text
   Find:         'Form Responses 2'!
   Replace with: 'Form Responses 3'!
   Search:       All sheets
   Check:        Also search within formulas
   Uncheck:      Match entire cell contents
   Uncheck:      Search using regular expressions
   ```

   Substitute your actual tab name in Replace with; retain the single quotes and `!`. Select **Find** and inspect examples in **Roster** and **Point Log** before using **Replace all**. If the name itself contains an apostrophe, ask the maintainer to review its formula quoting.
6. Record both counts. This inspected copy changed **12,988 formula cells in Roster and Point Log**, containing **16,984 occurrences**. Sheets may report replacements/occurrences instead of distinct formula cells. Those quantities are different. If the replacement count differs from the count recorded for this copy before the change, stop and review with the Points maintainer. These example counts are not required for every copy; do not repeat replacement to force them. A previously configured or revised copy needs its own before/after inventory.
7. Search all sheets within formulas again: the old fragment must have **zero** remaining references. Inspect formula bars in `Roster!A2`, `Roster!B2` and `Point Log!D2`: they must reference the actual linked tab. Independently reopen the Form's View in Sheets and compare it to Config B7/B16. A green Config cell alone does not establish this connection.
8. Perform the authorized isolated delivery/scoring cases in section 6. Do not type test rows directly into calculated tabs to simulate a successful Form delivery.

If the replacement affected the wrong annual file or fragment, close intake and restore the named pre-change version in that copy after reviewing what changed since it was named. Preserve the evidence and correct links before trying again; never roll back the production workbook to repair a mock copy.

The optional private [setup runner](../../integrations/apps-script/ANNUAL_SETUP_AUTOMATION.md) performs exact fragment replacement and count checks, with an observed Form tab and independent readback. It is a maintainer route requiring private configuration, not an installed feature inferred from a copy dialog.

## 2. Roster comes from member submissions (N04)

**Do not enter a membership list into Roster or overwrite Point Log.** Their existing formula rows calculate from the raw response tab. On the first check-in **of this academic year**, a member chooses **Yes - first submission** and completes the required profile, even if they belonged last year. Choose **No - returning member** only after completing a profile check-in this year. Enter exactly the same OSU name.number as in the first profile submission, without adding spaces or changing capitalization. The member enters the identifier in the Form; do not manually rewrite or normalize keys in calculated rows. The email field is collected by Google according to the Form settings; use only the approved test identity when rehearsing.

| Situation | Officer action | Evidence to inspect |
|---|---|---|
| New fictional member `test.9001` | Submit the first-submission branch with a fictional profile and approved event | Raw response A:L, generated Roster profile and Point Log result |
| Returning `test.9001` | Use the same name.number and another approved event | Same member identity; new event contributes once |
| Returning `test.9002` without a profile | Contact the Points officer; after the maintainer confirms the recovery fix, use the Form’s first-submission branch with the same name.number and complete profile | Original unmatched attendance stays zero/review; first valid profile must become ACTIVE and its new qualifying event score. Review the old event separately; do not manufacture a Roster row |
| Duplicate member/event | Keep the delivery evidence and inspect duplicate processing | Expected `DUPLICATE_SUBMISSION`; zero additional points |
| Approved point correction | Use the workbook's **Adjustments** inputs and its current README/header instructions | Member key, approved amount/reason and reviewer; calculated totals reconcile |
| Profile or display correction | Record the request privately and have the Points maintainer review the source-profile correction | Original source and corrected result; no calculated formula overwritten |

If a member accidentally skipped the profile, preserve their original attendance. The Points officer verifies the recovered profile and new event, then reviews whether the earlier unmatched attendance qualifies under the approved rules. Use the existing **Adjustments** workflow only for a separately approved correction, with evidence and reviewer; no automatic back-credit is promised. Copies without a verified recovery fix remain blocked on this case. The maintainer follows the [exact I/K/E formula migration and checks](profile-recovery-migration.md) to repair existing copies safely.

An adjustment corrects approved points; it does not create a missing member profile. Do not invent an adjustment amount to hide an unmatched or duplicate record. If a copied version's Adjustments headers or approval rules are unclear, retain the issue for the Points reviewer before scoring it.

## 3. Events and the Form run in manual mode (N05)

**Current operating mode: manual Events-to-Form choices.** A Google copy dialog can say attached Apps Script functionality copies. That message does not prove triggers, properties or event synchronization were installed. The manual workflow has no installed event sync, and the setup runner does not install one. Config B16 (Form ID) and B18 (sync status/time), when present, are compatibility fields for optional maintainer automation; they do not update the dropdown. The Points maintainer must separately install and test any automation before describing it as available.

In **Events**, edit the reviewed input columns: **B event_name, C event_date, F event_type, H scoring_active, I form_open, J approved_by**. Preserve formulas in **A event_id, D term, E academic_year, G points**. Select the category from Point Values and inspect the calculated result. Record actual approval separately; a mock reviewer is never real chapter approval.

Manually edit the Form's existing **Event ID** dropdown in place. Use the exact generated ID, then the literal separator **space-hyphen-space**, then its display name:

```text
20270826-001 - MOCK Welcome Meeting
20270902-001 - MOCK CAD Skills Workshop
```

The Point Log formula reads the characters before ` - ` as the event key. Use the generated ID unchanged; do not substitute a name-only choice, an en dash, or a different ID. A bare exact ID is also recognized, but the readable format above gives members context. Preserve the existing question and response column K. After any date or ordering edit that could regenerate event IDs, compare every choice to Events before reopening intake; preserve IDs already used in historical submissions.

| Event state | `scoring_active` H | `form_open` I | Manual Form action |
|---|---|---|---|
| Reviewed event within attendance window | TRUE | TRUE | Add its matching choice when intake is authorized |
| Completed event with window closed | TRUE | FALSE | Remove its choice; retain the Events row for past scoring |
| Draft or unapproved event | FALSE | FALSE | Keep it out of choices |
| Voided scoring event | FALSE | FALSE | Remove its choice and have the reviewer reconcile affected history |

`form_open=FALSE` does **not** remove a manually entered Form choice. The Form's global **Accepting responses** switch is independent of both flags. Set it OFF during setup and closeout. Changing `scoring_active` can affect existing scoring, so do not set it FALSE merely because attendance closed. Review choice removal and scoring separately.

Suggested accurate Form description during manual operation: `Attendance choices are maintained manually by chapter officers from the reviewed Events list. Choose your event by its name in the list; you do not need to enter or remember its code. Officers update this dropdown manually using the Events sheet. Contact the Points officer if the event is missing.` Remove a claim that choices update automatically unless a maintainer separately installs and tests sync, including closed events and rollback.

## 4. Use the aligned August–July year (N06)

The selected convention is **August 1 through July 31**, with **Fall August–December, Spring January–May and Summer June–July**. First annual events begin in August. Use the same year/term labels across Points, attendance, monthly reporting and finance.

| Consumer | Required definition for 2027–2028 |
|---|---|
| Events academic year | August 1, 2027 through July 31, 2028; July 2027 belongs to 2026–27 |
| Events term | Fall Aug–Dec; Spring Jan–May; Summer Jun–Jul |
| Monthly Points dashboard | Twelve month rows August 2027 through July 2028 |
| Budget annual dates | August 1, 2027 through July 31, 2028 |
| Budget Fall/Spring | Fall Aug 1–Dec 31, 2027; Spring Jan 1–May 31, 2028 |

Concrete boundaries to test:

| Date | Events calculation | Monthly Points window above | Budget |
|---|---|---|---|
| 2027-07-31 | Summer 2027, year 2026–27 | Outside this annual window | Outside annual dates |
| 2027-08-01 | Fall 2027, year 2027–28 | First represented month | First annual/Fall day |
| 2027-12-31 | Fall 2027, year 2027–28 | December row | Last Fall day |
| 2028-01-01 | Spring 2028, year 2027–28 | January row | First Spring day |
| 2028-05-01 / 2028-05-31 | Spring 2028, year 2027–28 | May row | Spring; May 31 is final Spring day |
| 2028-06-01 | Summer 2028, year 2027–28 | June row | Annual, outside Fall/Spring |
| 2028-07-01 / 2028-07-31 | Summer 2028, year 2027–28 | Last represented month | Annual; July 31 is final day |
| 2028-08-01 | Fall 2028, year 2028–29 | Outside this annual window | Outside annual dates |

The original mock evidence used July–June Monthly rows and May–July Events Summer. That evidence remains historical. A copy still showing those definitions needs correction before annual acceptance. Ask the named Points maintainer to check and, if needed, repair these formulas. Routine officers compare the resulting dates and charts; they do not make this repair themselves. The maintainer preserves a named pre-change version and records the cells/formulas changed:

| Maintainer check / repair | Exact inspected location | Required result |
|---|---|---|
| Event term formula | `Events!D2:D` populated formula rows | Fall when month >=8; Spring when month <=5; Summer otherwise. Use each row's C date; change an old <=4 threshold to <=5 only where needed |
| Monthly start and sequence | `Monthly Dashboard Staging!C2:C13` | C2 is `=DATE(VALUE(LEFT(Config!$B$3,4)),8,1)`; remaining eleven rows advance one month through July |
| Fall start | `Semester Dashboard Staging!C2` | Same August start; row 3 starts January of the following year |
| Fall/Spring filters | `Semester Dashboard Staging!D2:F3`, `H2:H3`, `J2:M3` | Each term ends at `EDATE($C2,5)` / `EDATE($C3,5)` where that inspected filter uses an exclusive end; preserve the rest of the filter. Fall is Aug–Dec, Spring Jan–May |
| Charts and Hub reporting | Monthly/semester charts and Hub review-period/annual-pace display | Same labels/window as the formulas; inspect actual generated dates and totals |

The Events August academic-year rollover already matched in the inspected version. If this copy has a different formula layout, inventory it before adapting the repair; do not paste formulas into guessed cells.

A monthly row being present does not prove that a boundary event contributes to it. Inspect that copy's filters and reconcile boundary events across the event, monthly and semester outputs. Record the actual cells changed, before/after formulas and results in Transition Notes. Test the dates above before activation; preserve original history and do not move an already-scored event to another year without reviewed reconciliation.

For new automation runs, `datePolicy` explicitly supplies the six Budget dates and a review note confirming the selected convention. The engine rejects dates outside this convention. It does not rewrite Points Events or Monthly Dashboard formulas or certify their live behavior; those require the separate readback and boundary tests.

## 5. Maintainer procedure: connect the export to this year’s working file

The **Points Master** is the private working spreadsheet; **Points Export** is the separate spreadsheet used for public results. **Budget Tracker** and **Budget Export** have the same working-file/public-results relationship. Each export must read from this year’s matching working copy, not the template or an earlier year’s file. A spreadsheet ID is the characters between `/spreadsheets/d/` and `/edit`. Preserve the surrounding formula, range, query and local calculations. Review a named pre-change version first.

Exact inspected Points Export map — **six formula cells**:

| Tab/cell | Source range in annual Points Master |
|---|---|
| `Leaderboard_Public!A1` | `Website Staging!A:O` |
| `Point_Values_Public!A1` | `Point Values!A:G` (existing QUERY retained) |
| `System_Status!A1` | `Website Status!A:B` |
| `Event_Metrics_Public!A1` | `'Dashboard Staging'!A1:L120` |
| `Monthly_Metrics_Public!A1` | `'Monthly Dashboard Staging'!A1:O13` |
| `Semester_Metrics_Public!A1` | `'Semester Dashboard Staging'!A1:O3` |

Exact inspected Budget Export map — **35 formula cells**, all in `Budget_Public`:

| Cells | Count | What is imported |
|---|---:|---|
| `C2:C6` | 5 | Annual label, income, approved expense, pending expense and confirmed-plan/legacy fallback |
| `C10:C37` | 28 | Alternating actual/category plan values; keep both branches in the existing formulas |
| `C38` | 1 | `'Funding Setup'!B12` confirmation state |
| `F2` | 1 | `Dashboard!K5` |

Also update the plain source link at **`Read Me!B3`** in Budget Export. That is a literal link, not a 36th import-formula cell. Some cells contain two IMPORTRANGE calls; count formula **cells** separately from calls.

1. Search all sheets within formulas for `IMPORTRANGE`. Inspect the map above and every first argument. All calls in one annual export must reference its reviewed master ID, whether written as a bare ID or full Sheets URL. Unknown sources or a changed map require maintainer review.
2. Use Find and replace on the exact reviewed old master ID, all sheets, within formulas, regex and whole-cell matching OFF. Review examples before Replace all. Replace only the intended source ID. If that same text occurs elsewhere within a formula, edit the first-argument source explicitly so unrelated strings stay intact. Do the plain Read Me link separately.
3. Search again for the old ID: no old import source may remain. Reopen each listed cell's formula bar and compare every source argument with the correct copied master. Do not change local formulas in between these import cells.
4. In each private export, review Google's `#REF!` prompt and select **Allow access** only after confirming that the two copied files are the intended pair. Access authorization is separate from formula replacement. `Loading`, `#REF!`, or an error suppressed to zero is not a verified financial result.
5. Read effective values after imports resolve: Points System_Status should show `TESTING` and the correct term/year notice; compare point values and metric headers with the master staging tabs. For Budget, compare year dates, confirmation state, income, approved expenses, pending requests, category plan and remaining balance directly with the tracker. Keep links and timestamps with the comparison.
6. Run populated privacy checks and signed-out/public checks only through the approved isolated release route. Empty member output establishes an empty baseline, not successful suppression of populated private records.

## 6. Delivery, scoring, recovery and privacy evidence

Run these only in isolated approved copies with clearly fictional profiles and the specifically approved account/email payload. Use the actual approved event rules; this example uses a 5-point Welcome meeting and an 8-point CAD workshop. Do not add responses directly to a sheet to simulate Form delivery.

| Case | Form submission | Required result |
|---|---|---|
| C01 | First profile `test.9001`, Full name, Welcome | Response arrives in the intended tab; ACTIVE profile; 5 points |
| C02 | Same identity, returning branch, same Welcome | Delivered; DUPLICATE_SUBMISSION; zero additional points and review item |
| C03 | Same identity, returning branch, CAD | 8 additional points; total 13; two scored events |
| C04 | `test.9002`, returning branch before any profile, CAD | MEMBER_NOT_FOUND; zero points and review item |
| C05 | Same `test.9002`, first-submission branch, complete profile, First name + last initial, Welcome | First complete profile becomes ACTIVE; correct initials; 5 for Welcome. Earlier CAD stays zero/review pending separate Points-officer decision |

For each case compare the actual Form response, linked response tab, Roster, Point Log, private Member Totals and Review Queue. Keep the five-case skipped-profile recovery sequence in every affected regression test. A separate fresh-member initials case is needed when verifying the ordinary initials path independently of recovery. Record expected and observed values separately. The round-2 October 4 pre-repair C05 failed. Recalculation after repair produced the expected recovered ACTIVE profile and 5-point new event on the same five retained browser responses; the earlier unmatched event stayed zero/review. Repeat this sequence on intended annual files after any relevant formula change.

Suggested first-submission helper: `Choose Yes for your first check-in this academic year, even if you belonged last year. Choose No only after completing your profile in this year’s Form.` Suggested Event ID helper: `Choose your event by name. Officers update this dropdown manually using the Events sheet; you do not need to enter or remember the code.` Keep the existing question titles, choice labels and response order.

Suggested confirmation: `Your response was received. This confirms receipt, not earned points. If you skipped your profile on your first check-in this year, contact the Points officer. They will help you complete your profile and review the earlier attendance separately.` Use that action only with the maintainer-confirmed recovery workflow; do not promise automatic old-event credit.

The selected public display choices remain **Full name** and **First name + last initial**. Keep those two exact choices in the existing **Public leaderboard display** question, keep **Public alias** in its current position, and preserve the A:L response column order. Suggested question description: `Choose how you appear on the public leaderboard: your full name or first name plus last initial. For a profile or visibility concern, contact the Points officer privately.`

The existing Roster formula also recognizes the legacy strings **Alias** and **Private (not shown)**. Their presence in a formula does not make them available Form choices, and the separate Public alias answer does not override the selected two-mode display. Keep the existing Public alias question and add helper text: `Optional compatibility field. Your alias is not used by the Full name or First name + last initial choices.` Do not instruct members to select unavailable modes or promise opt-out behavior that has not been verified. Refer a privacy request privately to the Points officer for a reviewed source-profile and export handling decision; never overwrite a calculated Roster row.

Test both offered choices using fictional populated members and verify their display text. Verify email/name.number/private notes do not appear in exports. If a retained historical Alias or Private profile exists, inspect its effective output separately so compatibility behavior is not confused with available intake choices. Separately switch the isolated master between `TESTING` and `PAUSED` and verify populated member output and any snapshots remain suppressed. Review every public tab, then inspect the authorized public surface signed out. Restore the approved status and closed-intake baseline, then have the Points maintainer follow the [test cleanup checklist](finance-settings-launch.md#test-cleanup-checklist-for-the-points-maintainer) in both Form and response sheet and preserve evidence. Changing Form descriptions cannot prove a working privacy boundary.

Submissions/scoring, populated suppression, signed-out output and trigger installation remain separate live gates. Record **NOT RUN**, **FAIL** or the observed result; never infer PASS from a saved link, template formula or this worked example.
