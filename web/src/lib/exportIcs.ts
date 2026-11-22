import { ClassEntry } from "./firestore";

export function exportTimetableIcs(entries: ClassEntry[]) {
  if (!entries || entries.length === 0) return;

  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//College Timetable Pro//EN\n";

  entries.forEach((e) => {
    const startH = Math.floor(e.startMin / 60).toString().padStart(2, "0");
    const startM = (e.startMin % 60).toString().padStart(2, "0");
    const endH = Math.floor(e.endMin / 60).toString().padStart(2, "0");
    const endM = (e.endMin % 60).toString().padStart(2, "0");

    icsContent += "BEGIN:VEVENT\n";
    icsContent += `SUMMARY:${e.subject}\n`;
    if (e.room) icsContent += `LOCATION:${e.room}\n`;
    if (e.teacher) icsContent += `DESCRIPTION:Instructor: ${e.teacher}\n`;
    icsContent += `DTSTART:20261116T${startH}${startM}00\n`;
    icsContent += `DTEND:20261116T${endH}${endM}00\n`;
    icsContent += "RRULE:FREQ=WEEKLY\n";
    icsContent += "END:VEVENT\n";
  });

  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "College_Timetable.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
