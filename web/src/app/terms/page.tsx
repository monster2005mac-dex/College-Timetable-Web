export default function TermsPage() {
  return (
    <div className="glass-panel p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-white">Terms of Service</h1>
      <p className="text-sm text-white/70">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3 text-sm text-white/80">
        <h2 className="text-[#b7f479] font-bold text-lg">1. Usage Agreement</h2>
        <p>
          By accessing Campus Orbit Web or its companion Android app, College Timetable Pro, you agree to these terms. Campus Orbit Web is provided as a student productivity tool.
        </p>
      </section>
    </div>
  );
}
