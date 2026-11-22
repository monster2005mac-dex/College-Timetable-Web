import { ClassEntry } from "./firestore";

const weekdayCodes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

export function exportTimetableIcs(entries: ClassEntry[]) {
  const activeEntries = entries.filter((entry) => !entry.isCancelled);
  if (activeEntries.length === 0) return false;

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Timetable Pro//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const recurringEntries = activeEntries.filter((entry) => !entry.dateIso && !entry.overrideOfId);
  const dateEntries = entries.filter((entry) => Boolean(entry.dateIso));
  const baseById = new Map(recurringEntries.map((entry) => [entry.id, entry]));

  const appendEvent = (entry: ClassEntry, uid: string, startDate: string, options: {
    endDate: string;
    recurrenceId?: string;
    recurrenceRule?: string;
    cancelled?: boolean;
  }) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(uid)}@collegetimetablepro`,
      `DTSTAMP:${stamp}`,
      ...(options.recurrenceId ? [`RECURRENCE-ID:${options.recurrenceId}`] : []),
      `DTSTART:${startDate}`,
      `DTEND:${options.endDate}`,
      ...(options.recurrenceRule ? [`RRULE:${options.recurrenceRule}`] : []),
      ...(options.cancelled ? ["STATUS:CANCELLED"] : []),
      `SUMMARY:${escapeIcsText(entry.subject)}`,
    );
    if (entry.room) lines.push(`LOCATION:${escapeIcsText(entry.room)}`);
    if (entry.teacher) lines.push(`DESCRIPTION:${escapeIcsText(`Instructor: ${entry.teacher}`)}`);
    lines.push("END:VEVENT");
  };

  recurringEntries.forEach((entry) => {
    const weekday = Math.min(7, Math.max(1, Math.trunc(entry.day)));
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntilClass = (weekday - (((startDate.getDay() + 6) % 7) + 1) + 7) % 7;
    startDate.setDate(startDate.getDate() + daysUntilClass);
    const localDate = formatIcsDate(startDate);
    appendEvent(entry, entry.id, `${localDate}T${formatIcsTime(entry.startMin)}`, {
      endDate: `${localDate}T${formatIcsTime(entry.endMin)}`,
      recurrenceRule: `FREQ=WEEKLY;BYDAY=${weekdayCodes[weekday - 1]}`,
    });
  });

  dateEntries.forEach((entry) => {
    const date = entry.dateIso?.replaceAll("-", "");
    if (!date) return;
    const start = `${date}T${formatIcsTime(entry.startMin)}`;
    const end = `${date}T${formatIcsTime(entry.endMin)}`;
    const original = entry.overrideOfId ? baseById.get(entry.overrideOfId) : undefined;
    const recurrenceId = original
      ? `${date}T${formatIcsTime(original.startMin)}`
      : undefined;
    appendEvent(entry, original?.id ?? entry.id, start, {
      endDate: end,
      recurrenceId,
      cancelled: entry.isCancelled,
    });
  });

  lines.push("END:VCALENDAR");
  const blob = new Blob([`${lines.join("\r\n")}\r\n`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "College_Timetable.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

function formatIcsTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;
}
