# Maintainer repair: first complete profile and earlier attendance

Use this reference for an existing annual Points Master that fails the
[skipped-profile recovery test](annual-points-setup.md#6-delivery-scoring-recovery-and-privacy-evidence).
The coordinator names the Points maintainer in the private handoff. Routine
officers contact that maintainer; they do not edit calculated rows themselves.

The October 4, 2026 repair selects the **first complete profile** for each member
and matches attendance only to an ACTIVE profile on the **same or an earlier
response row**. It prevents an attendance-only or incomplete profile from taking
primary status and prevents a future profile from silently awarding old attendance.

## Preserve and check before editing

Close **Responses → Accepting responses** in the copied Form and keep Points
`Config!B5=TESTING` or `PAUSED`. Confirm the exact annual file, response destination
and twelve headers. Save a named spreadsheet version and a private raw-response
backup. Record the existing formulas and their filled ranges before changing
anything; coordinate with any other editor.

Check that raw responses, Roster and Point Log align by row and that their
`source_row` formulas still equal `ROW()`. **Do not sort, delete or rearrange
response/calculated rows.** This repair relies on that alignment to distinguish
an earlier attendance record from a later profile. Keep the existing
`Roster!L` completeness formula, display formula, identity keys, response-tab
references, duplicate handling and scoring rules unchanged.

## Exact repaired formulas

For the inspected layout, replace these three row-2 formulas and fill each down
through **row 1000**, using formula fill so ending row references advance. These
are **999 formulas per column, 2,997 total**. Do not paste constants or use an
identical row-2 formula in every row. If the copy has another layout/range, stop
and review its dependencies before adapting this repair.

`Roster!I2` — incomplete profiles are REVIEW; only a complete primary profile is
ACTIVE:

```text
=IF($D2="","",IF(NOT($L2),"REVIEW",IF($K2,"ACTIVE","DUPLICATE_PROFILE")))
```

`Roster!K2` — count only actual complete profiles (`L=TRUE`) for the same member
through the current row:

```text
=IF($D2="","",IF(NOT($L2),FALSE,COUNTIFS($B$2:$B2,$B2,$L$2:$L2,TRUE)=1))
```

`Point Log!E2` — match an ACTIVE profile only through this attendance row:

```text
=IF($A2="","",IF(COUNTIFS(Roster!$B$2:$B2,$C2,Roster!$I$2:$I2,"ACTIVE")>0,"MATCH","REVIEW"))
```

Attendance-only rows with blank first name retain their blank profile status.
An incomplete profile with a first name remains REVIEW/nonprimary. A later
complete profile can become the first ACTIVE profile. A later duplicate complete
profile cannot replace an existing primary profile or its display name; attendance
at a new qualifying event can still match the earlier ACTIVE profile.

## Verify saved formulas and behavior

Reopen the saved formulas at rows 2, 6 and 1000 and check **all three filled
columns**, including their advancing range ends. Record an independent formula
inventory: formula count and response-tab reference count must remain unchanged,
and only Roster I/K and Point Log E may differ. Keep raw responses, timestamps,
notes, Config, Event IDs/flags and other formulas intact.

Recalculate the five retained fictional Form cases on approved isolated copies;
no new response rows are needed when those fixtures already exist:

| Case | Expected after repair |
|---|---|
| C01: first complete profile, 5-point event | ACTIVE/primary; 5 |
| C02: same member and same event | Zero additional; DUPLICATE_SUBMISSION review retained |
| C03: same member, second 8-point event | 8 additional; member total 13 |
| C04: returning branch before any profile | Zero; MEMBER_NOT_FOUND review retained even after C05 |
| C05: same identity's first complete profile, initials mode, different 5-point event | ACTIVE/primary/complete; initials display; 5; member total 5 |

Inspect Roster, Point Log, private Member Totals and Review Queue; the five awards
must be **5, 0, 8, 0, 5**, with only the duplicate and earlier unmatched cases
remaining open among those fixtures. Check incomplete-to-complete profiles and
later duplicate profiles separately when they are not covered by the retained
cases. Verify populated TESTING/PAUSED export suppression again; private scoring
must not appear in public member output.

**Recovery does not back-credit the earlier unmatched event.** The Points officer
reviews its actual attendance evidence and any approved correction through
**Adjustments**. Resubmitting that same rejected event is counted as another
same-member/event submission and does not bypass duplicate handling. An adjustment
does not create a missing profile. Preserve the original attendance and review
decision; do not delete history to obtain points.

The October 4 native check recalculated the same five preserved browser
submissions and verified these formulas on the approved original template and
isolated second mock, rows 2:1000. That evidence does not certify every existing
annual copy or newly submitted post-repair responses. Check each intended annual
file before accepting the recovery gate. A changed original template version also
requires a fresh reviewed source inventory before future automated provisioning;
do not reuse or reset old approvals/journals.

If a check fails, keep intake closed and the file non-live. Preserve failure
evidence and review changes since the named backup before restoring only the
intended copy. Do not restore production or erase response history to repair a
mock. Record the final observed result and recovery contact privately.
