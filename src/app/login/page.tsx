"use client";

import { useEffect, useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Fingerprint, GraduationCap, ShieldCheck } from "lucide-react";
import { checkDeviceBiometricAvailable, authenticateWithDeviceBiometrics } from "@/lib/webauthn";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => { checkDeviceBiometricAvailable().then(setHasBiometrics); }, []);

  const handleGoogleSignIn = async () => {
    try { setError(null); await signInWithPopup(auth, googleProvider); router.push("/dashboard"); }
    catch (err: any) { setError(err.message || "Failed to sign in with Google"); }
  };
  const handleDeviceBiometricAuth = async () => {
    try { setError(null); const success = await authenticateWithDeviceBiometrics(email); if (success) router.push("/dashboard"); }
    catch (err: any) { setError(err.message || "Device biometric authentication failed"); }
  };
  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) { setError(err.message || "Authentication failed"); }
  };

  return <div className="auth-layout"><aside className="auth-aside"><div className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, IN ORBIT</div><div className="auth-mark"><GraduationCap size={27} /></div><h1>A calmer place<br />to <span>find your flow.</span></h1><p>Classes, progress, and the plans in between. All in one place that moves with you.</p><div className="auth-orbit" aria-hidden="true"><i /><i /><i /></div><div className="auth-aside-foot"><ShieldCheck size={14} /> YOUR SPACE, SECURE AND IN SYNC</div></aside><section className="auth-card"><div className="auth-card-top"><span className="eyebrow">STUDENT SPACE / 01</span><span className="auth-chip"><i /> PRIVATE SPACE</span></div><h2>{isSignUp ? "A fresh start." : "Welcome back."}</h2><p className="auth-subtitle">{isSignUp ? "Create your space and make this semester yours." : "Sign in to pick up right where your week left off."}</p>{error && <div className="auth-error" role="alert">{error}</div>}<button onClick={handleGoogleSignIn} className="google-button"><span className="google-g">G</span>Continue with Google<ArrowUpRight size={15} /></button>{hasBiometrics && <button onClick={handleDeviceBiometricAuth} className="biometric-button"><Fingerprint size={16} />Continue with biometrics</button>}<div className="auth-divider"><span>OR USE YOUR EMAIL</span></div><form onSubmit={handleEmailAuth} className="auth-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@university.edu" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="At least 6 characters" minLength={6} /></label><button type="submit" className="button-primary auth-submit">{isSignUp ? "Create your account" : "Sign in to your space"}<ArrowUpRight size={15} /></button></form><p className="auth-switch">{isSignUp ? "Already have a space?" : "New around here?"} <button onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? "Sign in" : "Create an account"}</button></p><div className="auth-footnote"><ShieldCheck size={13} /> Your account keeps your schedule synced privately.</div></section></div>;
}
