"use client";

// Log in and sign up share one form: email + password, or Google.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "./UserProvider";
import { explainAuthError, logInWithEmail, logInWithGoogle, resetPassword, signUpWithEmail } from "@/lib/auth";
import { startDemo } from "@/lib/session";

// Only go back to a page inside this site.
const safeNext = (value) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/");

export default function AuthForm({ kind }) {
  const router = useRouter();
  const { mode, currentUser } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState("/");
  const signingUp = kind === "signup";

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  // Already signed in (or just signed in): go on.
  useEffect(() => {
    if (currentUser && mode === "auth") router.replace(next);
  }, [currentUser, mode, next, router]);

  if (mode && mode !== "auth") {
    return (
      <div className="card stack" style={{ maxWidth: 480 }}>
        <h1>{signingUp ? "Sign up" : "Log in"}</h1>
        <p className="muted">
          {mode === "demo"
            ? "You are in the demo. Leave the demo to log in with a real account."
            : "Accounts need Firebase. This copy of the app runs in demo mode (see README)."}
        </p>
      </div>
    );
  }

  async function run(action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(explainAuthError(e));
    }
    setBusy(false);
  }

  function submit(e) {
    e.preventDefault();
    run(() => (signingUp ? signUpWithEmail({ name, email, password }) : logInWithEmail(email, password)));
  }

  function forgot() {
    if (!email.trim()) return setError("Type your email first, then click “Forgot password?”.");
    run(async () => {
      await resetPassword(email);
      setNotice("If an account exists for this email, a reset link is on its way.");
    });
  }

  return (
    <div className="card stack auth-card">
      <div>
        <h1>{signingUp ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {signingUp
            ? "Join a team, build real projects, and get feedback against industry standards."
            : "Log in to continue your projects."}
        </p>
      </div>

      <button type="button" className="btn btn-secondary google" onClick={() => run(logInWithGoogle)} disabled={busy}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
        </svg>
        Continue with Google
      </button>

      <div className="divider">
        <span>or with email</span>
      </div>

      <form onSubmit={submit} className="stack">
        {signingUp && (
          <label className="field">
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={60} />
            <span className="muted small">Only your teammates see it. Mentors see an anonymous name.</span>
          </label>
        )}
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          {signingUp && <span className="muted small">At least 6 characters.</span>}
        </label>
        {error && <p className="error">{error}</p>}
        {notice && <p className="small">{notice}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Please wait…" : signingUp ? "Create account" : "Log in"}
        </button>
      </form>

      <div className="spread small">
        {signingUp ? (
          <span>
            Already have an account? <Link href="/login">Log in</Link>
          </span>
        ) : (
          <>
            <span>
              New here? <Link href="/signup">Create an account</Link>
            </span>
            <button type="button" className="link-button" onClick={forgot} disabled={busy}>
              Forgot password?
            </button>
          </>
        )}
      </div>
      <p className="muted small">
        Just looking?{" "}
        <button type="button" className="link-button" onClick={startDemo}>
          Try the demo
        </button>{" "}
        with sample learners and mentors, no account needed.
      </p>
    </div>
  );
}
