"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Clock3, MapPin } from "lucide-react";

export default function ThreeCanvas() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({ x: (event.clientY - bounds.top - bounds.height / 2) / bounds.height, y: (event.clientX - bounds.left - bounds.width / 2) / bounds.width });
  };

  return (
    <div className="scene-3d" onPointerMove={onPointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} style={{ "--tilt-x": `${tilt.x * -7}deg`, "--tilt-y": `${tilt.y * 9}deg` } as React.CSSProperties} role="img" aria-label="Three-dimensional model of a weekly class schedule">
      <div className="scene-grid" />
      <div className="scene-halo" />
      <div className="scene-orbit scene-orbit-a" /><div className="scene-orbit scene-orbit-b" />
      <div className="scene-card-shadow" />
      <div className="scene-week-card">
        <div className="scene-card-top"><span><i /> YOUR WEEK AT A GLANCE</span><CalendarDays size={14} /></div>
        <div className="scene-date">MONDAY <strong>09</strong> <small>NOVEMBER</small></div>
        <div className="scene-class scene-class-lime"><span>09:00 — 10:30</span><strong>Design systems</strong><small><MapPin size={10} /> STUDIO 204</small></div>
        <div className="scene-class scene-class-blue"><span>11:00 — 12:00</span><strong>Human-computer interaction</strong><small><MapPin size={10} /> NORTH HALL</small></div>
        <div className="scene-class scene-class-peach"><span>14:15 — 15:30</span><strong>Project workshop</strong><small><MapPin size={10} /> MAKER SPACE</small></div>
        <div className="scene-card-foot"><span><Clock3 size={11} /> NEXT UP IN 24 MIN</span><BookOpen size={12} /></div>
      </div>
      <div className="scene-float scene-float-one"><span>WEEKLY FLOW</span><strong>06</strong><small>SESSIONS</small></div>
      <div className="scene-float scene-float-two"><span className="scene-check">✓</span><div><strong>All in sync</strong><small>across your devices</small></div></div>
      <div className="scene-depth-label">A WEEK, SPATIALLY CONSIDERED</div>
    </div>
  );
}
