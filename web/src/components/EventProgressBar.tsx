"use client";

import { useEffect, useState } from "react";

interface EventProgressBarProps {
  subject: string;
  eventDate: string;
  startMin: number;
  endMin: number;
}

function localDateKey(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function EventProgressBar({ subject, eventDate, startMin, endMin }: EventProgressBarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const today = localDateKey(now);
  const currentMinute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60_000;
  const duration = endMin - startMin;
  const isUpcomingDate = today < eventDate;
  const isPastDate = today > eventDate;
  const isValidDuration = Number.isFinite(duration) && duration > 0;
  const progress = isUpcomingDate
    ? 0
    : isPastDate || currentMinute >= endMin
      ? 100
      : isValidDuration
        ? Math.max(0, Math.min(100, ((currentMinute - startMin) / duration) * 100))
        : 0;
  const roundedProgress = Math.round(progress);
  const isLive = today === eventDate && isValidDuration && currentMinute >= startMin && currentMinute < endMin;
  const status = !isValidDuration
    ? "TIME UNAVAILABLE"
    : isUpcomingDate
      ? "UPCOMING"
      : isPastDate || currentMinute >= endMin
        ? "COMPLETED"
        : isLive
          ? `IN SESSION · ${roundedProgress}% · ${Math.ceil(endMin - currentMinute)}M LEFT`
          : `STARTS IN ${Math.ceil(Math.max(0, startMin - currentMinute))}M`;

  return (
    <div className={`event-progress ${isLive ? "is-live" : ""}`}>
      <div
        className="event-progress-track"
        role="progressbar"
        aria-label={`${subject} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedProgress}
        aria-valuetext={`${roundedProgress}% complete, ${status.toLowerCase()}`}
      >
        <span className="event-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="event-progress-status" aria-hidden="true">{status}</span>
    </div>
  );
}
