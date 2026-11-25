"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LockKeyhole } from "lucide-react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authenticateWithDeviceBiometrics, isDeviceBiometricEnabled, removeDeviceBiometrics } from "@/lib/webauthn";

type GateState = "loading" | "open" | "locked";

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>("loading");
  const [lockedUser, setLockedUser] = useState<User | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState("");
  const authCheckId = useRef(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const checkId = ++authCheckId.current;
      setError("");
      setGateState("loading");
      setLockedUser(user);

      if (!user) {
        setGateState("open");
        return;
      }

      isDeviceBiometricEnabled(user.uid)
        .then((enabled) => {
          if (authCheckId.current === checkId) setGateState(enabled ? "locked" : "open");
        })
        .catch(() => {
          if (authCheckId.current === checkId) setGateState("open");
        });
    });
  }, []);

  const unlock = async () => {
    if (!lockedUser || isUnlocking) return;
    setIsUnlocking(true);
    setError("");
    try {
      await authenticateWithDeviceBiometrics(lockedUser.uid);
      setGateState("open");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Biometric verification failed. Try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const forgetDeviceAndSignOut = async () => {
    if (!lockedUser || isUnlocking) return;
    setIsUnlocking(true);
    setError("");
    try {
      await removeDeviceBiometrics(lockedUser.uid);
      await signOut(auth);
      router.replace("/login");
    } catch {
      setError("Could not remove the biometric lock. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (gateState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090c0e] px-6 text-sm text-white/70" aria-live="polite">
        Checking your session…
      </main>
    );
  }

  if (gateState === "locked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090c0e] px-5 py-10">
        <section className="glass-panel w-full max-w-md space-y-6 p-8 text-center" aria-labelledby="biometric-lock-title">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#b7f479]/25 bg-[#b7f479]/10 text-[#b7f479]">
            <LockKeyhole size={25} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 id="biometric-lock-title" className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-white/65">Unlock this device&apos;s passkey with your fingerprint, face, or screen lock.</p>
          </div>
          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
          <button
            type="button"
            onClick={unlock}
            disabled={isUnlocking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b7f479] px-5 py-3 font-bold text-black transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            <Fingerprint size={19} aria-hidden="true" />
            {isUnlocking ? "Verifying…" : "Continue with device passkey"}
          </button>
          <button
            type="button"
            onClick={forgetDeviceAndSignOut}
            disabled={isUnlocking}
            className="text-xs text-white/55 underline decoration-white/25 underline-offset-4 hover:text-white disabled:opacity-50"
          >
            Can&apos;t use the passkey? Turn off this device&apos;s lock and sign out
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
