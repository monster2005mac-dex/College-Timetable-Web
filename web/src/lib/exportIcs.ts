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
  if (entries.length === 0) return false;

  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Timetable Pro//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  entries.forEach((entry) => {
    const weekday = Math.min(7, Math.max(1, Math.trunc(entry.day)));
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntilClass = (weekday - (((startDate.getDay() + 6) % 7) + 1) + 7) % 7;
    startDate.setDate(startDate.getDate() + daysUntilClass);
    const start = `${String(Math.floor(entry.startMin / 60)).padStart(2, "0")}${String(entry.startMin % 60).padStart(2, "0")}00`;
    const end = `${String(Math.floor(entry.endMin / 60)).padStart(2, "0")}${String(entry.endMin % 60).padStart(2, "0")}00`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(entry.id)}@collegetimetablepro`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART:${formatIcsDate(startDate)}T${start}`,
      `DTEND:${formatIcsDate(startDate)}T${end}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${weekdayCodes[weekday - 1]}`,
      `SUMMARY:${escapeIcsText(entry.subject)}`,
    );

    if (entry.room) lines.push(`LOCATION:${escapeIcsText(entry.room)}`);
    if (entry.teacher) lines.push(`DESCRIPTION:${escapeIcsText(`Instructor: ${entry.teacher}`)}`);
    lines.push("END:VEVENT");
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
