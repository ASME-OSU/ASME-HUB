# Officer handoff: start here

Open the [Officer Hub](https://asme-osu.github.io/ASME-HUB/) → **Transition to New Year → Open transition guide**. Work through the five steps in order. You can read later steps without marking them complete. Real handoff has **20 applicable reviews** (1/4/7/5/3 by step); Practice has **16** (1/4/7/2/2). Reviews are manual observations: saved links, examples and downloads do not pass them.

## 1. Choose your year

The questions are inside Step 1 → **Start here**. Enter the first year, such as **2027** for 2027–2028, choose **Real handoff** or **Practice**, then **Start checklist**. To return to existing work, choose its entry under **Saved checklist for this year** and **Continue checklist**. Changing the year loads that year’s saved checklists.

Ask the President which chapter account to use and who can help with access. Confirm the shared officer workspace and filled private checklist open with your approved role access. Record missing permissions with the owner and next action. The **Annual Setup access check is in Step 2**, where its link and profile instructions are available. Annual files are created or reopened there.

### Words used here

| Word | Meaning |
|---|---|
| Control Center | The chapter settings spreadsheet. Practice uses a separate copied settings spreadsheet. |
| Export | A separate workbook containing approved results from a working master. It is not automatically public or approved for sharing. |
| Maintainer | The person who fixes and verifies the tools. |
| Readiness record | Dated evidence identifying the owner, files, checks and observed results. |
| Inactive / current | Inactive means not enabled; current means the year selected by the chapter tools. These are separate settings. |
| Suppression | Hiding member rows from an export while preserving private working records. |
| Consumer | A tool using shared results or settings: the Hub, website, Form or newsletter. Each needs its own check. |
| Ledger / projected ledger | Current approved cash balance / balance including pending entries. Neither proves bank reconciliation. |
| Preheader | The preview line beside a newsletter subject in an inbox. |
| JSON | A text backup containing named fields that the tool can import. |

## 2. Prepare this year’s files

Before opening Annual Setup, use **Chrome’s ASME profile** with **asmeohiostate@gmail.com as its only signed-in Google account**. Ask the President for help if another account appears in the Google account menu. Missing workspace approval or permission stays **Blocked**; do not create files in another account to bypass it.

Choose **Open Annual Setup**. The year and purpose come from Step 1. Check the saved workspace purpose: **Real handoff** and **Practice only** must use separate folders and settings sheets. Old unconfirmed settings require the President’s review; do not relabel practice files as real. **One designated operator** creates or reopens the year’s files; everyone else reuses those same files.

Answer **How many different members do you want to attend this year?** Each person counts once. Last year’s goal is an editable suggestion for a new year, subject to the President’s approval. For a year that already has files, the saved goal is shown and kept.

Choose **Create or reopen this year’s files**. Keep the page open. If setup stops, return to the same year and workspace to resume. Setup creates attendance and budget files, fills dates, connects exports and saves an inactive/noncurrent year. Last year’s files remain records. The maintainer handles clean sources, configuration, script installation and mismatches; repository source does not prove native installation.

Choose **Copy setup results**, return to Step 2 in the Hub, paste into **Paste setup results**, then choose **Save setup results**. No handoff-file download or seven separate pastes are needed. If automatic copying fails, select the displayed result and press Command+C on Mac or Ctrl+C on Windows. Downloads remain optional backups.

### Compare the four Step 2 reviews

Open the seven saved links and the actual Google files. In **Annual Setup → Optional backup and detailed settings**, find the readable summary, actual row number and file identities. The summary supplies expected values; it is not a fresh read of Google. Record expected and observed results separately. Missing evidence stays Blocked with its responsible owner.

| Review | Where to check | Expected result | Who checks it |
|---|---|---|---|
| V01 Clean sources and annual readiness | Maintainer’s dated readiness record | Applies to these canonical sources and annual copies; identifies imports and verified event-update method. Setup itself leaves clean-source review, access, imports and approvals unverified. | Maintainer supplies evidence; officer confirms scope. |
| V02 Actual response destination | Form editor → Responses → View in Sheets; Points Config B7/B16 | Opens this year’s Points Master and actual response tab; B7 equals that tab and B16 equals the Form ID. Fresh copies have zero responses and closed intake. For resumed files, inventory retained records rather than clearing them. | Officer checks destination; maintainer resolves mismatches and other-tab inspection. |
| V07 Fresh settings read | Correct Control Center → Hub_Settings_Public; actual row A:T | A is selected year; row matches summary; C is approved goal; J is approved calendar; K is_active and L is_current are FALSE before launch. Reload the actual row. Practice uses copied Control Center. | Officer compares; approved settings owner or maintainer resolves errors. |
| V21 Readable setup summary | Seven links; Points Config B2/B3/B5; each export Config B1; Budget Setup & Lists | Actual identities match links; B2 = Fall starting year, B3 = short year, B5 = TESTING; export B1 matches its working copy ID. Budget B4/B5 = Aug 1 / Jul 31, B11/B12 = Aug 1 / Dec 31, B13/B14 = Jan 1 / May 31. | Officer compares values; maintainer verifies technical evidence and errors. |

For **2027–2028 only**, Budget B4/B5 are 2027-08-01 / 2028-07-31; B11/B12 are 2027-08-01 / 2027-12-31; B13/B14 are 2028-01-01 / 2028-05-31. Substitute your selected starting and ending years. Saving links does not pass reviews or activate the year.

## 3. Check attendance and finances

### Real handoff

Review actual event settings, approved finances, bank reconciliation, both export imports and the maintainer’s dated readiness record. Use existing evidence or agree separate Practice files for exercises. Do not enter fictional attendance or transactions in real working files. Missing technical evidence is Blocked and assigned to the maintainer; missing financial approval or reconciliation goes to the Treasurer.

### Practice only

All mock events, five submissions, budget arithmetic and status changes below belong exclusively in isolated practice copies. Inventory any retained entries before adding more.

Open the copied Points Master README. Enter only yellow input cells. In **Events**, enter **B event_name**, **C event_date**, **F event_type**, **H scoring_active** and **I form_open**:

| Event | C event_date | F event_type | Calculated points |
|---|---|---|---|
| MOCK Fall | September 15 of selected starting year | General Body Meeting | 5 |
| MOCK Spring | January 15 of selected ending year | Technical Workshop | 8 |

For 2027–2028 these are September 15, 2027 and January 15, 2028; use your selected year. Set H and I TRUE only during the approved private test window. Preserve calculated **A event_id, D term, E academic_year and G points**. Event type determines points.

Choose **ASME Tools → Enable automatic event sync** once in this annual copy. Complete approved owner authorization if requested. Edit a mock event name through Sheets, keeping `MOCK`, and confirm the copied Form’s Event ID dropdown changes. API edits alone do not exercise an edit trigger. **Sync Events to Google Form** is the manual retry/fallback; it preserves intake state.

Use the Form’s **Publish → Manage responders** to restrict access to approved testers. If unpublished, publish this private practice Form, explicitly enable **Accepting responses** for approved testers, then confirm the respondent questions open. Publishing and intake are separate; do not distribute the practice link. **name.number** means the OSU username-style identifier: **A = `rehearsala.999`; B = `rehearsalb.999`**. Use exactly the same identifier for each member in every case and the displayed **Yes/No** choices for **“Is this your first submission this academic year?”** Complete all required profile fields when specified. Preserve approved account/email collection rules.

Submit in this order using **Submit another response** between cases:

| Case | Member and exact name.number | First submission answer | Event | Expected awarded points |
|---|---|---|---|---|
| 1 | A — rehearsala.999 | Yes; complete profile | MOCK Fall | 5 |
| 2 | A — rehearsala.999 | No | Same MOCK Fall | 0; duplicate exception |
| 3 | A — rehearsala.999 | No | MOCK Spring | 8 |
| 4 | B — rehearsalb.999 | No; deliberately omit profile | MOCK Fall | 0; missing-profile exception |
| 5 | B — rehearsalb.999 | Yes; complete profile | MOCK Spring | 8 |

Verify five arrivals in the summary’s actual response tab and no new rehearsal rows in other response tabs in that copied workbook. In Point Log, Member Totals and Review Queue, expect annual A = 13, B = 8; with Fall current, term A = 5, B = 0. Both exceptions remain visible and reviewable. B’s later profile does not resolve earlier unmatched attendance automatically. Save actual observations.

Close **Accepting responses**, set both Events I `form_open` FALSE and sync. Reload the respondent URL and confirm intake is closed. Keep scoring definitions for evidence until reviewed cleanup.

Open both copied exports and authorize only their matching copied working masters. Import access can expose a source to destination editors; keep these files private. In copied **Points Master → Config!B5**, verify **TESTING**; inspect copied **Points Export → Leaderboard_Public** for headers but no member rows. Set B5 **PAUSED**, inspect again, then restore B5 **TESTING** and confirm suppression. Approved aggregate/status tabs can contain data. This populated-member suppression check is separate from public-field approval.

### Practice budget check

Use a clean isolated practice copy or have the reviewer inventory prior entries and starting balances. Budget **Start Here** identifies yellow inputs. Mock review is fictional and supplies no real funding authority.

1. **Plan setup:** Funding Setup **B5:D5 = 100, 0, 0**, **B6:D6 = 0, 0, 0**, **B8 = `None — MOCK rehearsal only`**. Category Budgets **B5 = 100**, other **B5:C18** allocations zero. Confirm Category Budgets **B23:C23 = 0, 0**, then record mock review in Funding Setup **B10**.
2. **Transactions:** enter three dated MOCK rows within the selected academic year for the same OSU Bank Account: **Income 100 Approved**, **Expense 20 Approved**, **Expense 10 Pending Approval**. Preserve calculated Semester and Signed Cash Flow columns.
3. **Comparison:** with the intended zero opening baseline, the approved ledger is **80** (100 − 20); projected ledger is **70** after the pending expense; pending expense is **10**; approved spending-plan remaining is **80** (100 plan − 20 approved expense). Compare Tracker and Budget Export separately. **Setup & Lists B7** is Huntington’s opening balance, not an allocation input; do not change an existing balance to force these totals.

The Tracker category table can read legacy **Budgets** and display numeric zero as a dash. The confirmed export plan reads **Category Budgets**. Label the source when comparing; a dash in the legacy table does not disprove the approved 100 plan. Preserve formulas. See [finance source distinctions](finance-settings-launch.md#legacy-category-table-and-confirmed-plan).

Run **ASME Tools → Run Pre-Flight Sanity Check** and save the actual report. It checks wiring, not submissions, import permissions, funding approval or owner sign-off. Record differences as Blocked with observed result and responsible maintainer.

## 4. Check calendar and messages

### Real handoff

Compare actual approved calendar records, dates, times, time zones and locations. Open **Newsletter Builder** from Step 4 and preserve the draft with **Templates → Export Draft .json** before editing. Update **Settings → Email Subject Line / Preheader Text**, **Links** for annual quick links, **Design → Footer Org Name / Footer Address Line**, and **Announce → Message / Author Attribution** for issue text and officer signature. The President supplies approved sender/reply-to, full postal address, links and dated facts; missing inputs stay Blocked.

The authorized Webmaster uses **WordPress Admin Login → Pages → Leadership** or the intended page, preserves existing content, edits the approved draft, chooses **Save Draft**, reloads and checks **Preview** on desktop/phone. Links can belong to other pages; use the [public-page map](communications-rollover.md#webmaster-t04-public-page-source-and-publication-map). Obtain content-owner approval before publishing or sending.

### Practice only

Use a clearly labeled MOCK newsletter and preserve the existing draft before edits. In Newsletter **Calendar**, enter your full selected year and choose **Load fictional Fall/Spring**. Check both semesters, the **FICTIONAL REHEARSAL** label and Desktop/Mobile previews. Finish with **Remove fictional events → Upcoming**. Repeat the fictional preview on the **Public Events Calendar** generated list, then **Remove fictional events → Upcoming dates**. Verify the fictional label disappears and chapter status returns; **Refresh chapter snapshot** retries a failed load. These previews create no Google events; the embedded Google calendar is a separate live view. Keep the practice issue unsent.

### Shared backup and recovery instructions

Keep three distinct backups: Hub **Export progress**, Hub **Download private links backup**, and Newsletter **Templates → Export Draft .json**. Follow the [three-file recovery procedure](recovery-practice.md) for field examples and a restore in a separate persistent browser profile. Real officers review the maintainer’s dated recovery evidence; assigned Practice operators perform the restore. A download alone is not restoration evidence.

## 5. Approve and start the year

### Real handoff — Approve and start the year

Real activation requires incoming acceptance, required reviews, actual funding/reconciliation and coordinator launch approval. Keep a separate launch rollback plan identifying previous year/settings, before-change snapshot, named restore operator, exact restore actions, failure/stop criteria and decision/contact route.

At the approved time, only the authorized settings owner sets the verified new row **is_active = TRUE**, **is_current = TRUE** and Points **Config!B5 = LIVE**. Set the previous year’s **is_current = FALSE**, preserving its records. Do not clear its active flag unless the approved plan requires that. Check the intended intake state and recheck **Hub, website, Form and newsletter**. An unresolved review means no launch; record the missing item, owner and next action.

### Practice only — Close and review your practice run

End with Points **TESTING**, Form intake closed, all event `form_open` FALSE and settings inactive/noncurrent. Record activation **Skipped — Rehearsal only**. Preserve evidence or perform reviewed cleanup and obtain reviewer acceptance; never activate Practice files.

For MOCK attendance cleanup, use **ASME Tools → Clear Test Data** only after the owner approves the reviewed disposition. It requires the exact annual Form/tab and closed TESTING state, verifies a private archive, then removes reviewed response IDs/raw rows. Original Google Form response IDs cannot be restored. Cancel to retain evidence. Event definitions, adjustments and budget inputs need separate input-cell review; preserve formulas. Mixed real/unmarked attendance stops cleanup. If the menu is missing, reload once; older copies require maintainer updates because template code does not propagate to existing copies.

## Progress and starting again

The progress bar counts passed reviews and completed steps. Select **Yes — I checked** only for actual observations. When tasks and applicable reviews are done, choose **Mark step complete**. **Read next step** only moves between instructions; Blocked or Failed does not advance progress. Practice’s final activation skip counts only after required Practice reviews and reviewer acceptance. A NO-GO message summarizes remaining prerequisites; **Reviews still needed** lists the actual work and step links.

To start again, choose **Reset checklist progress**, read the named checklist/year, then **Start fresh checklist**. It starts without results/notes and carries only saved links. The prior checklist remains under **Step 1 → Start here → Saved checklist for this year → Continue checklist**. Unsaved edits do not carry over. This does not create Google files or grant launch approval.
