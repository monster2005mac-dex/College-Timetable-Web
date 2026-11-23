"use client";

import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="glass-panel p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-xs text-white/70">
            Sign in to sync your schedule across Web &amp; Android
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold flex items-center justify-center space-x-3 hover:bg-gray-100 transition-colors text-sm"
          >
            <span>Sign in with Google</span>
          </button>

        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-white/20 w-full" />
          <span className="bg-[#090c0e] px-3 text-xs text-white/50 absolute">OR</span>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-white/80 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#b7f479]"
              placeholder="student@university.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-white/80 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#b7f479]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#b7f479] text-black font-extrabold text-sm hover:bg-white transition-colors"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[#b7f479] hover:underline"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
