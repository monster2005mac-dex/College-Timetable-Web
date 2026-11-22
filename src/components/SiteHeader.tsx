"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { CalendarDays, CircleHelp, GraduationCap, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { subscribeUserProfile, UserProfile } from "@/lib/firestore";
import { getDriveImageUrl } from "@/lib/profile-photo";

export default function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProfile?.();
      setUser(currentUser);
      setProfile(null);
      if (currentUser) {
        unsubscribeProfile = subscribeUserProfile(currentUser.uid, setProfile);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  const profilePhoto = getDriveImageUrl(profile?.photoLink ?? "") || user?.photoURL || null;
  const initials = (profile?.displayName || user?.displayName || user?.email || "P").trim().charAt(0).toUpperCase();

  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label="College Timetable home">
        <span className={user ? "brand-mark brand-mark-photo" : "brand-mark"}>
          {profilePhoto ? <img src={profilePhoto} alt="" referrerPolicy="no-referrer" /> : user ? <span className="brand-initials">{initials}</span> : <CalendarDays size={16} />}
        </span>
        <span>COLLEGE<span> / </span>TIMETABLE</span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Schedule</a>
        <a href="/attendance" aria-current={pathname === "/attendance" ? "page" : undefined}><GraduationCap size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Attendance</a>
        <a href="/exams" aria-current={pathname === "/exams" ? "page" : undefined}><CircleHelp size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />Exams</a>
        {user ? (
          <a href="/profile" className="profile-nav-link" aria-current={pathname === "/profile" ? "page" : undefined}>
            <span className="profile-nav-avatar">{profilePhoto ? <img src={profilePhoto} alt="" referrerPolicy="no-referrer" /> : initials}</span>
            <span>Profile</span>
          </a>
        ) : (
          <a href="/login" className="nav-cta">Student sign in <span aria-hidden="true">↗</span></a>
        )}
      </nav>
    </header>
  );
}
