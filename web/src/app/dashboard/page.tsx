"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  ClassEntry,
  AttendanceRecord,
  ExamEntry,
  subscribeEntries,
  subscribeAttendance,
  subscribeExams,
  saveEntry,
  deleteEntry,
} from "@/lib/firestore";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [exams, setExams] = useState<ExamEntry[]>([]);

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [startMin, setStartMin] = useState(540); // 9:00 AM
  const [endMin, setEndMin] = useState(600);   // 10:00 AM

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unSubEntries = subscribeEntries(user.uid, setEntries);
    const unSubAttendance = subscribeAttendance(user.uid, setAttendance);
    const unSubExams = subscribeExams(user.uid, setExams);

    return () => {
      unSubEntries();
      unSubAttendance();
      unSubExams();
    };
  }, [user]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim()) return;

    const newEntry: ClassEntry = {
      id: crypto.randomUUID(),
      subject: subject.trim(),
      room: room.trim(),
      teacher: teacher.trim(),
      day: selectedDay,
      startMin: Number(startMin),
      endMin: Number(endMin),
      colorIndex: Math.floor(Math.random() * 6),
    };

    await saveEntry(user.uid, newEntry);
    setSubject("");
    setRoom("");
    setTeacher("");
    setShowAddModal(false);
  };

  const handleDeleteSlot = async (id: string) => {
    if (!user) return;
    await deleteEntry(user.uid, id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#b7f479] animate-pulse text-lg font-bold">
          Syncing your schedule…
        </div>
      </div>
    );
  }

  const dayEntries = entries.filter((e) => e.day === selectedDay).sort((a, b) => a.startMin - b.startMin);

  return (
    <div className="space-y-8 py-4">
      {/* User Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.displayName || user?.email?.split("@")[0] || "Student"}
          </h1>
          <p className="text-xs text-white/70">
            Your schedule is connected and in sync
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#b7f479] text-black font-extrabold text-sm hover:bg-white transition-colors"
          >
            + Add Class / Task
          </button>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2.5 rounded-full glass-button text-xs text-white"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Day Selector Strip */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {dayNames.map((name, i) => {
          const dayVal = i + 1;
          const isSelected = selectedDay === dayVal;
          return (
            <button
              key={name}
              onClick={() => setSelectedDay(dayVal)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? "bg-[#b7f479] text-black shadow-lg shadow-[#b7f479]/20"
                  : "glass-panel text-white/80 hover:bg-white/10"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">
          {dayNames[selectedDay - 1]}&apos;s Schedule
        </h2>

        {dayEntries.length === 0 ? (
          <div className="glass-panel p-12 text-center text-white/60 text-sm">
            No classes or tasks scheduled for {dayNames[selectedDay - 1]}. Tap + Add to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dayEntries.map((entry) => (
              <div key={entry.id} className="glass-panel p-5 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#b7f479]">
                    {Math.floor(entry.startMin / 60)}:
                    {(entry.startMin % 60).toString().padStart(2, "0")} –{" "}
                    {Math.floor(entry.endMin / 60)}:
                    {(entry.endMin % 60).toString().padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => handleDeleteSlot(entry.id)}
                    className="text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                  >
                    Delete
                  </button>
                </div>

                <h3 className="text-lg font-extrabold text-white">{entry.subject}</h3>

                {(entry.room || entry.teacher) && (
                  <p className="text-xs text-white/70">
                    {entry.room && `Room ${entry.room}`} {entry.room && entry.teacher && "•"}{" "}
                    {entry.teacher && `Instructor: ${entry.teacher}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold text-white">Add Schedule Slot</h3>

            <form onSubmit={handleAddSlot} className="space-y-3">
              <div>
                <label className="block text-xs text-white/80 mb-1">Title / Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Data Structures"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Room / Location (optional)</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Room 302"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Teacher / Instructor (optional)</label>
                <input
                  type="text"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#b7f479] text-black font-extrabold text-xs hover:bg-white"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
