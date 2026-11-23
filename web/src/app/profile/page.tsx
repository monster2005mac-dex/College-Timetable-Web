"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { ArrowLeft, CheckCircle2, ImagePlus, Link2, UserRound } from "lucide-react";
import { auth } from "@/lib/firebase";
import { saveUserProfile, subscribeUserProfile } from "@/lib/firestore";
import { parseDriveImageLink } from "@/lib/profileImage";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) router.replace("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
      setDriveUrl("");
      setSavedImageUrl("");
      return;
    }

    return subscribeUserProfile(user.uid, (profile) => {
      setDriveUrl(profile.profileDriveUrl ?? "");
      setSavedImageUrl(profile.profileImageUrl ?? "");
      setFailedImageUrl("");
    });
  }, [user]);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "S";
  const imageUrl = savedImageUrl && failedImageUrl !== savedImageUrl
    ? savedImageUrl
    : user?.photoURL && failedImageUrl !== user.photoURL
      ? user.photoURL
      : "";

  const saveProfileImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || isSaving) return;
    setError("");
    setMessage("");

    const trimmedUrl = driveUrl.trim();
    const driveImage = trimmedUrl ? parseDriveImageLink(trimmedUrl) : null;
    if (trimmedUrl && !driveImage) {
      setError("Paste a valid https://drive.google.com file link.");
      return;
    }

    setIsSaving(true);
    try {
      await saveUserProfile(user.uid, {
        profileDriveUrl: driveImage?.shareUrl ?? "",
        profileImageUrl: driveImage?.imageUrl ?? "",
      });
      setMessage(driveImage ? "Profile photo saved." : "Profile photo removed.");
    } catch {
      setError("We couldn't save your profile photo. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!authReady || !user) {
    return <div className="loading-state" role="status"><span className="loading-orb" />Loading profile…</div>;
  }

  return (
    <div className="profile-page py-4">
      <Link href="/dashboard" className="profile-back-link"><ArrowLeft size={14} /> Back to schedule</Link>
      <div className="profile-heading">
        <div className="eyebrow"><UserRound size={13} /> YOUR ACCOUNT</div>
        <h1>Make it <span>yours.</span></h1>
        <p>Set the photo that appears in your Campus Orbit header.</p>
      </div>

      <div className="profile-layout">
        <section className="profile-preview-card" aria-label="Profile preview">
          <div className="profile-preview-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div className="profile-preview-avatar">
            {imageUrl ? (
              <img src={imageUrl} alt={`${displayName}'s profile`} referrerPolicy="no-referrer" onError={() => setFailedImageUrl(imageUrl)} />
            ) : (
              <span aria-hidden="true">{avatarInitial}</span>
            )}
          </div>
          <div className="profile-preview-copy">
            <div className="eyebrow">CAMPUS ORBIT PROFILE</div>
            <h2>{displayName}</h2>
            <p>{user.email}</p>
          </div>
          <div className="profile-preview-footer"><span><i /> ACCOUNT ACTIVE</span><span>PROFILE / 01</span></div>
        </section>

        <section className="profile-form-card">
          <div className="profile-form-heading">
            <div className="profile-form-icon"><ImagePlus size={17} /></div>
            <div><h2>Profile photo</h2><p>Use an image shared from Google Drive.</p></div>
          </div>

          {message && <div className="profile-success" role="status"><CheckCircle2 size={15} />{message}</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={saveProfileImage}>
            <label className="profile-field" htmlFor="drive-photo-url">
              Google Drive image link
              <input
                id="drive-photo-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                maxLength={2048}
                placeholder="https://drive.google.com/file/d/..."
                value={driveUrl}
                onChange={(event) => {
                  setDriveUrl(event.target.value);
                  setMessage("");
                  setError("");
                }}
              />
            </label>
            <p className="profile-field-help"><Link2 size={12} /> In Google Drive, set General access to &quot;Anyone with the link&quot; and copy the file link. Anyone with that link can view the image; it is saved only to your profile in Campus Orbit.</p>
            <div className="profile-account"><span>Signed in as</span><strong>{user.email}</strong></div>
            <button type="submit" className="button-primary profile-save-button" disabled={isSaving}>
              {isSaving ? "Saving…" : driveUrl.trim() ? "Save profile photo" : "Remove profile photo"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
