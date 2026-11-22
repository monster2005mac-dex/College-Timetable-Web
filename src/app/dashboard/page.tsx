"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GraduationCap, MapPin, Plus, Sparkles, Trash2, UsersRound } from "lucide-react";
import { ClassEntry, AttendanceRecord, ExamEntry, subscribeEntries, subscribeAttendance, subscribeExams, saveEntry, deleteEntry } from "@/lib/firestore";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const colors = ["#a5f36b", "#8fd9ff", "#ffbf7b", "#d0adff", "#ff91a8", "#70e0c1"];
const formatTime = (minutes: number) => `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${minutes >= 720 ? "PM" : "AM"}`;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 7 : new Date().getDay());
  const [showAddModal, setShowAddModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [startMin, setStartMin] = useState(540);
  const [endMin, setEndMin] = useState(600);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setLoading(false);
    if (!currentUser) router.push("/login");
  }), [router]);

  useEffect(() => {
    if (!user) return;
    const stopEntries = subscribeEntries(user.uid, setEntries);
    const stopAttendance = subscribeAttendance(user.uid, setAttendance);
    const stopExams = subscribeExams(user.uid, setExams);
    return () => { stopEntries(); stopAttendance(); stopExams(); };
  }, [user]);

  const dayEntries = useMemo(() => entries.filter((entry) => entry.day === selectedDay).sort((a, b) => a.startMin - b.startMin), [entries, selectedDay]);
  const nextClass = dayEntries.find((entry) => entry.endMin > new Date().getHours() * 60 + new Date().getMinutes()) || dayEntries[0];

  const handleAddSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !subject.trim()) return;
    await saveEntry(user.uid, { id: crypto.randomUUID(), subject: subject.trim(), room: room.trim(), teacher: teacher.trim(), day: selectedDay, startMin: Number(startMin), endMin: Number(endMin), colorIndex: Math.floor(Math.random() * colors.length) });
    setSubject(""); setRoom(""); setTeacher(""); setShowAddModal(false);
  };

  if (loading) return <div className="loading-state"><span className="loading-orb" />Connecting to your campus…</div>;

  return (
    <div className="dash-shell">
      <section className="dash-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, IN ORBIT</div>
          <h1>Make room for<br /><span>what matters.</span></h1>
          <p>Your week, mapped in a calmer dimension.</p>
          <div className="hero-actions">
            <button className="button-primary" onClick={() => setShowAddModal(true)}><Plus size={17} /> Add to schedule</button>
            <button className="button-quiet" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>
        <div className="orbit-scene" aria-hidden="true">
          <div className="orbit-glow" /><div className="orbit-ring orbit-ring-back" /><div className="orbit-ring orbit-ring-front" />
          <div className="orbit-core"><span>WEEK</span><strong>0{entries.length}</strong><small>SESSIONS</small></div>
          <div className="orbit-node node-one"><CalendarDays size={17} /></div><div className="orbit-node node-two"><Sparkles size={17} /></div><div className="orbit-node node-three"><GraduationCap size={18} /></div>
          <div className="orbit-label label-top">LIVE SYNC <span>●</span></div><div className="orbit-label label-bottom">YOUR WEEK, IN MOTION</div>
        </div>
        <div className="hero-foot"><span>STUDENT SPACE / 01</span><span>REAL-TIME CLOUD SYNC <i>↗</i></span></div>
      </section>

      <section className="overview-grid" aria-label="Schedule overview">
        <article className="overview-card overview-highlight"><div className="card-icon lime"><Clock3 size={17} /></div><span className="card-label">UP NEXT</span><strong>{nextClass?.subject || "A little breathing room"}</strong><p>{nextClass ? `${formatTime(nextClass.startMin)} · ${nextClass.room || "Campus"}` : "Nothing on the schedule yet"}</p><div className="mini-progress"><span style={{ width: nextClass ? "62%" : "8%" }} /></div></article>
        <article className="overview-card"><div className="card-icon blue"><CalendarDays size={17} /></div><span className="card-label">THIS WEEK</span><strong>{entries.length} <small>sessions</small></strong><p>Across your campus calendar</p><div className="spark-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article className="overview-card"><div className="card-icon lilac"><UsersRound size={17} /></div><span className="card-label">ATTENDANCE</span><strong>{Object.keys(attendance).length ? `${Object.keys(attendance).length}` : "—"}<small> tracked</small></strong><p>Your consistency, at a glance</p><a href="/attendance" className="card-link">View attendance <span>↗</span></a></article>
        <article className="overview-card"><div className="card-icon peach"><GraduationCap size={17} /></div><span className="card-label">ON THE HORIZON</span><strong>{exams.length || "No"} <small>{exams.length === 1 ? "exam" : "exams"}</small></strong><p>Keep your next milestone close</p><a href="/exams" className="card-link">Open exam planner <span>↗</span></a></article>
      </section>

      <section className="schedule-section">
        <div className="section-heading"><div><div className="eyebrow">YOUR PERSONAL TIMELINE</div><h2>A week with intention<span>.</span></h2></div><div className="week-controls"><button aria-label="Previous day" onClick={() => setSelectedDay((day) => day === 1 ? 7 : day - 1)}><ChevronLeft size={17} /></button><span>WEEK 01 <i>·</i> NOV 2026</span><button aria-label="Next day" onClick={() => setSelectedDay((day) => day === 7 ? 1 : day + 1)}><ChevronRight size={17} /></button></div></div>
        <div className="day-rail" role="tablist" aria-label="Choose a day">{dayNames.map((name, index) => { const day = index + 1; const chosen = selectedDay === day; const count = entries.filter((entry) => entry.day === day).length; return <button key={name} role="tab" aria-selected={chosen} className={`day-tab ${chosen ? "active" : ""}`} onClick={() => setSelectedDay(day)}><span>{name}</span><strong>{String(day).padStart(2, "0")}</strong><small>{count ? `${count} ${count === 1 ? "class" : "classes"}` : "—"}</small></button>; })}</div>
        <div className="timeline-head"><span>{dayNames[selectedDay - 1]} · YOUR FLOW</span><span>{dayEntries.length} {dayEntries.length === 1 ? "SESSION" : "SESSIONS"}</span></div>
        <div className="timeline">
          {dayEntries.length ? dayEntries.map((entry, index) => <article className="timeline-item" key={entry.id} style={{ "--item-color": colors[entry.colorIndex % colors.length] } as React.CSSProperties}><div className="timeline-time"><strong>{formatTime(entry.startMin)}</strong><span>{formatTime(entry.endMin)}</span></div><div className="timeline-track"><span className="track-dot" /><span className="track-line" /></div><div className="class-card" style={{ "--card-depth": `${index % 2 === 0 ? 0 : 1}` } as React.CSSProperties}><div className="class-card-top"><span className="class-kicker">SESSION {String(index + 1).padStart(2, "0")}</span><button className="delete-class" aria-label={`Delete ${entry.subject}`} onClick={() => user && deleteEntry(user.uid, entry.id)}><Trash2 size={15} /></button></div><h3>{entry.subject}</h3><div className="class-meta">{entry.room && <span><MapPin size={13} />{entry.room}</span>}{entry.teacher && <span><UsersRound size={13} />{entry.teacher}</span>}</div><div className="class-duration"><span style={{ width: `${Math.max(22, Math.min(100, (entry.endMin - entry.startMin) / 1.5))}%` }} /></div></div></article>) : <div className="empty-timeline"><div className="empty-icon"><CalendarDays size={23} /></div><h3>Space to start something.</h3><p>No classes mapped for {dayNames[selectedDay - 1]}. Add a session and make the day yours.</p><button className="button-primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add a class</button></div>}
        </div>
      </section>

      {showAddModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddModal(false); }}><section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={() => setShowAddModal(false)}>×</button><div className="eyebrow">BUILD YOUR WEEK</div><h2 id="modal-title">Add a session<span>.</span></h2><p className="modal-description">Give this block a place in your schedule.</p><form onSubmit={handleAddSlot}><label>Class or subject<input value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder="e.g. Human-computer interaction" /></label><label>Room or location <span>OPTIONAL</span><input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="e.g. Design studio 204" /></label><label>Instructor <span>OPTIONAL</span><input value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="e.g. Professor Chen" /></label><div className="form-row"><label>Starts at<input type="time" value={`${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`} onChange={(event) => { const [hours, minutes] = event.target.value.split(":").map(Number); setStartMin(hours * 60 + minutes); }} /></label><label>Ends at<input type="time" value={`${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`} onChange={(event) => { const [hours, minutes] = event.target.value.split(":").map(Number); setEndMin(hours * 60 + minutes); }} /></label></div><div className="modal-actions"><button type="button" className="button-quiet" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit" className="button-primary"><Plus size={16} /> Save session</button></div></form></section></div>}
    </div>
  );
}
