interface EventProgressBarProps {
  subject: string;
  eventDate: string;
  startMin: number;
  endMin: number;
  now: Date;
}

function localDateKey(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function EventProgressBar({ subject, eventDate, startMin, endMin, now }: EventProgressBarProps) {
  const today = localDateKey(now);
  const currentMinute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60_000;
  const duration = Math.max(0, endMin - startMin);
  const progress = today < eventDate
    ? 0
    : today > eventDate || (duration === 0 && currentMinute >= endMin)
      ? 100
      : duration === 0
        ? 0
        : Math.max(0, Math.min(100, ((currentMinute - startMin) / duration) * 100));
  const roundedProgress = Math.round(progress);
  const isLive = today === eventDate && currentMinute >= startMin && currentMinute < endMin;
  const status = today < eventDate
    ? "UPCOMING"
    : today > eventDate || currentMinute >= endMin
      ? "COMPLETED"
      : isLive
        ? `IN SESSION · ${roundedProgress}%`
        : `STARTS IN ${Math.ceil(startMin - currentMinute)}M`;

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
