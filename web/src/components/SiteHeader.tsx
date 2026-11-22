"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  CalendarDays,
  CalendarRange,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";

const navigation = [
  { href: "/dashboard", label: "Day", icon: LayoutDashboard },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/calendar", label: "Month", icon: CalendarDays },
  { href: "/attendance", label: "Attendance", icon: GraduationCap },
  { href: "/exams", label: "Exams", icon: CircleHelp },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Campus Orbit Web home">
        <span className="brand-mark brand-logo-mark" aria-hidden="true">
          <span className="brand-orbit"><i /></span>
          <GraduationCap size={17} strokeWidth={1.9} />
        </span>
        <span className="brand-name">CAMPUS<span> / </span>ORBIT</span>
        <span className="brand-platform">WEB</span>
      </Link>

      <nav className="site-nav" aria-label="Main navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} className="nav-link" aria-current={isActive ? "page" : undefined}>
              <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="header-actions">
        <Link href={user ? "/dashboard" : "/login"} className="nav-cta">
          {user ? "Open schedule" : "Student sign in"} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}
