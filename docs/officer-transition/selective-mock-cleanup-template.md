# Selective rehearsal cleanup — private copy template

Create one private copy for the named Hub run. This template does not authorize deletion. The coordinator names an owner, records a retain/remove decision for every item, and preserves evidence before any approved source cleanup. If ownership or disposition is missing, leave T05 Blocked and retain the isolated evidence.

| Run context | Entry |
|---|---|
| Year / run name / owner / review time | [fill] |
| Points Master / Form / Budget Tracker IDs | [private IDs] |
| Receipt, run export and rollback snapshot locations | [private locations] |
| Intake status / Points mode / active-current flags | [closed] / [TESTING] / [FALSE-FALSE, verified] |
| Approved disposition and approver | [retain or selective remove, name, time] |

| Item ID | Exact source and locator | Original evidence / count | Retain or remove, why | Authorized owner / time | Action result / after-check |
|---|---|---|---|---|---|
| Form responses | [Form ID, timestamp + fictional identity + event for each] | [count and private snapshot] | [decision] | [fill] | [Form count] |
| Google response tab rows | [actual tab name, timestamp + fictional identity + event for each] | [row count and snapshot] | [decision] | [fill] | [raw tab count] |
| Events | [Events row IDs and labels] | [two MOCK records, form_open values] | [decision] | [fill] | [closed/removed] |
| Manual adjustments and review decisions | [tab and stable ID] | [OPEN exception evidence first] | [decision] | [fill] | [derived queue rechecked] |
| Member/profile fixture rows | [tab and fictional identity] | [snapshot] | [decision] | [fill] | [totals rechecked] |
| Budget funding/category inputs | [Funding Setup and Category Budgets cells] | [snapshot] | [decision] | [fill] | [formulas intact] |
| Budget fictional transactions/review | [tab, stable ID, timestamp] | [snapshot] | [decision] | [fill] | [80/70/10/80 no longer represented as live] |
| Export and local newsletter/calendar fixtures | [exact private copy/browser profile] | [snapshot] | [decision] | [fill] | [private isolation confirmed] |

Match original Form and sheet records by timestamp, fictional identity and event. A proxy `source_row` can shift and is never a deletion key. Account for Form responses and raw sheet rows separately. Preserve OPEN duplicate/missing-profile evidence before approved source cleanup; recheck the derived queue afterward. Preserve Config, proxy, formula, export and dashboard formula tabs. List exact protected ranges and a before/after formula comparison here: [fill].

After the decision, recheck closed Form intake and mock event flags, TESTING, inactive/noncurrent settings, private sharing, import resolution, formula integrity and remaining test records. Record each result, owner, time and evidence: [fill]. Retained evidence stays private and isolated from production. Incoming holder acceptance is separate: [holder, scope, time, result, blockers].
