"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  AttendanceRecord,
  ClassEntry,
  subscribeAttendance,
  subscribeEntries,
  saveAttendanceRecord,
} from "@/lib/firestore";

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [targetPct, setTargetPct] = useState<number>(75);

  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unSubEntries = subscribeEntries(user.uid, setEntries);
    const unSubAttendance = subscribeAttendance(user.uid, setAttendance);
    return () => {
      unSubEntries();
      unSubAttendance();
    };
  }, [user]);

  const subjects = Array.from(
    new Set([...entries.map((e) => e.subject), ...Object.keys(attendance)])
  ).filter(Boolean);

  const handleUpdate = async (subject: string, deltaAttended: number, deltaMissed: number) => {
    if (!user) return;
    const current = attendance[subject] || {
      subject,
      attended: 0,
      missed: 0,
      totalConducted: 0,
      percentage: 100,
    };

    const newAttended = Math.max(0, current.attended + deltaAttended);
    const newMissed = Math.max(0, current.missed + deltaMissed);
    const newTotal = newAttended + newMissed;
    const newPct = newTotal === 0 ? 100 : (newAttended / newTotal) * 100;

    const updated: AttendanceRecord = {
      subject,
      attended: newAttended,
      missed: newMissed,
      totalConducted: newTotal,
      percentage: newPct,
    };

    await saveAttendanceRecord(user.uid, updated);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Attendance and bunk manager
          </h1>
          <p className="text-xs text-white/70">
            Smart bunk calculator synced live across Web &amp; Android
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-white/70">Target %:</span>
          {[75, 80, 85].map((pct) => (
            <button
              key={pct}
              onClick={() => setTargetPct(pct)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                targetPct === pct
                  ? "bg-[#b7f479] text-black"
                  : "glass-panel text-white/80"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Subject List Grid */}
      {subjects.length === 0 ? (
        <div className="glass-panel p-12 text-center text-white/60 text-sm">
          No subjects found. Add class slots on the Dashboard first!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((sub) => {
            const rec = attendance[sub] || {
              subject: sub,
              attended: 0,
              missed: 0,
              totalConducted: 0,
              percentage: 100,
            };
            const isSafe = rec.percentage >= targetPct;

            return (
              <div key={sub} className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{sub}</h3>
                    <p className="text-xs text-white/70">
                      {rec.attended} / {rec.totalConducted} attended
                    </p>
                  </div>
                  <span
                    className={`text-2xl font-extrabold ${
                      isSafe ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {rec.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSafe ? "bg-[#b7f479]" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(100, rec.percentage)}%` }}
                  />
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      isSafe
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {isSafe ? "Above target" : "Attend the next class"}
                  </span>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdate(sub, 1, 0)}
                      className="px-3 py-1.5 rounded-full bg-green-500/30 border border-green-400 text-xs font-bold text-white hover:bg-green-500/50"
                    >
                      + Present
                    </button>
                    <button
                      onClick={() => handleUpdate(sub, 0, 1)}
                      className="px-3 py-1.5 rounded-full bg-red-500/30 border border-red-400 text-xs font-bold text-white hover:bg-red-500/50"
                    >
                      + Bunked
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
