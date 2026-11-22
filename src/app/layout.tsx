import type { Metadata } from "next";
import { CalendarDays, CircleHelp, GraduationCap, LayoutDashboard } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Timetable — Your campus, in orbit",
  description: "A calmer, clearer way to map your classes, attendance, and exams.",
  openGraph: {
    title: "College Timetable — Your campus, in orbit",
    description: "A calmer, clearer way to map your classes, attendance, and exams.",
    type: "website",
  },
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <header className="site-header">
          <a href="/" className="brand" aria-label="College Timetable home"><span className="brand-mark"><CalendarDays size={16} /></span><span>COLLEGE<span> / </span>TIMETABLE</span></a>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="/dashboard"><LayoutDashboard size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Schedule</a>
            <a href="/attendance"><GraduationCap size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Attendance</a>
            <a href="/exams"><CircleHelp size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Exams</a>
            <a href="/login" className="nav-cta">Student sign in <span aria-hidden="true">↗</span></a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer"><p>© {new Date().getFullYear()} COLLEGE TIMETABLE · MADE FOR THE IN-BETWEEN</p><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer>
      </body>
    </html>
  );
}
