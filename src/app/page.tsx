import ThreeCanvas from "@/components/ThreeCanvas";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleCheck, Sparkles } from "lucide-react";

const features = [
  { icon: CalendarDays, number: "01", title: "A week that works", text: "See every lecture and study block in one clear, considered view.", color: "#b7f479" },
  { icon: CircleCheck, number: "02", title: "Attendance, honestly", text: "Know where you stand, and make confident decisions about what comes next.", color: "#90dbff" },
  { icon: Sparkles, number: "03", title: "Deadlines in view", text: "Keep the important dates close. Make a plan before the pressure arrives.", color: "#ffbd88" },
];

export default function HomePage() {
  return <div className="landing-shell">
    <section className="landing-hero">
      <div className="landing-copy"><div className="eyebrow"><span className="live-dot" /> A LITTLE MORE ROOM TO THINK</div><h1>Find your flow.<br /><span>Keep your week.</span></h1><p>One thoughtful place for your classes, attendance, and everything you&apos;re working toward.</p><div className="landing-actions"><a href="/dashboard" className="button-primary">Open your schedule <ArrowUpRight size={16} /></a><a href="https://collegetimetable.vercel.app" className="landing-secondary">Explore the Android app <ArrowDownRight size={15} /></a></div><div className="landing-proof"><span><i /> Built around your week</span><span>Web + Android, in sync</span></div></div>
      <div className="landing-art"><div className="landing-art-frame"><ThreeCanvas /><div className="canvas-caption"><span>01 / YOUR WEEK, IN MOTION</span><span>MOVE TO EXPLORE ↗</span></div></div><div className="art-side-note">A clearer<br />kind of focus.</div><div className="landing-index">CT—01</div></div>
      <div className="landing-bottom"><span>THE SPACE BETWEEN THE CLASSROOMS</span><span>SCROLL TO FIND YOUR FLOW <i>↓</i></span></div>
    </section>
    <section className="landing-features"><div className="feature-intro"><div className="eyebrow">A SMALLER THING, DONE WELL</div><h2>Your semester,<br />with a little less noise.</h2><p>The everyday details deserve a better place to land.</p></div><div className="feature-list">{features.map(({ icon: Icon, number, title, text, color }) => <article className="feature-row" key={number} style={{ "--feature-color": color } as React.CSSProperties}><span className="feature-number">{number}</span><div className="feature-icon"><Icon size={17} /></div><div className="feature-copy"><h3>{title}</h3><p>{text}</p></div><ArrowUpRight className="feature-arrow" size={16} /></article>)}</div></section>
    <section className="landing-cta"><div className="eyebrow">YOUR NEXT WEEK STARTS HERE</div><h2>Make the week<br /><span>feel like yours.</span></h2><a href="/dashboard" className="button-primary">Get started <ArrowUpRight size={16} /></a><div className="cta-orbit" aria-hidden="true"><i /><i /><i /></div></section>
  </div>;
}
