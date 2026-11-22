"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowLeft, ArrowUpRight, Check, ImagePlus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { saveUserProfile, subscribeUserProfile, UserProfile } from "@/lib/firestore";
import { getDriveImageUrl } from "@/lib/profile-photo";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [photoLink, setPhotoLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProfile?.();
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoading(true);
      unsubscribeProfile = subscribeUserProfile(currentUser.uid, (userProfile) => {
        setDisplayName(userProfile?.displayName ?? currentUser.displayName ?? "");
        setPhotoLink(userProfile?.photoLink ?? "");
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, [router]);

  const previewUrl = getDriveImageUrl(photoLink) || user?.photoURL || null;
  const initials = (displayName || user?.email || "P").trim().charAt(0).toUpperCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const normalizedName = displayName.trim();
    if (!normalizedName) {
      setError("Add a name so your profile is easy to recognize.");
      return;
    }
    if (photoLink.trim() && !getDriveImageUrl(photoLink)) {
      setError("Paste a valid Google Drive file link. The link must be shared so anyone with it can view the image.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveUserProfile(user.uid, { displayName: normalizedName, photoLink: photoLink.trim() });
      setSaved(true);
    } catch {
      setError("Your profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state"><span className="loading-orb" />Loading your profile…</div>;
  }

  return (
    <div className="profile-page">
      <a className="profile-back-link" href="/dashboard"><ArrowLeft size={14} /> Back to your schedule</a>
      <section className="profile-heading">
        <div className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, YOUR WAY</div>
        <h1>Your profile<span>.</span></h1>
        <p>Make this space feel like yours. Your photo appears in the top navigation after you save it.</p>
      </section>

      <div className="profile-layout">
        <aside className="profile-preview-card" aria-label="Profile preview">
          <div className="profile-preview-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div className="profile-preview-avatar">
            {previewUrl ? <img src={previewUrl} alt={`${displayName || "Your"} profile preview`} referrerPolicy="no-referrer" /> : <span>{initials || <UserRound size={32} />}</span>}
          </div>
          <div className="profile-preview-copy">
            <span className="eyebrow">STUDENT PROFILE</span>
            <h2>{displayName || "Your name"}</h2>
            <p>{user?.email}</p>
          </div>
          <div className="profile-preview-footer"><span><i /> PERSONAL SPACE</span><span>01 / 01</span></div>
        </aside>

        <form className="profile-form-card" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div className="profile-form-icon"><ImagePlus size={17} /></div>
            <div><h2>Profile details</h2><p>Only you can edit your account profile.</p></div>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {saved && <div className="profile-success" role="status"><Check size={15} /> Profile saved. Your navigation photo is up to date.</div>}

          <label className="profile-field">Display name
            <input value={displayName} onChange={(event) => { setDisplayName(event.target.value); setSaved(false); }} maxLength={60} autoComplete="name" required />
          </label>
          <label className="profile-field">Google Drive photo link
            <input type="url" value={photoLink} onChange={(event) => { setPhotoLink(event.target.value); setSaved(false); }} placeholder="https://drive.google.com/file/d/..." autoComplete="url" />
          </label>
          <p className="profile-field-help">In Drive, set the image to “Anyone with the link can view,” then paste its share link here. You can leave this blank to use your Google account photo.</p>
          <div className="profile-account"><span>Signed in as</span><strong>{user?.email}</strong></div>
          <button className="button-primary profile-save-button" type="submit" disabled={saving}>{saving ? "Saving profile…" : "Save profile"}<ArrowUpRight size={15} /></button>
        </form>
      </div>
    </div>
  );
}
