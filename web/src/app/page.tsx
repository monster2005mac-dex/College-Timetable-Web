import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleHelp, GraduationCap } from "lucide-react";
import ThreeCanvas from "@/components/ThreeCanvas";

const features = [
  {
    icon: CalendarDays,
    title: "A week that makes sense",
    description: "Move between your day, week, and month without losing the shape of your schedule.",
  },
  {
    icon: GraduationCap,
    title: "Attendance, without guesswork",
    description: "Track each subject and see when you are comfortably above your attendance target.",
  },
  {
    icon: CircleHelp,
    title: "Deadlines kept in view",
    description: "Keep exams and assignments close, then take your timetable with you as a calendar file.",
  },
];

export default function HomePage() {
  return (
    <div className="landing-shell">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <div className="eyebrow"><span className="live-dot" /> A LITTLE MORE ROOM TO THINK</div>
          <h1 id="landing-title">Find your flow.<br /><span>Keep your week.</span></h1>
          <p>One thoughtful place for your classes, attendance, and everything you&apos;re working toward.</p>
          <div className="landing-actions">
            <Link href="/dashboard" className="button-primary">Open your schedule <ArrowUpRight size={16} /></Link>
            <a href="https://collegetimetable.vercel.app" className="landing-secondary">College Timetable Pro for Android <ArrowDownRight size={15} /></a>
          </div>
          <div className="landing-proof"><span><i /> Built around your week</span><span>Web edition + Android app, in sync</span></div>
        </div>

        <div className="landing-art" role="img" aria-label="Orbit illustration representing a student timetable">
          <div className="landing-art-frame">
            <ThreeCanvas />
            <div className="canvas-caption"><span>01 / YOUR WEEK, IN MOTION</span><span>MOVE TO EXPLORE ↗</span></div>
          </div>
          <div className="art-side-note">A clearer<br />kind of focus.</div>
          <div className="landing-index">CT—01</div>
        </div>
        <div className="landing-bottom"><span>THE SPACE BETWEEN THE CLASSROOMS</span><span>SCROLL TO FIND YOUR FLOW <i>↓</i></span></div>
      </section>

      <section className="feature-grid" aria-label="Campus Orbit features">
        {features.map(({ icon: Icon, title, description }) => (
          <article className="glass-panel feature-card" key={title}>
            <div className="feature-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></div>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
