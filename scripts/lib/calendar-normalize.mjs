import ICAL from "ical.js";

export const OCCURRENCE_SCHEMA_VERSION = 1;
export const CHAPTER_TIME_ZONE = "America/New_York";
const MAX_OCCURRENCES = 5000;

function dateKey(time) {
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

function chapterTimeZone(component) {
  const zones = component.getAllSubcomponents("vtimezone");
  const registered = [];
  for (const zoneComponent of zones) {
    const zone = new ICAL.Timezone(zoneComponent);
    ICAL.TimezoneService.register(zone.tzid, zone);
    registered.push(zone.tzid);
  }
  if (!ICAL.TimezoneService.has(CHAPTER_TIME_ZONE)) {
    throw new Error(`Calendar does not define the required ${CHAPTER_TIME_ZONE} timezone.`);
  }
  return registered;
}

function eventId(event, occurrence) {
  return `${event.uid || "event"}:${occurrence.toString()}`;
}

function occurrenceFromDetails(event, occurrence, details) {
  const item = details.item || event;
  const start = details.startDate;
  const end = details.endDate;
  const title = item.summary || "ASME event";
  const location = item.location || "";
  if (start.isDate) {
    return {
      id: eventId(event, occurrence), title, location, allDay: true,
      startDate: dateKey(start), endDate: dateKey(end || start),
    };
  }
  return {
    id: eventId(event, occurrence), title, location, allDay: false,
    startAt: start.toJSDate().toISOString(),
    endAt: end ? end.toJSDate().toISOString() : null,
  };
}

function intersectsWindow(item, windowStart, windowEnd) {
  if (item.allDay) return item.endDate > windowStart.toISOString().slice(0, 10) && item.startDate <= windowEnd.toISOString().slice(0, 10);
  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return end > windowStart && start < windowEnd;
}

export function normalizeCalendar(ical, { now = new Date(), pastDays = 7, futureDays = 180 } = {}) {
  const root = ICAL.parse(ical);
  const calendar = new ICAL.Component(root);
  const registered = chapterTimeZone(calendar);
  try {
    const windowStart = new Date(now.getTime() - pastDays * 86400000);
    const windowEnd = new Date(now.getTime() + futureDays * 86400000);
    const events = calendar.getAllSubcomponents("vevent").map((component) => new ICAL.Event(component));
    const masters = events.filter((event) => !event.isRecurrenceException());
    const occurrences = [];
    const seen = new Set();
    for (const event of masters) {
      if (event.component.getFirstPropertyValue("status") === "CANCELLED") continue;
      const iterator = event.isRecurring() ? event.iterator() : null;
      let occurrence = event.isRecurring() ? iterator.next() : event.startDate;
      let count = 0;
      while (occurrence) {
        if (++count > MAX_OCCURRENCES) throw new Error(`Calendar recurrence ${event.uid || "event"} exceeds ${MAX_OCCURRENCES} occurrences.`);
        const details = event.getOccurrenceDetails(occurrence);
        if (details.item.component.getFirstPropertyValue("status") === "CANCELLED") continue;
        const normalized = occurrenceFromDetails(event, occurrence, details);
        if (intersectsWindow(normalized, windowStart, windowEnd) && !seen.has(normalized.id)) {
          seen.add(normalized.id);
          occurrences.push(normalized);
        }
        if (!event.isRecurring()) break;
        if (!occurrence.isDate && occurrence.toJSDate() > windowEnd) break;
        occurrence = iterator.next();
      }
    }
    return {
      occurrenceSchemaVersion: OCCURRENCE_SCHEMA_VERSION,
      displayTimeZone: CHAPTER_TIME_ZONE,
      windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(),
      occurrences: occurrences.sort((a, b) => (a.allDay ? `${a.startDate}T00:00:00` : a.startAt).localeCompare(b.allDay ? `${b.startDate}T00:00:00` : b.startAt)),
    };
  } finally {
    registered.forEach((tzid) => ICAL.TimezoneService.remove(tzid));
  }
}
