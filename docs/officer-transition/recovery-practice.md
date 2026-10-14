# Practice restoring your three backups

Use this procedure for the assigned recovery operator in a separate persistent browser profile, keeping the original working checklist and newsletter intact. A private or Incognito window is not a persistent recovery workspace. Real handoff officers review the maintainer’s dated recovery evidence; a new restore test requires assigned scope. The President names the reviewer and approved storage/account route. Use this year’s actual saved files, not another year’s tools.

## Download from your working profile

1. In the Hub, choose **Step 1 → Start here → Saved checklist for this year → Continue checklist** to reopen the intended checklist. Under **Saved links and backup tools → Progress backup and print**, choose **Export progress**. This `.json` file contains year, checklist name/mode, step results and notes.
2. Under **Saved links and backup tools → Saved links**, save and review the links, then choose **Download private links backup**. This second `.json` file contains annual tool and private record URLs; progress alone does not include them.
3. In Newsletter Builder, choose **Templates → Export Draft .json**. Keep this editable issue backup, not just HTML. Do not choose New Issue or Reset during backup.
4. Find all three downloads and open each with TextEdit or another plain-text editor without editing or saving over it. **JSON is a text backup with named fields.** Compare the actual working screens with the actual backup values using the examples below. Keep files in approved private storage; never post them on GitHub.

### Expected versus observed examples

These are illustrative excerpts, not complete import files. Replace the example year/name/text with your actual checklist and draft. The URL is deliberately fictional, not a chapter file. Schema/version diagnostics belong to the maintainer.

| File | Expected from working screen | Observed in text backup |
|---|---|---|
| Progress | Year 2027–2028; checklist Practice 2027–2028 example; Step 1 note “Practice reviewer confirmed folder access.” | `year: "2027-2028"`; `run.name: "Practice 2027–2028 example"`; `notes.T01: "Practice reviewer confirmed folder access."` |
| Private links | Year 2027–2028; saved Points Master URL, plus all seven saved annual links | `year: "2027-2028"`; `links.pointsMaster: "https://docs.google.com/spreadsheets/d/FICTIONAL_PRACTICE_MASTER/edit"`; compare every saved tool URL in full, not only the title or one example. |
| Newsletter | Subject MOCK practice newsletter; preheader Private practice preview; content item MOCK workshop | `state.fields["s-subject"]: "MOCK practice newsletter"`; `state.fields["s-preheader"]: "Private practice preview"`; one `state.events` item with `title: "MOCK workshop"`. |

Progress also has `run.mode`, `steps` and check results. Private links has `links`, optional `mock` copied Control Center and `records` URLs. Compare all seven keys: `pointsMaster`, `attendanceFormEditor`, `attendanceFormRespondent`, `pointsExport`, `budgetTracker`, `budgetExport`, `annualFolder`. The newsletter identifies `kind: "asme-newsletter-draft"`, `version`, `exportedAt` and `state`. Record mismatches as Blocked; a matching example alone does not establish a restore.

## Restore in a separate Chrome profile

5. In Chrome’s profile menu choose **Add → Continue without an account** (wording may vary), naming the profile **ASME recovery practice**. Open the same official Hub/Newsletter Builder URLs as the working profile. Unlock the Hub with your authorized dashboard password. Google tool access still requires the approved account; do not change sharing to make a test easier.
6. Choose the same target year/mode. Under **Saved links and backup tools → Progress backup and print → Import progress**, select the progress download. Import creates a separate checklist. Compare year, checklist name/mode, steps and at least one saved note with the original.
7. In the imported checklist, choose **Saved links and backup tools → Saved links → Import private links backup**, select the separate links JSON, then **Save private link list on this device**. Compare all seven full URLs, optional copied Control Center and private record links with the working screens and setup summary. Changed links intentionally reopen affected reviews; confirm only observations actually rechecked. Recovery success is restored correct data, not preservation of every Passed label.
8. In the separate profile’s Newsletter Builder, choose **Templates → Import Draft .json**. Compare subject, preheader, at least one content item, target year and links with the original; inspect Desktop/Mobile previews and an editable field. Do not send or change the working profile’s draft.
9. Return to the working profile and confirm the original checklist/newsletter remain intact. Record actual result, reviewer/date and retained files: “I restored the three files in ASME recovery practice. The year, seven tool links, saved note and newsletter subject/preheader/content matched. [Reviewer] checked this on [date].” Record any mismatch as Blocked with owner/next action. A download alone never passes recovery.

## Practice calendar closeout

For assigned **Practice only** calendar previews, enter the full selected year (for example 2027-2028). After **Remove fictional events**, choose **Upcoming** in Newsletter Builder or **Upcoming dates** in the public generated list. Confirm the fictional label disappears and chapter status returns; **Refresh chapter snapshot** retries a failed load. The embedded Google calendar is a separate live view. These previews create no Google events or invitations.
