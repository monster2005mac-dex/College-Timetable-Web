"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  ExamEntry,
  subscribeExams,
  saveExamEntry,
  deleteExamEntry,
} from "@/lib/firestore";

export default function ExamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dateIso, setDateIso] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState("HIGH");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    return subscribeExams(user.uid, setExams);
  }, [user]);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    const newExam: ExamEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      dateIso,
      priority,
    };

    await saveExamEntry(user.uid, newExam);
    setTitle("");
    setSubject("");
    setShowAddModal(false);
  };

  const handleDeleteExam = async (id: string) => {
    if (!user) return;
    await deleteExamEntry(user.uid, id);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Exams &amp; Assignments Tracker 📝
          </h1>
          <p className="text-xs text-white/70">
            Priority deadline manager synced with Android
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-full bg-[#E0B0FF] text-black font-extrabold text-sm hover:bg-white transition-colors"
        >
          + Add Deadline
        </button>
      </div>

      {/* Exam List */}
      {exams.length === 0 ? (
        <div className="glass-panel p-12 text-center text-white/60 text-sm">
          No upcoming exams or assignments! Tap + Add Deadline to record one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div key={exam.id} className="glass-panel p-5 space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    exam.priority === "HIGH"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {exam.priority} PRIORITY
                </span>

                <button
                  onClick={() => handleDeleteExam(exam.id)}
                  className="text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                >
                  Delete
                </button>
              </div>

              <h3 className="text-lg font-extrabold text-white">{exam.title}</h3>
              <p className="text-xs text-white/70">{exam.subject}</p>
              <p className="text-xs text-[#E0B0FF] font-bold">Due Date: {exam.dateIso}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold text-white">Add Exam / Deadline</h3>

            <form onSubmit={handleAddExam} className="space-y-3">
              <div>
                <label className="block text-xs text-white/80 mb-1">Title (e.g. Midterm 1)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Midterm Exam"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Computer Networks"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dateIso}
                  onChange={(e) => setDateIso(e.target.value)}
                  required
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
                  className="flex-1 py-2.5 rounded-xl bg-[#E0B0FF] text-black font-extrabold text-xs hover:bg-white"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
