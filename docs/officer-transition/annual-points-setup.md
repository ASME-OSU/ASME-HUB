# Annual Points, attendance and export setup

Use this detail beside T05–T09 in the Transition to New Year guide. Keep the annual copies private, Points `Config!B5` at `TESTING`, and the Form closed while configuring. The October 3, 2026 mock run proved native linking and formula/import readbacks. It submitted no attendance, so its delivery, scoring and populated privacy cases remain **NOT RUN**. Counts below describe that inspected template version; recheck a changed template.

## 1. Link the actual Form response tab — Config B7 alone is insufficient (N03)

1. Open the **copied** attendance Form in edit mode. Select **Responses → Link to Sheets → Select existing spreadsheet** and choose this year's **copied Points Master**. Use **View in Sheets** to open the destination. Compare its `/spreadsheets/d/…` file ID with the annual Points link, not only its title.
2. Copy the exact generated tab name. Google chose `Form Responses 3` in the rehearsal; your copy may differ. Keep the old placeholder tab until readback and test reconciliation finish. Do not rename or delete tabs to make the setup appear correct.
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
5. Before changing formulas, save a named version through **File → Version history → Name current version**, such as `Before annual response wiring — 2027–2028`. In **Edit → Find and replace**, enter these exact fragments for the rehearsal example:

   ```text
   Find:         'Form Responses 2'!
   Replace with: 'Form Responses 3'!
   Search:       All sheets
   Check:        Also search within formulas
   Uncheck:      Match entire cell contents
   Uncheck:      Search using regular expressions
   ```

   Substitute your actual tab name in Replace with; retain the single quotes and `!`. Select **Find** and inspect examples in **Roster** and **Point Log** before using **Replace all**. If the name itself contains an apostrophe, ask the maintainer to review its formula quoting.
6. Record both counts. This inspected copy changed **12,988 formula cells in Roster and Point Log**, containing **16,984 occurrences**. Sheets may report replacements/occurrences instead of distinct formula cells. Those quantities are different. Stop and inspect a mismatch; do not repeat blindly to force this count. A previously configured or revised copy needs its own before/after inventory.
7. Search all sheets within formulas again: the old fragment must have **zero** remaining references. Inspect formula bars in `Roster!A2`, `Roster!B2` and `Point Log!D2`: they must reference the actual linked tab. Independently reopen the Form's View in Sheets and compare it to Config B7/B16. A green Config cell alone does not establish this connection.
8. Perform the authorized isolated delivery/scoring cases in section 6. Do not type test rows directly into calculated tabs to simulate a successful Form delivery.

If the replacement affected the wrong annual file or fragment, close intake and restore the named pre-change version in that copy after reviewing what changed since it was named. Preserve the evidence and correct links before trying again; never roll back the production workbook to repair a mock copy.

The optional private [setup runner](../../integrations/apps-script/ANNUAL_SETUP_AUTOMATION.md) performs exact fragment replacement and count checks, with an observed Form tab and independent readback. It is a maintainer route requiring private configuration, not an installed feature inferred from a copy dialog.

## 2. Roster comes from member submissions (N04)

**Do not enter a membership list into Roster or overwrite Point Log.** Their existing formula rows calculate from the raw response tab. A new member creates the profile through the Form's **Yes - first submission** branch, using the required profile fields. A returning member uses the same normalized OSU name.number and the returning branch. The email field is collected by Google according to the Form settings; use only the approved test identity when rehearsing.

| Situation | Officer action | Evidence to inspect |
|---|---|---|
| New fictional member `test.9001` | Submit the first-submission branch with a fictional profile and approved event | Raw response A:L, generated Roster profile and Point Log result |
| Returning `test.9001` | Use the same name.number and another approved event | Same member identity; new event contributes once |
| Returning `test.9002` without a profile | Inspect the review record; arrange an appropriate first-submission profile through the Form | Expected `MEMBER_NOT_FOUND` and zero points until resolved; do not manufacture a Roster row |
| Duplicate member/event | Keep the delivery evidence and inspect duplicate processing | Expected `DUPLICATE_SUBMISSION`; zero additional points |
| Approved point correction | Use the workbook's **Adjustments** inputs and its current README/header instructions | Member key, approved amount/reason and reviewer; calculated totals reconcile |
| Profile or display correction | Record the request privately and have the Points maintainer review the source-profile correction | Original source and corrected result; no calculated formula overwritten |

An adjustment corrects approved points; it does not create a missing member profile. Do not invent an adjustment amount to hide an unmatched or duplicate record. If a copied version's Adjustments headers or approval rules are unclear, retain the issue for the Points reviewer before scoring it.

## 3. Events and the Form run in manual mode (N05)

**Current operating mode: manual Events-to-Form choices.** A Google copy dialog can say attached Apps Script functionality copies. That message does not prove triggers, properties or event synchronization were installed. The prepared template has no installed event sync, and the setup runner does not install one.

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

Suggested accurate Form description during manual operation: `Attendance choices are maintained manually by chapter officers from the reviewed Events list. Choose the listed event ID. Contact the Points officer if the event is missing.` Remove a claim that choices update automatically unless a maintainer separately installs and tests sync, including closed events and rollback.

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

The original mock evidence used July–June Monthly rows and May–July Events Summer. That evidence remains historical. A copy still showing those definitions needs correction before annual acceptance. A maintainer must preserve a named pre-change version, move the first Monthly Dashboard month to August (with subsequent months through July), and change the Events Spring threshold from month `<=4` to `<=5`. The Events August year rollover already matches. Review Semester Dashboard filters and Hub review-period/annual-pace calculations too; their labels and totals must follow the same convention.

A monthly row being present does not prove that a boundary event contributes to it. Inspect that copy's filters and reconcile boundary events across the event, monthly and semester outputs. Record the actual cells changed, before/after formulas and results in Transition Notes. Test the dates above before activation; preserve original history and do not move an already-scored event to another year without reviewed reconciliation.

For new automation runs, `datePolicy` explicitly supplies the six Budget dates and a review note confirming the selected convention. The engine rejects dates outside this convention. It does not rewrite Points Events or Monthly Dashboard formulas or certify their live behavior; those require the separate readback and boundary tests.

## 5. Replace every import source, then verify resolved output (N07)

Use each export's **copied annual master**, not the template or an earlier year's master. A spreadsheet ID is the characters between `/spreadsheets/d/` and `/edit`. Preserve the surrounding formula, range, query and local calculations. Review a named pre-change version first.

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

## 6. Delivery, scoring and privacy evidence (N03/N04/N11)

Run these only in isolated approved copies with clearly fictional profiles and the specifically approved account/email payload. For the prepared mock events, expected results are: new `test.9001` at Welcome **5** points; duplicate Welcome **0 additional**; CAD Workshop **8 additional**, total **13**; unregistered returning `test.9002` **0**, with `MEMBER_NOT_FOUND`. Reconcile the raw Form response, correct linked tab, profile, Point Log review reason, totals and export. Those are expected results; none passed in the October 3 mock run.

The selected public display choices remain **Full name** and **First name + last initial**. Keep those two exact choices in the existing **Public leaderboard display** question, keep **Public alias** in its current position, and preserve the A:L response column order. Suggested question description: `Choose how you appear on the public leaderboard: your full name or first name plus last initial. For a profile or visibility concern, contact the Points officer privately.`

The existing Roster formula also recognizes the legacy strings **Alias** and **Private (not shown)**. Their presence in a formula does not make them available Form choices, and the separate Public alias answer does not override the selected two-mode display. Explain that field as retained for compatibility and optional under the current two-mode workflow. Do not instruct members to select unavailable modes or promise opt-out behavior that has not been verified. Refer a privacy request privately to the Points officer for a reviewed source-profile and export handling decision; never overwrite a calculated Roster row.

Test both offered choices using fictional populated members and verify their display text. Verify email/name.number/private notes do not appear in exports. If a retained historical Alias or Private profile exists, inspect its effective output separately so compatibility behavior is not confused with available intake choices. Separately switch the isolated master between `TESTING` and `PAUSED` and verify populated member output and any snapshots remain suppressed. Review every public tab, then inspect the authorized public surface signed out. Restore the approved status and closed-intake baseline, reconcile test cleanup in both Form and response sheet, and preserve evidence. Changing Form descriptions cannot prove a working privacy boundary.

Submissions/scoring, populated suppression, signed-out output and trigger installation remain separate live gates. Record **NOT RUN**, **FAIL** or the observed result; never infer PASS from a saved link, template formula or this worked example.
