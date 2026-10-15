// Canonical mode-specific instructions. Review IDs, applicability and prerequisites remain stable.
// The UI expands event-date tokens from the checklist’s validated academic year.
export const TRANSITION_STEPS = [
  {
    "id": "T01",
    "roles": [
      "president",
      "secretary"
    ],
    "needs": [],
    "title": "Choose your year",
    "productionTitle": "Choose your year",
    "quickStart": "Start this Practice checklist, then confirm the approved workspace, test account and access/recovery contact.",
    "productionQuickStart": "Start this Real handoff checklist, then confirm the approved workspace, chapter account and access/recovery contact.",
    "instructions": [
      "Choose Practice in the questions above, then Start checklist. To resume, choose your saved checklist and Continue checklist. Practice keeps your results separate from the real handoff.",
      "Ask the President which approved test account, private folder and copied Control Center to use. Record the practice lead and access/recovery contact in the private checklist.",
      "Open the approved private workspace with that account. Missing workspace approval or permission stays Blocked; give the President the URL and access problem.",
      "Annual Setup access is checked in Step 2, where its link and account warning appear. Step 2 creates or reopens the practice files; Step 3 checks the reviewer’s access to them."
    ],
    "productionInstructions": [
      "Answer the two questions above, then choose Start checklist. To resume, choose your saved checklist and Continue checklist.",
      "Ask the President who leads the handoff, which chapter account to use, and who helps with access and recovery. Keep the approved instructions and role/access table in the current private checklist.",
      "Open the shared officer workspace using the approved account. Missing workspace approval or permission stays Blocked; give the President the URL and access problem. Annual Setup access is checked in Step 2, where its link and account warning appear.",
      "Step 2 creates or reopens the annual files; Step 3 checks access to them. Keep outgoing officers’ access until the incoming team accepts the handoff."
    ],
    "check": "Record each actual observation and approval separately below. Missing evidence stays unverified; assign its owner in the private checklist.",
    "productionCheck": "Record the actual result or the maintainer’s dated readiness record. Missing access, errors or approval stay Blocked; ask the President for the next action."
  },
  {
    "id": "T02",
    "roles": [
      "president",
      "secretary",
      "treasurer"
    ],
    "needs": [
      "T01"
    ],
    "resource": "templates",
    "templateActions": [
      "pointsMaster",
      "attendanceForm",
      "pointsExport",
      "budgetTracker",
      "budgetExport"
    ],
    "title": "Prepare this year’s files",
    "productionTitle": "Prepare this year’s files",
    "quickStart": "Use Sign in with chapter Google account, check the approved workspace and goal, then Create or reopen this year’s files. The Hub saves the seven links automatically. If connected setup is unavailable, use the manual fallback below.",
    "productionQuickStart": "Use Sign in with chapter Google account, check the approved workspace and goal, then Create or reopen this year’s files. The Hub saves the seven links automatically. If connected setup is unavailable, use the manual fallback below.",
    "instructions": [
      "Choose Sign in with chapter Google account below and select the approved chapter account in Google’s sign-in window. Confirm the selected year from Step 1. If sign-in is unavailable, follow the manual fallback instructions below.",
      "Check that Workspace says Practice. Open the approved annual workspace folder and Control Center links; they must be the separate private practice folder and copied settings spreadsheet. Missing approval, permission or a matching workspace stays Blocked for the President or maintainer.",
      "For a new Practice year, answer How many different members should attend this year? with the agreed fictional goal. For an existing year, the original saved goal is preserved; ask the President to review any change.",
      "Choose Create or reopen this year’s files and keep the Hub open. One designated operator handles setup; everyone else reuses the same files. If setup stops or authorization expires, sign in again and reopen the same year and workspace to resume. Preserve existing records.",
      "After a successful connected setup, confirm the Hub reports all seven links saved in this checklist. Open Optional backup and detailed settings for the setup summary. Saving links does not pass any review or verify access, clean sources or readiness.",
      "If connected setup is unavailable or not configured, use the external manual fallback. First choose Chrome’s ASME profile; asmeohiostate@gmail.com must be the only Google account signed in to that profile. Ask the President for help if another account is listed. This profile requirement applies to the external setup page.",
      "Under More help for this step, choose Open Annual Setup — manual fallback. Verify the same year, workspace purpose and goal, then create or reopen the files. Choose Copy setup results there. Return here, expand Manual fallback: open Annual Setup and paste results, paste into the Paste setup results box and choose Save setup results. Downloads are optional.",
      "Open each saved link and check the copy’s year. Use the Step 2 comparison aid below to inspect the actual Form destination and response tab, Points Config, copied Control Center row and Budget dates against the setup summary. Record all four reviews manually from actual observations and the maintainer’s dated evidence.",
      "Keep Points TESTING, Form intake closed and copied settings inactive/noncurrent until Step 3 opens the approved private test window. Missing readiness evidence stays unverified."
    ],
    "productionInstructions": [
      "Choose Sign in with chapter Google account below and select the approved chapter account in Google’s sign-in window. Confirm the selected year from Step 1. If sign-in is unavailable, follow the manual fallback instructions below.",
      "Check that Workspace says Real handoff. Open the approved annual workspace folder and Control Center links. If the workspace says Practice, lacks confirmation or lacks permission, record Blocked and ask the President or maintainer.",
      "For a new year, answer How many different members should attend this year? using the President’s approved goal. The suggested goal needs approval. For an existing year, the original saved goal is preserved; ask the President to review any change.",
      "Choose Create or reopen this year’s files and keep the Hub open. One designated operator handles setup; everyone else reuses the same files. If setup stops or authorization expires, sign in again and reopen the same year and workspace to resume. Preserve existing records.",
      "After a successful connected setup, confirm the Hub reports all seven links saved in this checklist. Open Optional backup and detailed settings for the setup summary. Saving links does not pass any review or verify access, clean sources or readiness.",
      "If connected setup is unavailable or not configured, use the external manual fallback. First choose Chrome’s ASME profile; asmeohiostate@gmail.com must be the only Google account signed in to that profile. Ask the President for help if another account is listed. This profile requirement applies to the external setup page.",
      "Under More help for this step, choose Open Annual Setup — manual fallback. Verify the same year, workspace purpose and goal, then create or reopen the files. Choose Copy setup results there. Return here, expand Manual fallback: open Annual Setup and paste results, paste into the Paste setup results box and choose Save setup results. Downloads are optional.",
      "Open each saved link and check the year. Use the Step 2 comparison aid below to inspect the actual Form destination and response tab, Points Config, Control Center row and Budget dates against the setup summary. Record all four reviews manually from actual observations and the maintainer’s dated evidence.",
      "Keep intake closed and the year inactive/noncurrent until Step 5 approval. Obtain the maintainer’s dated clean-source, import and event-update readiness evidence; missing evidence stays unverified."
    ],
    "check": "Record each actual observation and approval separately below. Missing evidence stays unverified; assign its owner in the private checklist.",
    "productionCheck": "Record the actual result or the maintainer’s dated readiness record. Missing access, errors or approval stay Blocked; ask the President for the next action."
  },
  {
    "id": "T03",
    "roles": [
      "secretary",
      "treasurer",
      "webmaster"
    ],
    "needs": [
      "T02"
    ],
    "title": "Check attendance and finances",
    "productionTitle": "Check attendance and finances",
    "quickStart": "In the isolated Practice copies, check the five fictional submissions and budget exercise, inspect export suppression, close intake and events, and record actual results.",
    "productionQuickStart": "Review real events, approved finances, exports and the maintainer’s dated readiness record. Resolve missing access and evidence before launch.",
    "instructions": [
      "Use only the isolated Practice copies. Open copied Points Master → README and edit the yellow inputs. In Events, enter B event_name, C event_date and F event_type: MOCK Fall / {fallEventDate} / General Body Meeting → 5 points; MOCK Spring / {springEventDate} / Technical Workshop → 8 points. Event type determines calculated points.",
      "Preserve Events A event_id, D term, E academic_year and G points. Wait for those automatic values. During the approved private test window, set both events’ H scoring_active and I form_open to TRUE.",
      "Choose ASME Tools → Sync Events to Google Form. Confirm each MOCK event appears once in the copied Form. Choose Enable automatic event sync once in this annual copy; edit a MOCK event name in Sheets while retaining MOCK, and confirm the Form choice updates. A manual sync alone does not prove the automatic trigger.",
      "In the copied Form, use Publish → Manage responders to restrict access to approved testers. Publish if needed, then enable Accepting responses and verify the respondent link shows the questions. Keep this mock link private.",
      "Submit the five cases below. name.number means the OSU username-style identifier: A = rehearsala.999 and B = rehearsalb.999. Reuse each member’s exact identifier. For “Is this your first submission this academic year?”, choose the table’s Yes or No; complete every required profile field in the Yes cases using fictional details.",
      "Check Point Log, Member Totals and Review Queue. Scores must be 5/0/8/0/8; annual totals A = 13, B = 8; with Fall selected, term totals A = 5, B = 0. Duplicate and missing-profile exceptions remain visible and OPEN. B’s later profile does not by itself prove the earlier exception resolved.",
      "In the response tab named by the summary, find all five fictional submissions by timestamp, identifier and MOCK event. Ask the maintainer to inspect the other response tabs in this copied workbook and confirm these submissions are absent. Record arrival and other-tab inspection separately.",
      "Close Accepting responses and set both Events I form_open cells FALSE. Sync again; open the respondent link and confirm it is no longer accepting responses.",
      "Open both copied exports with the approved account and allow only the matching private source connections in the summary. An unresolved import stays Blocked for the maintainer; do not publish or share the workbooks.",
      "In copied Points Master → Config!B5, verify TESTING. Open copied Points Export → Leaderboard_Public: headers may remain, but member rows must be hidden. Set Master Config!B5 to PAUSED and inspect Leaderboard_Public again. Restore B5 to TESTING and confirm it. Other approved aggregate/status tabs may contain data; public-field approval is separate.",
      "For the budget exercise, use a clean isolated copy or have the reviewer inventory prior entries. Open Budget Tracker → Start Here for yellow inputs. In Funding Setup, set B5:D5 = 100,0,0; B6:D6 = 0,0,0; B8 = “None — MOCK rehearsal only”.",
      "In Category Budgets, set B5 = 100 and all other B5:C18 cells to zero. Check B23:C23 = 0,0. Record a fictional funding review in Funding Setup B10; this is not real funding approval. Setup & Lists B7 is Huntington’s opening balance, not an allocation input; preserve existing balances and formulas.",
      "In Transactions, enter three dated MOCK rows within the selected academic year, all for the same OSU Bank Account: Income 100 Approved; Expense 20 Approved; Expense 10 Pending Approval. Preserve calculated Semester and Signed Cash Flow.",
      "With a zero opening baseline, compare Budget Tracker and Budget Export separately: ledger (approved cash balance) 80; projected ledger after pending expense 70; pending expense 10; approved spending-plan remaining 80. Existing opening balances change these expectations. The legacy category-plan table may use a different source; check its source label and do not treat a dash as zero approved allocation.",
      "Run ASME Tools → Run Pre-Flight Sanity Check. Save the result and actual observations. Preflight checks wiring; the five submissions, separate approvals and review evidence are still required."
    ],
    "productionInstructions": [
      "Open Points Master → README. Add this year’s actual events using the approved input cells. Confirm event dates, categories and points.",
      "Follow the event-update method in the readiness record. For manual updates, the named owner chooses ASME Tools → Sync Events to Google Form after approved event changes and before intake opens. Ask the maintainer to resolve errors; leave formula tabs alone.",
      "In the Form editor verify the approved event choices and respondent access settings. Keep intake closed until the President approves opening it.",
      "A deliberately staged unpublished Form is acceptable now; have the authorized operator verify publication and respondent access before approved collection. Use the summary and maintainer’s readiness record to verify connections; officers are not required to submit fictional member cases.",
      "Open Budget Tracker → Start Here. Enter approved opening balances, funding and category plans in the indicated input cells.",
      "Record real approvals and reconcile the ledger to the dated bank evidence with the Treasurer. Do not enter fictional 100/20/10 transactions.",
      "Compare Points Export and Budget Export with the approved source data. Resolve import or calculation errors with the President before launch. Confirm approved public fields and private member-data boundaries from the maintainer’s record; never publish private sheets."
    ],
    "check": "Record each actual observation and approval separately below. Missing evidence stays unverified; assign its owner in the private checklist.",
    "productionCheck": "Record the actual result or the maintainer’s dated readiness record. Missing access, errors or approval stay Blocked; ask the President for the next action."
  },
  {
    "id": "T04",
    "roles": [
      "president",
      "webmaster",
      "social_chair"
    ],
    "needs": [
      "T02"
    ],
    "title": "Check calendar and messages",
    "productionTitle": "Check calendar and messages",
    "quickStart": "Check and remove local fictional previews, review an unsent MOCK newsletter, and verify three private backups in a separate recovery profile.",
    "productionQuickStart": "Compare approved events, review the editable newsletter and website draft, retain three private backups and obtain dated recovery readiness evidence.",
    "instructions": [
      "Open Newsletter Builder → Calendar. Enter the full academic year selected in this checklist and choose Load fictional Fall/Spring. Confirm both semesters and FICTIONAL REHEARSAL. These events stay local and create no Google events or invitations.",
      "Open Public Events Calendar and repeat its local fictional preview in the generated list above the embedded Google calendar. Check desktop and phone. Then choose Remove fictional events, Upcoming in Newsletter Builder, and Upcoming dates on the public page. Confirm the fictional label is gone and the chapter snapshot returns; use Refresh chapter snapshot and record any error.",
      "Before changing an existing newsletter, choose Templates → Export Draft .json and preserve it privately. Use a clearly labeled MOCK issue. In Settings edit Email Subject Line and Preheader Text (preview line in inbox); use Links for quick links, Design for footer/address, and Announce → Author Attribution for the officer signature. Review Desktop and Mobile previews; keep the draft unsent.",
      "Keep three private backups: newsletter draft, Hub progress, and private links. Use Saved links and backup tools → Progress backup and print for progress; use Saved links for Download private links backup. Compare each downloaded file with the working screens using the recovery guide below.",
      "In a separate browser profile, restore the three backups and compare the restored checklist, seven links and newsletter content. Preserve the original profile and any existing recovery-profile work before imports. Record observed results and limits; downloads alone do not prove restoration."
    ],
    "productionInstructions": [
      "Open the chapter calendar and check actual approved events: title, date, time, time zone and location. Compare the same events in the Hub, public Events Calendar and Newsletter Builder. Refresh chapter data, record the time and resolve mismatches.",
      "Before editing an existing newsletter, choose Templates → Export Draft .json and keep an untouched private backup.",
      "In Newsletter Builder → Settings, edit Email Subject Line and Preheader Text (preview line in inbox). Use Links for annual quick links, Design → Footer Org Name / Footer Address Line, and Announce → Author Attribution for the officer signature and Message for issue text. Review Desktop and Mobile previews and save the editable draft for approval.",
      "Ask the President for approved sender, reply-to, complete mailing address and dated public facts. Verify sender/reply-to and the sending-service route with its owner. Missing facts or approval stays Blocked; obtain content-owner approval before sending.",
      "For website changes, the authorized Webmaster opens WordPress login → Pages → Leadership or the intended page. Preserve the current content, apply the approved draft, choose Save Draft, reload and Preview. Follow the page map in More help for annual links on other pages. Obtain content-owner approval before publishing.",
      "Keep three private backups: editable newsletter draft, Hub progress and private links. Use Saved links and backup tools → Progress backup and print for progress; use Saved links for Download private links backup. Compare downloads with the working screens. Get the maintainer’s dated recovery readiness record; downloads alone do not prove restoration."
    ],
    "check": "Record each actual observation and approval separately below. Missing evidence stays unverified; assign its owner in the private checklist.",
    "productionCheck": "Record the actual result or the maintainer’s dated readiness record. Missing access, errors or approval stay Blocked; ask the President for the next action."
  },
  {
    "id": "T05",
    "roles": [
      "president",
      "secretary",
      "treasurer",
      "webmaster"
    ],
    "needs": [
      "T01",
      "T02",
      "T03",
      "T04"
    ],
    "launch": true,
    "title": "Close and review your practice run",
    "productionTitle": "Approve and start the year",
    "quickStart": "Close intake and events, keep Points TESTING and settings inactive/noncurrent, record cleanup or private retention and reviewer sign-off, then skip activation with Rehearsal only.",
    "productionQuickStart": "After required reviews, incoming acceptance and recorded launch approval, the authorized settings owner sets Points LIVE, activates the verified new year, sets the previous year’s is_current to FALSE, and rechecks the Hub, website, Form and newsletter.",
    "instructions": [
      "Before cleanup, close Form intake and set every Events form_open checkbox FALSE. In a fresh annual copy, ASME Tools → Clear Test Data previews and backs up MOCK attendance before removal; it does not remove event definitions, adjustments or budget entries. Review those separately. If the menu is absent, reload once; older copies need the maintainer’s cleanup/menu update. Never clear formula tabs.",
      "Keep copied Points Master Config!B5 TESTING and the copied year is_active=FALSE and is_current=FALSE. Open the private cleanup checklist. Its owner inventories submissions, events, adjustments and budget inputs, records approved retain/remove decisions, and lists checks to repeat. Missing owner or approval stays Blocked; retain isolated evidence.",
      "Account separately for Form responses and raw sheet entries. Match originals by timestamp, fictional identity and event, never proxy source_row alone. Preserve OPEN exception evidence before approved cleanup, then recheck the derived queue and safe settings. Retained test evidence stays private and separate from production.",
      "Export and compare the progress record, separate private-links backup and newsletter draft. Record the practice reviewer’s acceptance, date and limits in the private checklist, including cleanup/retention and recovery results.",
      "Skip activation with the reason Rehearsal only. This records the activation skip; cleanup and reviewer acceptance still require their own evidence. Practice acceptance does not authorize a real launch."
    ],
    "productionInstructions": [
      "Ask the President to review access, annual settings, attendance, finances and communications. Record unresolved items as Blocked. Preserve prior-year records and approved access; account for any inherited test data with the maintainer before launch. If any item is missing, assign its owner and deadline in the shared checklist.",
      "Obtain the coordinator’s dated launch approval and rollback plan, including who restores the previous settings if a consumer fails. The checklist records review; it does not change Google or activate the year.",
      "At the approved time, the authorized settings owner sets the verified real Points Master Config!B5 to LIVE, sets the new year’s actual Control Center row is_active=TRUE and is_current=TRUE, and sets the previous year’s is_current to FALSE. Preserve prior-year records. Check the approved Form intake state. Reopen the Hub, website, Form and newsletter and confirm each uses the correct year and approved public data; follow the recorded rollback plan if a consumer fails.",
      "Record incoming officer acceptance separately from activation. The team may accept custody with named open tasks and deadlines; that decision does not authorize launch while required reviews remain unfinished. Keep outgoing access until acceptance is recorded, then have the President arrange the approved access changes."
    ],
    "check": "Record each actual observation and approval separately below. Missing evidence stays unverified; assign its owner in the private checklist.",
    "productionCheck": "Record the actual result or the maintainer’s dated readiness record. Missing access, errors or approval stay Blocked; ask the President for the next action."
  }
];
// Keep the action fallback aligned with the explicit Practice tasks.
for (const step of TRANSITION_STEPS) step.action = step.instructions.join(" ");

export const TRANSITION_CHECKS = [
  {
    "id": "V01",
    "step": "T02",
    "title": "Are all required masters clean and ready to copy?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Has the maintainer confirmed this year’s tools are ready?"
  },
  {
    "id": "V02",
    "step": "T02",
    "title": "Does the Form send responses to this year’s workbook and actual tab?",
    "modes": [
      "rehearsal",
      "production"
    ]
  },
  {
    "id": "V03",
    "step": "T03",
    "title": "Do the five responses appear only in the configured response tab of the copied workbook?",
    "modes": [
      "rehearsal"
    ]
  },
  {
    "id": "V04",
    "step": "T03",
    "title": "Did tests earn the expected points and totals with visible exceptions?",
    "modes": [
      "rehearsal"
    ]
  },
  {
    "id": "V05",
    "step": "T03",
    "title": "Are public fields approved and member output suppressed while non-live?",
    "modes": [
      "production"
    ],
    "productionTitle": "Has the maintainer verified that non-live exports hide member rows and use only the approved public fields?"
  },
  {
    "id": "V06",
    "step": "T03",
    "title": "Do budget balances and approved funding match the private ledger?",
    "modes": [
      "production"
    ],
    "productionTitle": "Do Budget Tracker and Budget Export match the private ledger and approved funding amounts?"
  },
  {
    "id": "V07",
    "step": "T02",
    "title": "Does a fresh Google read match the inactive/noncurrent draft settings?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Does this year’s inactive Control Center row match the setup summary?"
  },
  {
    "id": "V08",
    "step": "T04",
    "title": "Do calendars show correct current events in every tool?",
    "modes": [
      "production"
    ],
    "productionTitle": "Do this year’s events appear in the Hub, website and newsletter calendar views?"
  },
  {
    "id": "V09",
    "step": "T04",
    "title": "Do approved public pages and links work on desktop and phone?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V10",
    "step": "T03",
    "title": "Can incoming officers use every tool their roles require?",
    "rehearsalTitle": "Can the reviewer open every copied tool with the approved rehearsal account?",
    "modes": [
      "rehearsal",
      "production"
    ]
  },
  {
    "id": "V11",
    "step": "T03",
    "title": "Has the owner approved the exact public fields, separately from suppression?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V12",
    "step": "T03",
    "title": "Is real funding authority approved with dated private evidence?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V13",
    "step": "T03",
    "title": "Are ledger balances reconciled to dated bank statements?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V14",
    "step": "T04",
    "title": "Are live calendar title, date, time, time zone, location and refresh observations recorded across every consumer?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V15",
    "step": "T04",
    "title": "Are sender, reply-to, mailing address and dated public facts approved, with the sending-service route verified?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V16",
    "step": "T05",
    "title": "Has the cleanup owner accounted for every retained or removed test item and rechecked safe settings?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Have prior-year records, inherited test data and approved access changes been accounted for before launch?"
  },
  {
    "id": "V17",
    "step": "T05",
    "title": "Has incoming acceptance been recorded independently of activation?",
    "rehearsalTitle": "Has the reviewer accepted the private rehearsal and its recorded limits?",
    "modes": [
      "rehearsal",
      "production"
    ]
  },
  {
    "id": "V18",
    "step": "T05",
    "title": "Has the coordinator approved this production launch and rollback record?",
    "modes": [
      "production"
    ]
  },
  {
    "id": "V19",
    "step": "T03",
    "title": "Has automatic event sync been installed and observed separately from initial/manual sync?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Has the maintainer confirmed the event-update method and responsible owner?"
  },
  {
    "id": "V20",
    "step": "T01",
    "title": "Does the current private T01–T05 checklist identify each holder, access evidence, coordinator and recovery contact?",
    "rehearsalTitle": "Does this rehearsal have a current checklist, lead, test account and recovery plan?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Does the private five-step checklist name each holder, access evidence, coordinator and recovery contact?"
  },
  {
    "id": "V21",
    "step": "T02",
    "title": "Does this run’s readable setup summary match the actual copies, settings and workbook date locations?",
    "modes": [
      "rehearsal",
      "production"
    ]
  },
  {
    "id": "V22",
    "step": "T04",
    "title": "Have downloaded Hub and newsletter backups been inspected and restored in an isolated recovery roundtrip?",
    "modes": [
      "rehearsal",
      "production"
    ],
    "productionTitle": "Has the maintainer supplied a dated recovery readiness record for the Hub, private links and newsletter?"
  },
  {
    "id": "V23",
    "step": "T03",
    "title": "Are member rows suppressed in both TESTING and PAUSED, then restored to TESTING?",
    "modes": [
      "rehearsal"
    ]
  },
  {
    "id": "V24",
    "step": "T03",
    "title": "Do copied budget tracker and export show ledger 80, projected 70, pending 10 and approved plan remaining 80?",
    "modes": [
      "rehearsal"
    ]
  },
  {
    "id": "V25",
    "step": "T04",
    "title": "Do both local fictional calendar previews work on desktop and phone, then return to Upcoming?",
    "modes": [
      "rehearsal"
    ]
  },
  {
    "id": "V26",
    "step": "T03",
    "title": "Did the five fictional submissions arrive in the named response tab?",
    "modes": [
      "rehearsal"
    ]
  }
];

export const TRANSITION_TEST_IDENTITIES = "Fictional identities: A = rehearsala.999; B = rehearsalb.999. name.number is the OSU username-style identifier. Reuse the exact identifier for each member. The Yes/No choices answer “Is this your first submission this academic year?”; complete all required fictional profile fields for Yes.";
export const TRANSITION_TEST_CASES = [
  [
    "1",
    "A (rehearsala.999), Yes; complete profile",
    "MOCK Fall",
    "5"
  ],
  [
    "2",
    "A (rehearsala.999), No",
    "Same MOCK Fall event",
    "0; duplicate exception OPEN"
  ],
  [
    "3",
    "A (rehearsala.999), No",
    "MOCK Spring",
    "8"
  ],
  [
    "4",
    "B (rehearsalb.999), No; no existing profile",
    "MOCK Fall",
    "0; missing-profile exception OPEN"
  ],
  [
    "5",
    "B (rehearsalb.999), Yes; complete profile",
    "MOCK Spring",
    "8"
  ]
];

// Short officer-facing copy; detailed procedures and review identities remain above.
export const TRANSITION_OFFICER_COPY = {
  "T01": {
    "intro": "Ask the President which account and officer folder to use, and who can help with access.",
    "actions": [],
    "practice": [
      "Use the approved test account and private Practice folder."
    ]
  },
  "T02": {
    "intro": "Sign in, check the member goal, then create your files. The Hub saves their links for you.",
    "actions": []
  },
  "T03": {
    "intro": "Open your files and check them with the Secretary and Treasurer.",
    "actions": [
      "Add this year\u2019s events in Points Master. Check that the attendance form lists them.",
      "Fill in the approved balances and spending plan in Budget Tracker.",
      "Ask your team to confirm that attendance, points and budget totals work."
    ],
    "practice": [
      "Work with your maintainer using the Practice instructions below.",
      "Try the five sample check-ins and budget exercise, then compare the results.",
      "Close the test form when you finish. Keep the Practice files private."
    ]
  },
  "T04": {
    "intro": "Check the events and messages officers will share.",
    "actions": [
      "Check the same event in the Hub, website and newsletter.",
      "Update the newsletter draft and approved website changes. Preview both on a phone.",
      "Save your backups. Get approval before sending or publishing."
    ],
    "practice": [
      "Try the fictional calendar preview in both tools. Switch back to Upcoming afterward.",
      "Preview an unsent MOCK newsletter on desktop and phone.",
      "Follow the backup practice below with your maintainer."
    ]
  },
  "T05": {
    "intro": "Review the handoff with the President before starting the year.",
    "actions": [
      "Confirm the incoming officers can use their tools.",
      "Ask the President to review the remaining items and approve the launch.",
      "Follow the approved launch plan. Keep last year\u2019s files."
    ],
    "practice": [
      "Ask your reviewer to confirm cleanup and sign off on the practice.",
      "Skip starting the real year. Record \u201cPractice only \u2014 no launch\u201d as the reason."
    ]
  }
};
export const TRANSITION_OFFICER_QUESTIONS = {
  "V01": {
    "production": "Has your maintainer confirmed the tools are ready?",
    "rehearsal": "Has your maintainer checked the templates?"
  },
  "V02": "Does the attendance form save to this year\u2019s Points Master?",
  "V03": "Has your maintainer confirmed the test responses went only to the right tab?",
  "V04": "Did the sample check-ins earn the expected points?",
  "V05": "Has your maintainer checked that member data stays private?",
  "V06": "Do the budget totals match the Treasurer\u2019s records?",
  "V07": "Has your team checked this year\u2019s saved settings?",
  "V08": "Do the events appear in all three calendars?",
  "V09": "Do the public pages and links work on a phone and computer?",
  "V10": {
    "production": "Can each incoming officer open and use their tools?",
    "rehearsal": "Can your reviewer open all the Practice files?"
  },
  "V11": "Has the owner approved what can be shown publicly?",
  "V12": "Has the authorized person approved the funding?",
  "V13": "Do the balances match the bank records?",
  "V14": "Do the event dates, times and locations match after a refresh?",
  "V15": "Has the owner approved the newsletter details and sending account?",
  "V16": {
    "production": "Are last year\u2019s records, test data and access changes accounted for?",
    "rehearsal": "Has your reviewer checked the test cleanup and safe settings?"
  },
  "V17": {
    "production": "Has the incoming team accepted the handoff?",
    "rehearsal": "Has your reviewer signed off on the practice?"
  },
  "V18": "Has the President approved the launch and recovery plan?",
  "V19": {
    "production": "Is someone responsible for keeping Form events up to date?",
    "rehearsal": "Did a sheet edit automatically update the test Form?"
  },
  "V20": {
    "production": "Do you have the approved account, officer folder and someone to contact for help?",
    "rehearsal": "Do you have the approved test account, private Practice folder and reviewer?"
  },
  "V21": "Do the new files and dates match this year?",
  "V22": {
    "production": "Has your maintainer confirmed the backups can be restored?",
    "rehearsal": "Did you restore and compare all three backups?"
  },
  "V23": "Are member rows hidden in both test modes?",
  "V24": "Do the sample budget totals match the expected amounts?",
  "V25": "Did both calendar previews work and return to Upcoming?",
  "V26": "Did all five sample check-ins arrive?"
};
