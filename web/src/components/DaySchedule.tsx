"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LogOut, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ClassEntry, deleteEntry, saveEntry, subscribeEntries } from "@/lib/firestore";
import { formatMinutes } from "@/lib/useCurrentTime";
import EventProgressBar from "@/components/EventProgressBar";

function dateKey(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value ? null : parsed;
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

function timeValue(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function DaySchedule() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
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
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingEntryId, setWorkingEntryId] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) router.replace("/login");
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

  const selectedKey = dateKey(selectedDate);
  const selectedEntries = entriesForDate(entries, selectedDate);
  const weekday = ((selectedDate.getDay() + 6) % 7) + 1;
  const weekdayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  const isToday = selectedKey === dateKey(new Date());

  const chooseDate = (date: Date) => {
    setSelectedDate(date);
    window.history.replaceState(null, "", `${pathname}?date=${dateKey(date)}`);
    setActionError("");
  };

  const shiftDate = (amount: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount);
    chooseDate(next);
  };

  const openEditor = (entry?: ClassEntry) => {
    setEditingEntry(entry ?? null);
    setSubject(entry?.subject ?? "");
    setRoom(entry?.room ?? "");
    setTeacher(entry?.teacher ?? "");
    setStartMin(entry?.startMin ?? 540);
    setEndMin(entry?.endMin ?? 600);
    setRepeatWeekly(false);
    setFormError("");
    setEditorOpen(true);
  };

  const saveClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || saving) return;
    if (!subject.trim()) {
      setFormError("Enter a name for this class or activity.");
      return;
    }
    if (endMin <= startMin) return;

    setSaving(true);
    setFormError("");
    try {
      if (editingEntry) {
        const originalId = editingEntry.overrideOfId ?? editingEntry.id;
        const isRecurring = !editingEntry.dateIso;
        await saveEntry(user.uid, {
          ...editingEntry,
          id: isRecurring ? `occ_${selectedKey}_${originalId}` : editingEntry.id,
          subject: subject.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: weekday,
          startMin,
          endMin,
          dateIso: selectedKey,
          overrideOfId: isRecurring ? originalId : editingEntry.overrideOfId,
          isCancelled: false,
        });
      } else {
        const entry: ClassEntry = {
          id: crypto.randomUUID(),
          subject: subject.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: weekday,
          startMin,
          endMin,
          colorIndex: Math.floor(Math.random() * 6),
        };
        if (!repeatWeekly) entry.dateIso = selectedKey;
        await saveEntry(user.uid, entry);
      }
      setEditorOpen(false);
    } catch {
      setFormError("We couldn’t save this schedule item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeOccurrence = async (entry: ClassEntry) => {
    if (!user || workingEntryId) return;
    setWorkingEntryId(entry.id);
    setActionError("");
    try {
      if (entry.dateIso && !entry.overrideOfId) {
        await deleteEntry(user.uid, entry.id);
      } else {
        const originalId = entry.overrideOfId ?? entry.id;
        await saveEntry(user.uid, {
          ...entry,
          id: `occ_${selectedKey}_${originalId}`,
          day: weekday,
          dateIso: selectedKey,
          overrideOfId: originalId,
          isCancelled: true,
        });
      }
    } catch {
      setActionError("Couldn’t update this day. Please try again.");
    } finally {
      setWorkingEntryId("");
    }
  };

  const restoreOccurrence = async (entry: ClassEntry) => {
    if (!user || !entry.overrideOfId || workingEntryId) return;
    setWorkingEntryId(entry.id);
    setActionError("");
    try {
      await deleteEntry(user.uid, entry.id);
    } catch {
      setActionError("Couldn’t restore the weekly class. Please try again.");
    } finally {
      setWorkingEntryId("");
    }
  };

  if (!authReady || !user || !dateReady) {
    return <div className="loading-state" role="status"><span className="loading-orb" />Loading your day…</div>;
  }

  return (
    <div className="dated-week-page flex flex-col gap-6 py-4">
      <section className="glass-panel dated-week-heading">
        <div className="dated-week-title">
          <div className="eyebrow"><CalendarDays size={13} /> YOUR DAY</div>
          <h1>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h1>
          <p>See weekly classes and add or adjust items for this date.</p>
        </div>
        <div className="dated-week-actions">
          <label className="date-picker-label" htmlFor="day-date">Jump to date</label>
          <input id="day-date" type="date" value={selectedKey} onChange={(event) => {
            const next = parseDate(event.target.value);
            if (next) chooseDate(next);
          }} />
          <button type="button" className="week-step-button" aria-label="Previous day" onClick={() => shiftDate(-1)}><ArrowLeft size={16} /></button>
          <button type="button" className="week-step-button" aria-label="Next day" onClick={() => shiftDate(1)}><ArrowRight size={16} /></button>
          <button type="button" className="week-today-button" onClick={() => chooseDate(new Date())} disabled={isToday}>Today</button>
          <button type="button" className="week-step-button" title="Sign out" aria-label="Sign out" onClick={() => signOut(auth)}><LogOut size={15} /></button>
        </div>
      </section>

      <section className="glass-panel dated-day-panel" aria-live="polite">
        <div className="dated-day-header">
          <div>
            <div className="eyebrow"><span className="live-dot" /> SELECTED DATE</div>
            <h2>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
            <p>{selectedEntries.length} scheduled {selectedEntries.length === 1 ? "class" : "classes"} · edits apply to this day only</p>
          </div>
          <button type="button" className="week-add-button" onClick={() => openEditor()}><Plus size={15} /> Add to this day</button>
        </div>

        {actionError && <p className="week-form-error" role="alert">{actionError}</p>}
        {selectedEntries.length === 0 ? (
          <div className="dated-week-empty"><CalendarDays size={22} /><p>No classes for this date yet.</p><button type="button" onClick={() => openEditor()}>Add a class or activity</button></div>
        ) : (
          <div className="dated-class-list">
            {selectedEntries.map((entry) => {
              const isOverride = Boolean(entry.overrideOfId);
              const isOneOff = Boolean(entry.dateIso && !entry.overrideOfId);
              const isWorking = workingEntryId === entry.id;
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
                      <button type="button" className="icon-action" aria-label={`Restore weekly ${entry.subject}`} title="Restore weekly class" disabled={Boolean(workingEntryId)} onClick={() => restoreOccurrence(entry)}><RotateCcw size={15} /></button>
                    )}
                    {!entry.isCancelled && <>
                      <button type="button" className="icon-action" aria-label={`Edit ${entry.subject} on ${selectedKey}`} title="Edit this date" onClick={() => openEditor(entry)}><Pencil size={15} /></button>
                      <button type="button" className="icon-action is-danger" aria-label={`Remove ${entry.subject} from ${selectedKey}`} title="Remove from this date" disabled={Boolean(workingEntryId)} onClick={() => removeOccurrence(entry)}><Trash2 size={15} /></button>
                    </>}
                    {isWorking && <span className="sr-only" role="status">Updating {entry.subject}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="week-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setEditorOpen(false);
        }}>
          <section className="week-editor glass-panel" role="dialog" aria-modal="true" aria-labelledby="day-editor-title">
            <div className="week-editor-heading">
              <div><div className="eyebrow"><CalendarDays size={13} /> {selectedKey}</div><h2 id="day-editor-title">{editingEntry ? "Edit this date" : "Add to this day"}</h2></div>
              <button type="button" className="week-close-button" aria-label="Close editor" disabled={saving} onClick={() => setEditorOpen(false)}>×</button>
            </div>
            <p className="week-editor-note">{editingEntry ? "Changes to a weekly class affect this date only." : `Add to ${weekdayName}, ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`}</p>
            <form className="week-editor-form" onSubmit={saveClass}>
              <label>Class or activity<input autoFocus required maxLength={100} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Data Structures" /></label>
              <label>Room / location<input maxLength={100} value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Optional" /></label>
              <label>Instructor<input maxLength={100} value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Optional" /></label>
              <div className="week-time-fields">
                <label>Starts<input type="time" required value={timeValue(startMin)} onChange={(event) => setStartMin(timeMinutes(event.target.value))} /></label>
                <label>Ends<input type="time" required value={timeValue(endMin)} onChange={(event) => setEndMin(timeMinutes(event.target.value))} /></label>
              </div>
              {!editingEntry && (
                <div className="week-repeat-option">
                  <input id="day-repeat-weekly" type="checkbox" checked={repeatWeekly} onChange={(event) => setRepeatWeekly(event.target.checked)} />
                  <label htmlFor="day-repeat-weekly">Repeat weekly on {weekdayName}</label>
                </div>
              )}
              {formError && <p className="week-form-error" role="alert">{formError}</p>}
              {endMin <= startMin && <p className="week-form-error" role="alert">End time must be later than the start time.</p>}
              <div className="week-editor-actions"><button type="button" className="week-cancel-button" disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</button><button type="submit" className="week-save-button" disabled={saving || endMin <= startMin}>{saving ? "Saving…" : repeatWeekly && !editingEntry ? "Save weekly class" : editingEntry ? "Save date" : "Save for this day"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
