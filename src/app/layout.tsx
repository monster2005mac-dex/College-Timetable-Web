import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Timetable Pro — 3D Smart Schedule & Bunk Manager",
  description: "Ultra-aesthetic 3D Glassmorphism college schedule planner with real-time class progress countdowns, bunk tracker, and live sync.",
  openGraph: {
    title: "College Timetable Pro",
    description: "Ultra-aesthetic 3D Glassmorphism college schedule planner.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0b14] text-white flex flex-col justify-between antialiased">
        <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-[#E0B0FF]/20 border border-[#E0B0FF] flex items-center justify-center font-bold text-[#E0B0FF]">
              ⚡
            </div>
            <span className="font-bold text-lg tracking-wide text-white">
              College Timetable <span className="text-[#E0B0FF]">Pro 3D</span>
            </span>
          </a>

          <nav className="flex items-center space-x-6 text-sm font-semibold">
            <a href="/" className="hover:text-[#E0B0FF] transition-colors">
              Home
            </a>
            <a href="/dashboard" className="hover:text-[#E0B0FF] transition-colors">
              Schedule
            </a>
            <a href="/attendance" className="hover:text-[#E0B0FF] transition-colors">
              Attendance
            </a>
            <a href="/exams" className="hover:text-[#E0B0FF] transition-colors">
              Exams
            </a>
            <a href="/login" className="glass-button px-4 py-2 rounded-full text-white">
              Sign In
            </a>
          </nav>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">{children}</main>

        <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/10 text-center text-xs text-white/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} College Timetable Pro. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="/privacy" className="hover:underline">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:underline">
              Terms of Service
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
