import ThreeCanvas from "@/components/ThreeCanvas";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 space-y-12">
      {/* 3D Interactive WebGL Canvas */}
      <div className="w-full max-w-4xl mx-auto relative rounded-3xl overflow-hidden glass-panel p-2">
        <ThreeCanvas />
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className="text-xs font-bold text-[#E0B0FF] bg-black/60 px-4 py-1.5 rounded-full border border-[#E0B0FF]/40 backdrop-blur-md">
            MOVE MOUSE / DRAG TO ROTATE 3D STRUCTURAL TIMETABLE 🧊
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-3xl space-y-6">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-extrabold bg-[#E0B0FF]/20 border border-[#E0B0FF] text-[#E0B0FF]">
          GEN Z 3D STRUCTURAL TIMETABLE ⚡
        </span>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Never Miss a Class. <br />
          <span className="text-[#E0B0FF]">Track Bunks &amp; Deadlines in 3D.</span>
        </h1>

        <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto">
          Synchronize your college timetable across Android &amp; Web with real-time class progress tickers, intelligent bunk manager, exam countdowns, and instant cloud sync.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a
            href="/dashboard"
            className="px-8 py-3.5 rounded-full bg-[#E0B0FF] text-black font-extrabold hover:bg-white transition-all shadow-lg shadow-[#E0B0FF]/20"
          >
            Open Web Dashboard 🚀
          </a>
          <a
            href="https://collegetimetable.vercel.app"
            className="px-8 py-3.5 rounded-full glass-button text-white font-bold"
          >
            Download Android App 📱
          </a>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-4">
        <div className="glass-panel p-8 text-left space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E0B0FF]/20 border border-[#E0B0FF] flex items-center justify-center text-2xl">
            ⚡
          </div>
          <h3 className="text-xl font-bold text-white">Live Session Tickers</h3>
          <p className="text-sm text-white/70">
            Real-time 1-second tickers with live progress bars, remaining minutes, and next lecture countdowns.
          </p>
        </div>

        <div className="glass-panel p-8 text-left space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-400 flex items-center justify-center text-2xl">
            🎓
          </div>
          <h3 className="text-xl font-bold text-white">Bunk &amp; Attendance Manager</h3>
          <p className="text-sm text-white/70">
            Smart attendance tracking calculating exactly how many classes you can safely skip or need to attend.
          </p>
        </div>

        <div className="glass-panel p-8 text-left space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl">
            📝
          </div>
          <h3 className="text-xl font-bold text-white">Exams &amp; Assignment Tracker</h3>
          <p className="text-sm text-white/70">
            Priority-sorted countdown manager for midterms, assignments, and finals with automated reminders.
          </p>
        </div>
      </div>
    </div>
  );
}
