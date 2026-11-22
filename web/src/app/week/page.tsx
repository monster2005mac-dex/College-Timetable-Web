"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ClassEntry, subscribeEntries } from "@/lib/firestore";
import { formatMinutes } from "@/lib/useCurrentTime";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekGridPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);

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

  return (
    <div className="space-y-6 py-4">
      <div className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Full Week Schedule Grid 🗓️</h1>
          <p className="text-xs text-white/70">Complete 7-day timetable matrix view</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto">
        {dayNames.map((name, idx) => {
          const dayVal = idx + 1;
          const dayEntries = entries
            .filter((e) => e.day === dayVal)
            .sort((a, b) => a.startMin - b.startMin);

          return (
            <div key={name} className="glass-panel p-4 space-y-3 min-w-[140px]">
              <div className="text-center pb-2 border-b border-white/10">
                <h3 className="font-extrabold text-[#E0B0FF] text-sm">{name}</h3>
                <span className="text-[10px] text-white/50">{dayEntries.length} Slots</span>
              </div>

              {dayEntries.length === 0 ? (
                <div className="text-center text-xs text-white/40 py-6">No Classes</div>
              ) : (
                dayEntries.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl bg-white/10 border border-white/15 space-y-1"
                  >
                    <span className="text-[10px] font-bold text-[#E0B0FF] block">
                      {formatMinutes(e.startMin)} – {formatMinutes(e.endMin)}
                    </span>
                    <h4 className="font-bold text-xs text-white truncate">{e.subject}</h4>
                    {e.room && <p className="text-[10px] text-white/60">Room {e.room}</p>}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
