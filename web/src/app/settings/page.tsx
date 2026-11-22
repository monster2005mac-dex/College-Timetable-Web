"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { exportTimetableIcs } from "@/lib/exportIcs";
import { subscribeEntries, ClassEntry } from "@/lib/firestore";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [is24Hour, setIs24Hour] = useState(false);
  const [reminders, setReminders] = useState(true);

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
    <div className="space-y-6 py-4 max-w-3xl mx-auto">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-extrabold text-white">Preferences &amp; Style ⚙️</h1>
        <p className="text-xs text-white/70">Manage sync settings, exported files &amp; time formats</p>
      </div>

      {/* Account Info */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Cloud Account &amp; Sync</h3>
        <div className="p-4 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#E0B0FF] font-bold block">SIGNED IN USER</span>
            <span className="text-sm font-bold text-white">{user?.email || "Student"}</span>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 rounded-full glass-button text-xs text-white"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Calendar Export */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Export Calendar</h3>
        <p className="text-xs text-white/70">
          Download standard .ics iCalendar file to import into Google Calendar or Apple Calendar.
        </p>
        <button
          onClick={() => exportTimetableIcs(entries)}
          className="px-6 py-3 rounded-full bg-[#E0B0FF] text-black font-extrabold text-xs hover:bg-white transition-colors"
        >
          Export .ics File 📅
        </button>
      </div>

      {/* Time Format */}
      <div className="glass-panel p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">24-Hour Format</h3>
          <p className="text-xs text-white/70">Display times as 14:30 instead of 2:30 PM</p>
        </div>
        <input
          type="checkbox"
          checked={is24Hour}
          onChange={(e) => setIs24Hour(e.target.checked)}
          className="w-5 h-5 accent-[#E0B0FF]"
        />
      </div>
    </div>
  );
}
