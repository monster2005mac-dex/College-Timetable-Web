import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Orbit Web — Your campus, in orbit",
  description: "A calmer, clearer way to map your classes, attendance, deadlines, and study week.",
  openGraph: {
    title: "Campus Orbit Web — Your campus, in orbit",
    description: "A thoughtful home for your classes, attendance, and everything you’re working toward.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090c0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} CAMPUS ORBIT WEB · MADE FOR THE IN-BETWEEN</p>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
