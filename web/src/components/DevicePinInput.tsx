"use client";

type DevicePinInputProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export default function DevicePinInput({
  id,
  label,
  value,
  disabled = false,
  onChange,
}: DevicePinInputProps) {
  return (
    <div className="space-y-2 text-left">
      <label htmlFor={id} className="block text-xs font-semibold text-white/75">{label}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={disabled}
        required
        aria-describedby={`${id}-hint`}
        className="w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition focus:border-[#b7f479]/60 focus:ring-2 focus:ring-[#b7f479]/20 disabled:opacity-50"
      />
      <p id={`${id}-hint`} className="text-[11px] text-white/45">Enter 6 digits. Your PIN is never shown as text.</p>
    </div>
  );
}
