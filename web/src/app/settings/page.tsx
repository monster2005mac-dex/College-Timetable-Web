"use client";

import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { exportTimetableIcs } from "@/lib/exportIcs";
import { Fingerprint } from "lucide-react";
import DevicePinSettings from "@/components/DevicePinSettings";
import {
  checkDeviceBiometricAvailable,
  isDeviceBiometricEnabled,
  registerDeviceBiometrics,
  removeDeviceBiometrics,
} from "@/lib/webauthn";
import {
  AttendanceRecord,
  ClassEntry,
  clearUserFirestoreData,
  ExamEntry,
  subscribeAttendance,
  subscribeEntries,
  subscribeExams,
  subscribeUserProfile,
} from "@/lib/firestore";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [is24Hour, setIs24Hour] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricStatusLoaded, setBiometricStatusLoaded] = useState(false);
  const [isUpdatingBiometrics, setIsUpdatingBiometrics] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const [biometricError, setBiometricError] = useState("");
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearDataMessage, setClearDataMessage] = useState("");
  const [clearDataError, setClearDataError] = useState("");
  const clearDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
      setBiometricSupported(false);
      setBiometricEnabled(false);
      setBiometricStatusLoaded(true);
      return;
    }

    setBiometricStatusLoaded(false);
    let active = true;
    Promise.all([
      checkDeviceBiometricAvailable(),
      isDeviceBiometricEnabled(user.uid).catch(() => false),
    ]).then(([supported, enabled]) => {
      if (!active) return;
      setBiometricSupported(supported);
      setBiometricEnabled(enabled);
      setBiometricStatusLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeEntries = subscribeEntries(user.uid, setEntries);
    const unsubscribeAttendance = subscribeAttendance(user.uid, setAttendance);
    const unsubscribeExams = subscribeExams(user.uid, setExams);
    const unsubscribeProfile = subscribeUserProfile(user.uid, (profile) => {
      setHasSavedProfile(Boolean(profile.displayName || profile.profileDriveUrl || profile.profileImageUrl));
    });
    return () => {
      unsubscribeEntries();
      unsubscribeAttendance();
      unsubscribeExams();
      unsubscribeProfile();
    };
  }, [user]);

  useEffect(() => {
    const dialog = clearDialogRef.current;
    if (!dialog) return;
    if (isClearDialogOpen && !dialog.open) dialog.showModal();
    if (!isClearDialogOpen && dialog.open) dialog.close();
  }, [isClearDialogOpen]);

  const updateBiometricLock = async () => {
    if (!user || isUpdatingBiometrics) return;
    setIsUpdatingBiometrics(true);
    setBiometricError("");
    setBiometricMessage("");
    try {
      if (biometricEnabled) {
        await removeDeviceBiometrics(user.uid);
        setBiometricEnabled(false);
        setBiometricMessage("The device passkey lock and its Firebase PIN fallback were removed.");
      } else {
        await registerDeviceBiometrics(user.uid, user.email ?? "", user.displayName ?? "");
        setBiometricEnabled(true);
        setBiometricMessage("Device passkey unlock is enabled. You can now add a Firebase PIN fallback below.");
      }
    } catch (error) {
      setBiometricError(error instanceof Error ? error.message : "Could not update biometric settings.");
    } finally {
      setIsUpdatingBiometrics(false);
    }
  };

  const clearCloudData = async () => {
    if (!user || isClearingData) return;
    setIsClearingData(true);
    setClearDataError("");
    setClearDataMessage("");
    try {
      await clearUserFirestoreData(user.uid);
      setIsClearDialogOpen(false);
      setClearDataMessage("Your schedule, profile, and device PIN records have been removed from Firebase. Your account is still active.");
    } catch {
      setClearDataError("We couldn’t clear all of your cloud data. Check your connection and try again.");
    } finally {
      setIsClearingData(false);
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-3xl mx-auto">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-extrabold text-white">Settings and preferences</h1>
        <p className="text-xs text-white/70">Manage sync settings, exported files &amp; time formats</p>
      </div>

      {/* Account Info */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Cloud Account &amp; Sync</h3>
        <div className="p-4 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#b7f479] font-bold block">SIGNED IN USER</span>
            <span className="text-sm font-bold text-white">{user?.email || "Student"}</span>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-4 py-2 rounded-full glass-button text-xs text-white"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="px-4 py-2 rounded-full glass-button text-xs text-white"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <section className="glass-panel space-y-4 p-6" aria-labelledby="biometric-settings-title">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-[#b7f479]/25 bg-[#b7f479]/10 p-3 text-[#b7f479]" aria-hidden="true">
            <Fingerprint size={22} />
          </div>
          <div>
            <h2 id="biometric-settings-title" className="text-lg font-bold text-white">Remember this device</h2>
            <p className="mt-1 text-xs leading-5 text-white/70">
              {biometricEnabled
                ? "Your device passkey unlocks your signed-in session after this app is reopened or refreshed."
                : "Enroll a passkey with this device’s fingerprint, face recognition, or screen lock. Your device manages the passkey; this site stores only the lock preference."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={updateBiometricLock}
          disabled={!user || !biometricSupported || isUpdatingBiometrics}
          aria-pressed={biometricEnabled}
          className="rounded-full bg-[#b7f479] px-5 py-3 text-xs font-extrabold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdatingBiometrics
            ? "Updating…"
            : biometricEnabled
              ? "Turn off biometric lock"
              : biometricSupported
                ? "Set up device passkey"
                : "Device passkeys unavailable"}
        </button>
        <p className="text-[11px] leading-5 text-white/50">
          Your device keeps the passkey; this site stores only whether the lock is enabled. Passkeys are scoped to this site&apos;s domain by browser security, and turning off the lock here does not remove the passkey from your device&apos;s passkey manager. This is a convenience lock, not server-verified authentication.
        </p>
        {biometricMessage && <p className="text-sm text-[#d7ffb5]" role="status">{biometricMessage}</p>}
        {biometricError && <p className="text-sm text-red-200" role="alert">{biometricError}</p>}
      </section>

      {user && (
        <DevicePinSettings
          userId={user.uid}
          canConfigure={biometricStatusLoaded && (biometricEnabled || !biometricSupported)}
        />
      )}

      {clearDataMessage && <p className="rounded-xl border border-[#b7f479]/30 bg-[#b7f479]/10 p-4 text-sm text-[#d7ffb5]" role="status">{clearDataMessage}</p>}
      {clearDataError && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">{clearDataError}</p>}

      <section className="glass-panel border border-red-300/20 p-6 space-y-4" aria-labelledby="clear-cloud-data-title">
        <div>
          <h2 id="clear-cloud-data-title" className="text-lg font-bold text-white">Clear cloud data</h2>
          <p className="mt-2 text-xs leading-5 text-white/70">
            {user
              ? "Permanently remove your saved schedule, attendance, exams, profile details, and device PIN records from Firebase. This affects only the signed-in account and does not delete your Firebase sign-in."
              : "Sign in to view your cloud sync status or clear your Firestore data."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setClearDataError("");
            setIsClearDialogOpen(true);
          }}
          disabled={!user || isClearingData}
          className="rounded-full border border-red-300/30 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-100 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear my Firestore data
        </button>
      </section>

      {isClearDialogOpen && (
        <dialog
          ref={clearDialogRef}
          className="w-[calc(100%-2rem)] max-w-md border-0 bg-transparent p-0 backdrop:bg-black/70"
          role="alertdialog"
          aria-labelledby="confirm-clear-title"
          aria-describedby="confirm-clear-description"
          onCancel={(event) => {
            event.preventDefault();
            if (!isClearingData) setIsClearDialogOpen(false);
          }}
        >
          <section className="glass-panel space-y-5 border border-red-300/30 p-6">
            <div>
              <h2 id="confirm-clear-title" className="text-xl font-bold text-white">Delete your cloud data?</h2>
              <p id="confirm-clear-description" className="mt-3 text-sm leading-6 text-white/75">
                This permanently deletes your Firestore schedule, attendance, exams, and saved profile details for {user?.email || "this account"}. Your sign-in remains active. This cannot be undone.
              </p>
            </div>
            {clearDataError && <p className="text-sm text-red-200" role="alert">{clearDataError}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" autoFocus onClick={() => setIsClearDialogOpen(false)} disabled={isClearingData} className="rounded-full border border-white/20 px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">Cancel</button>
              <button type="button" onClick={clearCloudData} disabled={isClearingData} className="rounded-full bg-red-500 px-5 py-3 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">
                {isClearingData ? "Clearing…" : "Delete my cloud data"}
              </button>
            </div>
          </section>
        </dialog>
      )}

      <section className="glass-panel p-6 space-y-4" aria-labelledby="cloud-data-status-title">
        <div>
          <h2 id="cloud-data-status-title" className="text-lg font-bold text-white">Live Firestore data</h2>
          <p className="mt-1 text-xs text-white/65">These counts update automatically as your account syncs across devices.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Schedule", entries.length],
            ["Attendance", Object.keys(attendance).length],
            ["Exams", exams.length],
            ["Profile", hasSavedProfile ? "Saved" : "—"],
          ].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <span className="block text-[10px] uppercase tracking-wider text-white/55">{label}</span>
              <strong className="mt-1 block text-sm text-white">{count}</strong>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#b7f479]">{user ? "Live Firestore listeners are enabled for your account collections." : "Sign in to enable realtime Firestore listeners."}</p>
      </section>

      {/* Calendar Export */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Export Calendar</h3>
        <p className="text-xs text-white/70">
          Download standard .ics iCalendar file to import into Google Calendar or Apple Calendar.
        </p>
        <button
          onClick={() => exportTimetableIcs(entries)}
          className="px-6 py-3 rounded-full bg-[#b7f479] text-black font-extrabold text-xs hover:bg-white transition-colors"
        >
          Export .ics file
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
          className="w-5 h-5 accent-[#b7f479]"
        />
      </div>
    </div>
  );
}
