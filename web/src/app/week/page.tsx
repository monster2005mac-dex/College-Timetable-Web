"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ClassEntry, subscribeEntries, saveEntry, deleteEntry } from "@/lib/firestore";
import { formatMinutes } from "@/lib/useCurrentTime";
import EventProgressBar from "@/components/EventProgressBar";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value ? null : parsed;
}

function mondayFor(date: Date) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function entriesForDate(entries: ClassEntry[], date: Date) {
  const key = dateKey(date);
  const weekday = ((date.getDay() + 6) % 7) + 1;
  const datedEntries = entries.filter((entry) => entry.dateIso === key);
  const hiddenRecurringIds = new Set(datedEntries.map((entry) => entry.overrideOfId).filter(Boolean));
  return [
    ...entries.filter((entry) => (entry.dateIso === undefined || entry.dateIso === null) && entry.day === weekday && !hiddenRecurringIds.has(entry.id)),
    ...datedEntries,
  ].sort((a, b) => a.startMin - b.startMin);
}

export default function WeekGridPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dateReady, setDateReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ClassEntry | null>(null);
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [startMin, setStartMin] = useState(540);
  const [endMin, setEndMin] = useState(600);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    return subscribeEntries(user.uid, setEntries);
  }, [user]);

  useEffect(() => {
    const fromUrl = parseDate(new URLSearchParams(window.location.search).get("date"));
    if (fromUrl) setSelectedDate(fromUrl);
    setDateReady(true);
  }, []);

  const weekStart = useMemo(() => mondayFor(selectedDate), [selectedDate]);
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }),
    [weekStart]
  );
  const selectedKey = dateKey(selectedDate);
  const selectedEntries = entriesForDate(entries, selectedDate);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const chooseDate = (date: Date) => {
    setSelectedDate(date);
    const nextKey = dateKey(date);
    window.history.replaceState(null, "", `${pathname}?date=${nextKey}`);
  };

  const shiftWeek = (amount: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount * 7);
    chooseDate(next);
  };

  const openEditor = (entry?: ClassEntry) => {
    setEditingEntry(entry ?? null);
    setSubject(entry?.subject ?? "");
    setRoom(entry?.room ?? "");
    setTeacher(entry?.teacher ?? "");
    setStartMin(entry?.startMin ?? 540);
    setEndMin(entry?.endMin ?? 600);
    setEditorOpen(true);
  };

  const saveClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !subject.trim() || saving || endMin <= startMin) return;
    setSaving(true);
    try {
      if (editingEntry) {
        const originalId = editingEntry.overrideOfId ?? editingEntry.id;
        const isRecurring = !editingEntry.dateIso;
        const updated: ClassEntry = {
          ...editingEntry,
          id: isRecurring ? `occ_${selectedKey}_${originalId}` : editingEntry.id,
          subject: subject.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: ((selectedDate.getDay() + 6) % 7) + 1,
          startMin,
          endMin,
          dateIso: selectedKey,
          overrideOfId: isRecurring ? originalId : editingEntry.overrideOfId,
          isCancelled: false,
        };
        await saveEntry(user.uid, updated);
      } else {
        await saveEntry(user.uid, {
          id: crypto.randomUUID(),
          subject: subject.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: ((selectedDate.getDay() + 6) % 7) + 1,
          startMin,
          endMin,
          colorIndex: Math.floor(Math.random() * 6),
          dateIso: selectedKey,
        });
      }
      setEditorOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const removeOccurrence = async (entry: ClassEntry) => {
    if (!user) return;
    if (entry.dateIso && !entry.overrideOfId) {
      await deleteEntry(user.uid, entry.id);
      return;
    }
    const originalId = entry.overrideOfId ?? entry.id;
    await saveEntry(user.uid, {
      ...entry,
      id: `occ_${selectedKey}_${originalId}`,
      dateIso: selectedKey,
      overrideOfId: originalId,
      isCancelled: true,
    });
  };

  const restoreOccurrence = async (entry: ClassEntry) => {
    if (!user || !entry.overrideOfId) return;
    await deleteEntry(user.uid, entry.id);
  };

  if (!dateReady) return <div className="py-24 text-center text-sm text-white/60">Loading your week…</div>;

  return (
    <div className="dated-week-page flex flex-col gap-6 py-4">
      <section className="glass-panel dated-week-heading">
        <div className="dated-week-title">
          <div className="eyebrow"><CalendarDays size={13} /> YOUR WEEK</div>
          <h1>{weekLabel}</h1>
          <p>Pick a date to review or change only that day&apos;s schedule.</p>
        </div>
        <div className="dated-week-actions">
          <label className="date-picker-label" htmlFor="week-date">Jump to date</label>
          <input id="week-date" type="date" value={selectedKey} onChange={(event) => {
            const next = parseDate(event.target.value);
            if (next) chooseDate(next);
          }} />
          <button type="button" className="week-step-button" aria-label="Previous week" onClick={() => shiftWeek(-1)}><ArrowLeft size={16} /></button>
          <button type="button" className="week-step-button" aria-label="Next week" onClick={() => shiftWeek(1)}><ArrowRight size={16} /></button>
          <button type="button" className="week-today-button" onClick={() => chooseDate(new Date())}>Today</button>
        </div>
      </section>

      <section className="dated-week-strip" aria-label="Select a date this week">
        {dates.map((date, index) => {
          const key = dateKey(date);
          const active = key === selectedKey;
          const items = entriesForDate(entries, date);
          return (
            <button key={key} type="button" className={`dated-week-day ${active ? "is-active" : ""} ${key === dateKey(new Date()) ? "is-today" : ""}`} aria-pressed={active} onClick={() => chooseDate(date)}>
              <span>{shortDays[index]}</span>
              <strong>{date.getDate()}</strong>
              <small>{items.length} {items.length === 1 ? "class" : "classes"}</small>
            </button>
          );
        })}
      </section>

      <section className="glass-panel dated-day-panel" aria-live="polite">
        <div className="dated-day-header">
          <div>
            <div className="eyebrow"><span className="live-dot" /> SELECTED DATE</div>
            <h2>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
            <p>{selectedEntries.length} scheduled {selectedEntries.length === 1 ? "class" : "classes"} · changes here won&apos;t affect your weekly template</p>
          </div>
          <button type="button" className="week-add-button" onClick={() => openEditor()}><Plus size={15} /> Add to this date</button>
        </div>

        {selectedEntries.length === 0 ? (
          <div className="dated-week-empty"><CalendarDays size={22} /><p>No classes for this date yet.</p><button type="button" onClick={() => openEditor()}>Add a one-day class</button></div>
        ) : (
          <div className="dated-class-list">
            {selectedEntries.map((entry) => {
              const isOverride = Boolean(entry.overrideOfId);
              const isOneOff = Boolean(entry.dateIso && !entry.overrideOfId);
              return (
                <article className={`dated-class-card ${entry.isCancelled ? "is-cancelled" : ""}`} key={entry.id}>
                  <div className="dated-class-time"><Clock3 size={14} /><span>{formatMinutes(entry.startMin)} – {formatMinutes(entry.endMin)}</span></div>
                  <div className="dated-class-info">
                    <h3>{entry.subject}</h3>
                    <p>{entry.isCancelled ? "This weekly class is hidden on this date" : [entry.room && `Room ${entry.room}`, entry.teacher].filter(Boolean).join(" · ") || "Class on your schedule"}</p>
                    {!entry.isCancelled && <EventProgressBar subject={entry.subject} eventDate={selectedKey} startMin={entry.startMin} endMin={entry.endMin} />}
                  </div>
                  <span className={`occurrence-badge ${entry.isCancelled ? "is-cancelled-badge" : isOverride ? "is-edited" : isOneOff ? "is-oneoff" : ""}`}>{entry.isCancelled ? "Removed for date" : isOverride ? "Date edited" : isOneOff ? "One-time" : "Weekly"}</span>
                  <div className="dated-class-actions">
                    {isOverride && (
                      <button type="button" className="icon-action" aria-label={`Restore weekly ${entry.subject}`} title="Restore weekly class" onClick={() => restoreOccurrence(entry)}><RotateCcw size={15} /></button>
                    )}
                    {!entry.isCancelled && <>
                      <button type="button" className="icon-action" aria-label={`Edit ${entry.subject} on ${selectedKey}`} title="Edit this date" onClick={() => openEditor(entry)}><Pencil size={15} /></button>
                      <button type="button" className="icon-action is-danger" aria-label={`Remove ${entry.subject} from ${selectedKey}`} title="Remove from this date" onClick={() => removeOccurrence(entry)}><Trash2 size={15} /></button>
                    </>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="week-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditorOpen(false);
        }}>
          <section className="week-editor glass-panel" role="dialog" aria-modal="true" aria-labelledby="week-editor-title">
            <div className="week-editor-heading">
              <div><div className="eyebrow"><CalendarDays size={13} /> {selectedKey}</div><h2 id="week-editor-title">{editingEntry ? "Edit this date" : "Add to this date"}</h2></div>
              <button type="button" className="week-close-button" aria-label="Close editor" onClick={() => setEditorOpen(false)}>×</button>
            </div>
            <p className="week-editor-note">This change applies to {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} only.</p>
            <form className="week-editor-form" onSubmit={saveClass}>
              <label>Class or activity<input autoFocus required maxLength={100} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Data Structures" /></label>
              <label>Room / location<input maxLength={100} value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Optional" /></label>
              <label>Instructor<input maxLength={100} value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Optional" /></label>
              <div className="week-time-fields">
                <label>Starts<input type="time" required value={`${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`} onChange={(event) => {
                  const [hours, minutes] = event.target.value.split(":").map(Number);
                  if (Number.isFinite(hours) && Number.isFinite(minutes)) setStartMin(hours * 60 + minutes);
                }} /></label>
                <label>Ends<input type="time" required value={`${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`} onChange={(event) => {
                  const [hours, minutes] = event.target.value.split(":").map(Number);
                  if (Number.isFinite(hours) && Number.isFinite(minutes)) setEndMin(hours * 60 + minutes);
                }} /></label>
              </div>
              {endMin <= startMin && <p className="week-form-error" role="alert">End time must be later than the start time.</p>}
              <div className="week-editor-actions"><button type="button" className="week-cancel-button" onClick={() => setEditorOpen(false)}>Cancel</button><button type="submit" className="week-save-button" disabled={saving || endMin <= startMin}>{saving ? "Saving…" : "Save date"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
