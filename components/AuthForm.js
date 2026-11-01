"use client";

// Log in and sign up share one form: email + password, or Google.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "./UserProvider";
import { adElementIsHidden } from "@/lib/adblock";
import {
  explainAuthError,
  explainGoogleError,
  googleSignInProblem,
  logInWithEmail,
  prepareGoogleSignIn,
  logInWithGoogle,
  resetPassword,
  signUpWithEmail,
} from "@/lib/auth";
import { startDemo } from "@/lib/session";
import { useT } from "./LocaleProvider";

// Only go back to a page inside this site.
const safeNext = (value) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/");

export default function AuthForm({ kind }) {
  const t = useT();
  const router = useRouter();
  const { mode, currentUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState("/");
  const [googleProblem, setGoogleProblem] = useState("");
  const [adBlocker, setAdBlocker] = useState(false);
  const [googleError, setGoogleError] = useState(""); // shown under the Google button
  const signingUp = kind === "signup";

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
    const problem = googleSignInProblem(t);
    setGoogleProblem(problem);
    if (!problem && mode === "auth") {
      prepareGoogleSignIn();
      // Warn before the click if an ad blocker is hiding ad-like elements on this page.
      adElementIsHidden().then(setAdBlocker);
    }
  }, [mode, t]);

  // Already signed in (or just signed in): go on.
  useEffect(() => {
    if (currentUser && mode === "auth") router.replace(next);
  }, [currentUser, mode, next, router]);

  if (mode && mode !== "auth") {
    return (
      <div className="card stack" style={{ maxWidth: 480 }}>
        <h1>{signingUp ? t("Sign up") : t("Log in")}</h1>
        <p className="muted">
          {mode === "demo"
            ? t("You are in the demo. Leave the demo to log in with a real account.")
            : t("Accounts need Firebase. This copy of the app runs in demo mode (see README).")}
        </p>
      </div>
    );
  }

  async function run(action, { google = false } = {}) {
    const startedAt = Date.now();
    setBusy(true);
    setError("");
    setGoogleError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (google) setGoogleError(await explainGoogleError(e, startedAt, t));
      else setError(explainAuthError(e, t));
    }
    setBusy(false);
  }

  function submit(e) {
    e.preventDefault();
    run(() => (signingUp ? signUpWithEmail({ email, password }) : logInWithEmail(email, password)));
  }

  function forgot() {
    if (!email.trim()) return setError(t("Type your email first, then click “Forgot password?”."));
    run(async () => {
      await resetPassword(email);
      setNotice(t("If an account exists for this email, a reset link is on its way."));
    });
  }

  return (
    <div className="card stack auth-card">
      <div>
        <h1>{signingUp ? t("Create your account") : t("Welcome back")}</h1>
        <p className="muted">
          {signingUp
            ? t(
                "Join a team, build real projects, and get feedback against industry standards. Next, you add a few basic details."
              )
            : t("Log in to continue your projects.")}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-secondary google"
        onClick={() => run(logInWithGoogle, { google: true })}
        disabled={busy || Boolean(googleProblem)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
        </svg>
        {t("Continue with Google")}
      </button>
      {googleProblem && <p className="error small">{googleProblem}</p>}
      {googleError && (
        <p className="error small" role="alert">
          {googleError}
        </p>
      )}
      {!googleProblem && !googleError && adBlocker && (
        <p className="notice small" role="status">
          {t("An ad blocker seems to be on. If the Google window does not open, pause it for this site and reload.")}
        </p>
      )}

      <div className="divider">
        <span>{t("or with email")}</span>
      </div>

      <form onSubmit={submit} className="stack">
        <label className="field">
          {t("Email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          {t("Password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          {signingUp && <span className="muted small">{t("At least 6 characters.")}</span>}
        </label>
        {error && <p className="error">{error}</p>}
        {notice && <p className="small">{notice}</p>}
        <button className="btn" disabled={busy}>
          {busy ? t("Please wait…") : signingUp ? t("Create account") : t("Log in")}
        </button>
      </form>

      {signingUp && (
        <p className="muted small">
          {t("By creating an account you agree to the")} <Link href="/privacy">{t("privacy policy and terms")}</Link>
          {t(".")}
        </p>
      )}
      <div className="spread small">
        {signingUp ? (
          <span>
            {t("Already have an account?")} <Link href="/login">{t("Log in")}</Link>
          </span>
        ) : (
          <>
            <span>
              {t("New here?")} <Link href="/signup">{t("Create an account")}</Link>
            </span>
            <button type="button" className="link-button" onClick={forgot} disabled={busy}>
              {t("Forgot password?")}
            </button>
          </>
        )}
      </div>
      <p className="muted small">
        {t("Just looking?")}{" "}
        <button type="button" className="link-button" onClick={startDemo}>
          {t("Try the demo")}
        </button>{" "}
        {t("with sample learners and mentors, no account needed.")}
      </p>
    </div>
  );
}
