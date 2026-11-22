import { useEffect, useState } from "react";

export function useCurrentTime() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export function formatMinutes(totalMin: number, is24Hour: boolean = false): String {
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (is24Hour) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mins.toString().padStart(2, "0")} ${period}`;
}
