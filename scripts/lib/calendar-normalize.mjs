import ICAL from "ical.js";

export const OCCURRENCE_SCHEMA_VERSION = 1;
export const CHAPTER_TIME_ZONE = "America/New_York";
const MAX_OCCURRENCES = 5000;

function dateKey(time) {
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

function chapterDateKey(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: CHAPTER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nextDateKey(time) {
  const date = new Date(Date.UTC(time.year, time.month - 1, time.day) + 86400000);
  return date.toISOString().slice(0, 10);
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

function validateNamedTimeZones(components) {
  for (const component of components) {
    for (const propertyName of ["dtstart", "dtend", "recurrence-id"]) {
      const tzid = component.getFirstProperty(propertyName)?.getParameter("tzid");
      if (tzid && tzid !== "UTC" && !ICAL.TimezoneService.has(tzid)) {
        throw new Error(`Calendar ${propertyName.toUpperCase()} uses unresolved timezone ${tzid}.`);
      }
    }
  }
}

function explicitEnd(item) {
  return Boolean(
    item.component.getFirstProperty("dtend") || item.component.getFirstProperty("duration"),
  );
}

function utcIso(time, context) {
  const zoneId = time.zone?.tzid;
  let zoned = time;
  // iCalendar floating values have no offset.  They mean chapter wall-clock
  // time here, never the timezone of the machine running the sync.
  if (zoneId === "floating") {
    const chapterZone = ICAL.TimezoneService.get(CHAPTER_TIME_ZONE);
    if (!chapterZone) throw new Error(`Calendar ${context} is floating but ${CHAPTER_TIME_ZONE} is unavailable.`);
    zoned = time.clone();
    zoned.zone = chapterZone;
  } else if (zoneId && zoneId !== "UTC" && !ICAL.TimezoneService.has(zoneId)) {
    throw new Error(`Calendar ${context} uses unresolved timezone ${zoneId}.`);
  }
  return zoned.convertToZone(ICAL.Timezone.utcTimezone).toJSDate().toISOString();
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
      startDate: dateKey(start),
      endDate: end && explicitEnd(item) ? dateKey(end) : nextDateKey(start),
    };
  }
  return {
    id: eventId(event, occurrence), title, location, allDay: false,
    startAt: utcIso(start, "DTSTART"),
    // ICAL.Event derives an end equal to DTSTART when neither DTEND nor
    // DURATION was supplied.  Preserve that absence for browser grace logic.
    endAt: end && explicitEnd(item) ? utcIso(end, "DTEND") : null,
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
    const eventComponents = calendar.getAllSubcomponents("vevent");
    validateNamedTimeZones(eventComponents);
    const events = eventComponents.map((component) => new ICAL.Event(component));
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
        if (details.item.component.getFirstPropertyValue("status") !== "CANCELLED") {
          const normalized = occurrenceFromDetails(event, occurrence, details);
          if (intersectsWindow(normalized, windowStart, windowEnd) && !seen.has(normalized.id)) {
            seen.add(normalized.id);
            occurrences.push(normalized);
          }
        }
        if (!event.isRecurring()) break;
        // Date-only values are wall-clock calendar dates, so comparing their
        // JS Date representation can be host-dependent.  Stop at the chapter
        // date horizon before advancing an open-ended recurrence indefinitely.
        if (occurrence.isDate
          ? dateKey(occurrence) > chapterDateKey(windowEnd)
          : new Date(utcIso(occurrence, "recurrence")) > windowEnd) break;
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
