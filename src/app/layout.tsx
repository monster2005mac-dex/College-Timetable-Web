import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";
import "./profile.css";

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
        <SiteHeader />
        <main className="site-main">{children}</main>
        <footer className="site-footer"><p>© {new Date().getFullYear()} COLLEGE TIMETABLE · MADE FOR THE IN-BETWEEN</p><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer>
      </body>
    </html>
  );
}
