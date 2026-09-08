import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCalendar } from "../scripts/lib/calendar-normalize.mjs";

const zone = `BEGIN:VTIMEZONE\nTZID:America/New_York\nBEGIN:DAYLIGHT\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nDTSTART:19700308T020000\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\nEND:DAYLIGHT\nBEGIN:STANDARD\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\nDTSTART:19701101T020000\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\nEND:STANDARD\nEND:VTIMEZONE`;
const calendar = (event) => `BEGIN:VCALENDAR\n${zone}\n${event}\nEND:VCALENDAR`;

test("normalizes a weekly New York series across daylight saving time", () => {
  const result = normalizeCalendar(calendar(`BEGIN:VEVENT\nUID:weekly\nDTSTART;TZID=America/New_York:20260910T173000\nDTEND;TZID=America/New_York:20260910T183000\nRRULE:FREQ=WEEKLY;UNTIL=20270501T000000Z\nSUMMARY:Weekly meeting\nEND:VEVENT`), { now: new Date("2026-11-01T16:00:00Z") });
  const november = result.occurrences.find((item) => item.startAt === "2026-11-05T22:30:00.000Z");
  assert.equal(result.displayTimeZone, "America/New_York");
  assert.equal(november.title, "Weekly meeting");
});

test("honors interval and count", () => {
  const result = normalizeCalendar(calendar(`BEGIN:VEVENT\nUID:biweekly\nDTSTART;TZID=America/New_York:20260910T173000\nRRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3\nSUMMARY:Biweekly\nEND:VEVENT`), { now: new Date("2026-09-01T12:00:00Z") });
  assert.deepEqual(result.occurrences.map((item) => item.startAt.slice(0, 10)), ["2026-09-10", "2026-09-24", "2026-10-08"]);
});

test("preserves all-day dates with an exclusive end date", () => {
  const result = normalizeCalendar(calendar(`BEGIN:VEVENT\nUID:allday\nDTSTART;VALUE=DATE:20260910\nDTEND;VALUE=DATE:20260911\nSUMMARY:All day\nEND:VEVENT`), { now: new Date("2026-09-10T16:00:00Z") });
  assert.deepEqual(result.occurrences[0], { id: "allday:2026-09-10", title: "All day", location: "", allDay: true, startDate: "2026-09-10", endDate: "2026-09-11" });
});
