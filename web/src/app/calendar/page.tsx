"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { ClassEntry, ExamEntry, subscribeEntries, subscribeExams } from "@/lib/firestore";
import { formatMinutes } from "@/lib/useCurrentTime";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toLocalDateString(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeEntries = subscribeEntries(user.uid, setEntries);
    const unsubscribeExams = subscribeExams(user.uid, setExams);
    return () => {
      unsubscribeEntries();
      unsubscribeExams();
    };
  }, [user]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const calendarCellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const cells = useMemo(
    () => Array.from({ length: calendarCellCount }, (_, index) => {
      const dateNumber = index - leadingDays + 1;
      return dateNumber > 0 && dateNumber <= daysInMonth ? dateNumber : null;
    }),
    [calendarCellCount, leadingDays, daysInMonth]
  );
  const selectedDateKey = toLocalDateString(selectedDate);
  const selectedWeekday = ((selectedDate.getDay() + 6) % 7) + 1;
  const selectedEntries = entries
    .filter((entry) => entry.day === selectedWeekday)
    .sort((a, b) => a.startMin - b.startMin);
  const selectedExams = exams.filter((exam) => exam.dateIso === selectedDateKey);
  const todayKey = toLocalDateString(new Date());

  const moveMonth = (amount: number) => {
    const nextMonth = new Date(year, month + amount, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  return (
    <div className="space-y-6 py-4">
      <section className="calendar-heading glass-panel">
        <div>
          <div className="eyebrow"><span className="live-dot" /> MONTH VIEW</div>
          <h1>{monthLabel}</h1>
          <p>Recurring classes and upcoming exams, laid out across the month.</p>
        </div>
        <div className="calendar-month-controls" aria-label="Calendar month controls">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button>
        </div>
      </section>

      <section className="glass-panel calendar-panel" aria-label={`${monthLabel} calendar`}>
        <div className="month-grid">
          {dayNames.map((day) => <div className="month-weekday" key={day}>{day}</div>)}
          {cells.map((dateNumber, index) => {
            if (!dateNumber) return <div className="month-empty" key={`empty-${index}`} aria-hidden="true" />;

            const date = new Date(year, month, dateNumber);
            const dateKey = toLocalDateString(date);
            const weekday = ((date.getDay() + 6) % 7) + 1;
            const classCount = entries.filter((entry) => entry.day === weekday).length;
            const examCount = exams.filter((exam) => exam.dateIso === dateKey).length;
            const isSelected = selectedDateKey === dateKey;

            return (
              <button
                type="button"
                key={dateKey}
                onClick={() => setSelectedDate(date)}
                className={`month-day ${isSelected ? "is-selected" : ""} ${dateKey === todayKey ? "is-today" : ""}`}
                aria-pressed={isSelected}
                aria-label={`${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${classCount ? `, ${classCount} classes` : ""}${examCount ? `, ${examCount} deadlines` : ""}`}
              >
                <span className="month-day-number">{dateNumber}</span>
                <span className="calendar-markers" aria-hidden="true">
                  {classCount > 0 && <i className="class-marker" />}
                  {examCount > 0 && <i className="exam-marker" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="calendar-legend"><span><i className="class-marker" /> Weekly classes</span><span><i className="exam-marker" /> Exam or deadline</span></div>
      </section>

      <section className="calendar-day-panel glass-panel" aria-live="polite">
        <div className="calendar-day-heading">
          <div>
            <div className="eyebrow"><CalendarDays size={13} /> SELECTED DAY</div>
            <h2>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
          </div>
          <span>{selectedEntries.length + selectedExams.length} items</span>
        </div>
        {selectedEntries.length === 0 && selectedExams.length === 0 ? (
          <p className="calendar-empty-state">No classes or deadlines on this day.</p>
        ) : (
          <div className="calendar-events">
            {selectedEntries.map((entry) => (
              <article className="calendar-event" key={entry.id}>
                <span className="event-time">{formatMinutes(entry.startMin)} – {formatMinutes(entry.endMin)}</span>
                <div><h3>{entry.subject}</h3><p>{[entry.room && `Room ${entry.room}`, entry.teacher].filter(Boolean).join(" · ") || "Class"}</p></div>
                <i className="class-marker" aria-hidden="true" />
              </article>
            ))}
            {selectedExams.map((exam) => (
              <article className="calendar-event" key={exam.id}>
                <span className="event-time">DEADLINE</span>
                <div><h3>{exam.title}</h3><p>{exam.subject} · {exam.priority.toLowerCase()} priority</p></div>
                <i className="exam-marker" aria-hidden="true" />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
