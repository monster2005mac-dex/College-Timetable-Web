export default function PrivacyPage() {
  return (
    <div className="glass-panel p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
      <p className="text-sm text-white/70">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3 text-sm text-white/80">
        <h2 className="text-[#b7f479] font-bold text-lg">1. Data Storage &amp; Encryption</h2>
        <p>
          Campus Orbit Web respects your privacy. Your schedule data, attendance records, and exam deadlines are stored securely in Cloud Firestore under strict per-user security rules (`request.auth.uid == userId`).
        </p>
      </section>

      <section className="space-y-3 text-sm text-white/80">
        <h2 className="text-[#b7f479] font-bold text-lg">2. Authentication</h2>
        <p>
          We use Firebase Authentication (Google Sign-In &amp; Email/Password) to authenticate users across Android &amp; Web. We do not sell or share your personal information.
        </p>
      </section>
    </div>
  );
}
