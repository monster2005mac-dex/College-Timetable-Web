"use client";

import { FormEvent, useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Fingerprint, LockKeyhole } from "lucide-react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import DevicePinInput from "@/components/DevicePinInput";
import {
  authenticateWithDeviceBiometrics,
  hasDevicePin,
  isDeviceBiometricEnabled,
  removeDeviceBiometrics,
  verifyDevicePin,
} from "@/lib/webauthn";

type DeviceLockStatus = {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  pinCheckFailed: boolean;
};

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isPinEntryOpen, setIsPinEntryOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthReady(true);
    setSessionUnlocked(!currentUser);
    setIsPinEntryOpen(false);
    setPin("");
    setError("");
  }), []);

  const { data: lockStatus, isLoading: isCheckingLock, mutate: refreshLockStatus } = useSWR<DeviceLockStatus>(
    authReady && user ? ["device-lock-status", user.uid] : null,
    async () => {
      const biometricEnabled = await isDeviceBiometricEnabled(user!.uid).catch(() => false);
      try {
        const pinEnabled = await hasDevicePin(user!.uid);
        return { biometricEnabled, pinEnabled, pinCheckFailed: false };
      } catch {
        return { biometricEnabled, pinEnabled: false, pinCheckFailed: true };
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const unlockWithBiometrics = async () => {
    if (!user || isUnlocking) return;
    setIsUnlocking(true);
    setError("");
    try {
      await authenticateWithDeviceBiometrics(user.uid);
      setSessionUnlocked(true);
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Device verification failed. Try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const unlockWithPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || isUnlocking) return;
    setIsUnlocking(true);
    setError("");
    try {
      await verifyDevicePin(user.uid, pin);
      setPin("");
      setSessionUnlocked(true);
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : "The PIN could not be verified. Try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const forgetDeviceAndSignOut = async () => {
    if (!user || isUnlocking) return;
    setIsUnlocking(true);
    setError("");
    try {
      await removeDeviceBiometrics(user.uid);
      await signOut(auth);
      router.replace("/login");
    } catch {
      setError("Could not remove this device's lock from Firebase. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const isLocked = Boolean(user && !sessionUnlocked && (lockStatus?.biometricEnabled || lockStatus?.pinEnabled || lockStatus?.pinCheckFailed));

  if (!authReady || (user && isCheckingLock && !lockStatus)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090c0e] px-6 text-sm text-white/70" aria-live="polite">
        Checking your session…
      </main>
    );
  }

  if (isLocked && lockStatus) {
    const pinOnly = !lockStatus.biometricEnabled;
    const showPinForm = pinOnly || isPinEntryOpen;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090c0e] px-5 py-10">
        <section className="glass-panel w-full max-w-md space-y-6 p-8 text-center" aria-labelledby="device-lock-title">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#b7f479]/25 bg-[#b7f479]/10 text-[#b7f479]">
            <LockKeyhole size={25} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 id="device-lock-title" className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-white/65">
              {pinOnly ? "Enter this browser profile’s PIN to continue." : "Unlock this device with your passkey or its PIN fallback."}
            </p>
          </div>
          {lockStatus.pinCheckFailed && (
            <div className="space-y-2 rounded-xl border border-amber-300/25 bg-amber-400/10 p-3 text-left text-xs text-amber-100" role="alert">
              <p>Firebase couldn&apos;t check this device&apos;s PIN. The lock stays on until the PIN service is reachable.</p>
              <button type="button" onClick={() => refreshLockStatus()} className="font-semibold underline underline-offset-4">Retry PIN connection</button>
            </div>
          )}
          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">{error}</p>}

          {!showPinForm && lockStatus.biometricEnabled && (
            <button
              type="button"
              onClick={unlockWithBiometrics}
              disabled={isUnlocking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b7f479] px-5 py-3 font-bold text-black transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
            >
              <Fingerprint size={19} aria-hidden="true" />
              {isUnlocking ? "Verifying…" : "Continue with device passkey"}
            </button>
          )}

          {showPinForm && (
            <form className="space-y-4 text-left" onSubmit={unlockWithPin} autoComplete="off">
              <DevicePinInput
                id="unlock-device-pin"
                label="Device PIN"
                value={pin}
                onChange={setPin}
                disabled={isUnlocking}
              />
              <button
                type="submit"
                disabled={pin.length !== 6 || isUnlocking}
                className="w-full rounded-xl bg-[#b7f479] px-5 py-3 font-bold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUnlocking ? "Checking…" : "Unlock with PIN"}
              </button>
              {!pinOnly && (
                <button
                  type="button"
                  onClick={() => { setIsPinEntryOpen(false); setPin(""); setError(""); }}
                  className="w-full text-xs text-white/55 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  Use device passkey instead
                </button>
              )}
            </form>
          )}

          {lockStatus.biometricEnabled && lockStatus.pinEnabled && !showPinForm && (
            <button
              type="button"
              onClick={() => { setIsPinEntryOpen(true); setError(""); }}
              disabled={isUnlocking}
              className="w-full text-sm font-medium text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white"
            >
              Use device PIN instead
            </button>
          )}

          <button
            type="button"
            onClick={forgetDeviceAndSignOut}
            disabled={isUnlocking}
            className="text-xs text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white disabled:opacity-50"
          >
            Can&apos;t unlock? Remove this device&apos;s lock and sign out
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
