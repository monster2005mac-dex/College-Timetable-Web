"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ClassEntry, ExamEntry, subscribeEntries, subscribeExams } from "@/lib/firestore";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unSub1 = subscribeEntries(user.uid, setEntries);
    const unSub2 = subscribeExams(user.uid, setExams);
    return () => {
      unSub1();
      unSub2();
    };
  }, [user]);

  const daysInMonth = 30;

  return (
    <div className="space-y-6 py-4">
      <div className="glass-panel p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Interactive Full Month Calendar 📅</h1>
          <p className="text-xs text-white/70">View monthly schedule &amp; upcoming exam deadlines</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#E0B0FF] pb-2">
        {dayNames.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dateNum = idx + 1;
          const isSelected = selectedDate === dateNum;

          return (
            <button
              key={dateNum}
              onClick={() => setSelectedDate(dateNum)}
              className={`p-4 rounded-2xl glass-panel text-left space-y-2 transition-all ${
                isSelected ? "border-2 border-[#E0B0FF] bg-[#E0B0FF]/20" : "hover:bg-white/10"
              }`}
            >
              <span className="font-extrabold text-sm text-white">{dateNum}</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#E0B0FF]" />
                <div className="w-2 h-2 rounded-full bg-red-400" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
