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
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { subscribeUserProfile } from "@/lib/firestore";

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
  const router = useRouter();

  const navigateWithDate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const date = new URLSearchParams(window.location.search).get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    event.preventDefault();
    router.push(`${href}?date=${date}`);
  };
  const [user, setUser] = useState<User | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [failedImageUrl, setFailedImageUrl] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setProfileDisplayName("");
      setProfileImageUrl("");
      setFailedImageUrl("");
      return;
    }
    return subscribeUserProfile(user.uid, (profile) => {
      setProfileDisplayName(profile.displayName ?? "");
      setProfileImageUrl(profile.profileImageUrl ?? "");
      setFailedImageUrl("");
    });
  }, [user]);

  const avatarImageUrl = profileImageUrl && failedImageUrl !== profileImageUrl
    ? profileImageUrl
    : user?.photoURL && failedImageUrl !== user.photoURL
      ? user.photoURL
      : "";
  const displayName = profileDisplayName || user?.displayName || user?.email?.split("@")[0] || "Student";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "S";

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
            <Link key={href} href={href} onClick={(event) => navigateWithDate(event, href)} className="nav-link" aria-current={isActive ? "page" : undefined}>
              <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="header-actions">
        {user ? (
          <Link
            href="/profile"
            onClick={(event) => navigateWithDate(event, "/profile")}
            className="profile-nav-link"
            aria-label={`Open ${displayName} profile`}
            title="Profile"
          >
            <span className="profile-nav-avatar" aria-hidden="true">
              {avatarImageUrl ? (
                <img src={avatarImageUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedImageUrl(avatarImageUrl)} />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </span>
          </Link>
        ) : (
          <Link href="/login" onClick={(event) => navigateWithDate(event, "/login")} className="nav-cta">
            Student sign in <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
    </header>
  );
}
