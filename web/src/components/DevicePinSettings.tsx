"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { KeyRound, LoaderCircle } from "lucide-react";
import { hasDevicePin, removeDevicePin, setDevicePin, verifyDevicePin } from "@/lib/webauthn";
import DevicePinInput from "@/components/DevicePinInput";

type DevicePinSettingsProps = {
  userId: string | null;
  canConfigure: boolean;
};

function getPinErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "functions/not-found") {
    return "Firebase PIN Functions are not deployed yet. Deploy the configured Firebase Functions to enable this feature.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function DevicePinSettings({ userId, canConfigure }: DevicePinSettingsProps) {
  const { data: hasPin, error: statusError, isLoading, mutate } = useSWR(
    userId ? ["device-pin-status", userId] : null,
    () => hasDevicePin(userId!),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const savePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || isSaving || !canConfigure) return;
    setError("");
    setMessage("");

    if (newPin !== confirmPin) {
      setError("The PINs do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await setDevicePin(userId, newPin, hasPin ? currentPin : undefined);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await mutate(true, false);
      setMessage(hasPin ? "Your device PIN has been updated." : "Your device PIN is set.");
    } catch (pinError) {
      setError(getPinErrorMessage(pinError, "Could not save the device PIN."));
    } finally {
      setIsSaving(false);
    }
  };

  const forgetPin = async () => {
    if (!userId || isSaving || !hasPin) return;
    setError("");
    setMessage("");
    if (currentPin.length !== 6) {
      setError("Enter the current PIN to remove it.");
      return;
    }
    setIsSaving(true);
    try {
      await verifyDevicePin(userId, currentPin);
      await removeDevicePin(userId);
      setCurrentPin("");
      await mutate(false, false);
      setMessage("The PIN for this device has been removed from Firebase.");
    } catch (pinError) {
      setError(getPinErrorMessage(pinError, "Could not remove the device PIN."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="glass-panel space-y-4 p-6" aria-labelledby="device-pin-title">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-[#b7f479]/25 bg-[#b7f479]/10 p-3 text-[#b7f479]" aria-hidden="true">
          <KeyRound size={22} />
        </div>
        <div>
          <h2 id="device-pin-title" className="text-lg font-bold text-white">Device PIN fallback</h2>
          <p className="mt-1 text-xs leading-5 text-white/70">
            {hasPin
              ? "Change or remove the PIN saved for this browser profile."
              : "Add a 6-digit fallback for this browser profile. When biometrics are available, set up the device passkey above first."}
          </p>
        </div>
      </div>

      {!canConfigure && (
        <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60" role="status">
          Set up the device passkey above before adding a PIN fallback.
        </p>
      )}
      {isLoading && <p className="text-xs text-white/55" role="status">Checking this device&apos;s PIN status…</p>}
      {statusError && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
          {getPinErrorMessage(statusError, "Could not load this device's PIN from Firebase Functions. Check the deployment and connection.")}
        </p>
      )}

      {!isLoading && !statusError && hasPin !== undefined && (
        <form className="space-y-4" onSubmit={savePin} autoComplete="off">
          {hasPin && (
            <DevicePinInput
              id="current-device-pin"
              label="Current PIN"
              value={currentPin}
              onChange={setCurrentPin}
              disabled={isSaving || !canConfigure}
            />
          )}
          <DevicePinInput
            id="new-device-pin"
            label={hasPin ? "New PIN" : "Choose a PIN"}
            value={newPin}
            onChange={setNewPin}
            disabled={isSaving || !canConfigure}
          />
          <DevicePinInput
            id="confirm-device-pin"
            label="Confirm PIN"
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={isSaving || !canConfigure}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!userId || !canConfigure || isSaving || isLoading || Boolean(statusError)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#b7f479] px-5 py-3 text-xs font-extrabold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
              {isSaving ? "Saving…" : hasPin ? "Update device PIN" : "Save device PIN"}
            </button>
            {hasPin && (
              <button
                type="button"
                onClick={forgetPin}
                disabled={isSaving || !canConfigure}
                className="min-h-11 rounded-full border border-white/15 px-5 py-3 text-xs font-semibold text-white/75 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove PIN from Firebase
              </button>
            )}
          </div>
        </form>
      )}

      <p className="text-[11px] leading-5 text-white/50">
        The PIN is private to this signed-in account and this browser profile. Firebase stores only its salted hash and attempt lockout under your account; other accounts on this browser have separate PINs. The PIN itself is never saved in browser storage.
      </p>
      {message && <p className="text-sm text-[#d7ffb5]" role="status">{message}</p>}
      {error && <p className="text-sm text-red-200" role="alert">{error}</p>}
    </section>
  );
}
