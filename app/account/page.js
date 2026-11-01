"use client";

// Your account: basic details, how you log in, and the application to become a mentor.
import { useEffect, useState } from "react";
import PhotoPicker from "@/components/PhotoPicker";
import ProfileForm from "@/components/ProfileForm";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import {
  addPassword,
  connectGoogle,
  disconnectGoogle,
  explainAuthError,
  explainGoogleError,
  googleSignInProblem,
  prepareGoogleSignIn,
  resendVerification,
} from "@/lib/auth";
import Link from "next/link";
import { currentAuthUser } from "@/lib/auth";
import { requestMentorRole } from "@/lib/db";
import { collectMyData, downloadJson } from "@/lib/exportData";

function MentorApplication({ user, onSaved }) {
  const toast = useToast();
  const request = user.mentorRequest;
  const [name, setName] = useState(request?.name || user.name || "");
  const [company, setCompany] = useState(request?.company || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (user.role === "mentor") {
    return <p>You are a mentor{user.company ? ` at ${user.company}` : ""}. Create projects from the New project page.</p>;
  }
  if (request && !request.declinedAt) {
    return (
      <p>
        Your application to mentor as <strong>{request.name}</strong> ({request.company}) is waiting for approval.
      </p>
    );
  }

  async function apply(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestMentorRole(user.id, { name, company, note });
      await onSaved();
      toast("Application sent. An admin will review it.");
    } catch (err) {
      toast(err.message || "Could not send the application", "error");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={apply} className="stack">
      {request?.declinedAt && <p className="error">Your last application was not approved. You can apply again.</p>}
      <p className="muted small">
        Mentors write projects and give final feedback. An admin checks every application, because mentors see
        learners&apos; work. Learners will see the name and company below.
      </p>
      <div className="form-row">
        <label className="field">
          Public name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </label>
        <label className="field">
          Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={80} />
        </label>
      </div>
      <label className="field">
        Your role and experience (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} style={{ minHeight: 70 }} />
      </label>
      <div>
        <button className="btn btn-secondary" disabled={busy || !name.trim() || !company.trim()}>
          {busy ? "Sending…" : "Apply to be a mentor"}
        </button>
      </div>
    </form>
  );
}

// How this account can log in: email + password and/or Google. Linking both lets an account
// created with email also log in with Google later (and the other way round).
function SignInMethods() {
  const toast = useToast();
  const { authInfo, refreshAuthInfo } = useUser();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const providers = authInfo?.providers || [];
  const hasPassword = providers.includes("password");
  const hasGoogle = providers.includes("google.com");
  const googleProblem = typeof window === "undefined" ? "" : googleSignInProblem();

  // Get the Google window ready, so "Connect Google" is not blocked as a pop-up.
  useEffect(() => {
    if (!hasGoogle && !googleProblem) prepareGoogleSignIn();
  }, [hasGoogle, googleProblem]);

  async function act(key, action, success) {
    const startedAt = Date.now();
    setBusy(key);
    setError("");
    try {
      await action();
      await refreshAuthInfo();
      if (success) toast(success);
    } catch (e) {
      // If Firebase will not add a password to a Google account directly, a reset link sets one.
      setError(
        key === "password" && e?.code === "auth/email-already-in-use"
          ? "A password could not be added here. Log out, click “Forgot password?” on the log in page, and enter this email: the link lets you set a password."
          : key === "google"
            ? await explainGoogleError(e, startedAt)
            : explainAuthError(e)
      );
    }
    setBusy("");
  }

  return (
    <section className="card stack">
      <h2>Sign-in methods</h2>
      <ul className="list-plain">
        <li>
          <div className="spread">
            <div>
              <strong>Email</strong> · {authInfo?.email || "–"}
              <div className="muted small">
                {authInfo?.emailVerified ? "Verified" : "Not verified yet: check your inbox for the link."}
              </div>
            </div>
            {!authInfo?.emailVerified && (
              <span className="row">
                <button
                  className="btn btn-ghost btn-small"
                  disabled={Boolean(busy)}
                  onClick={() => act("verify", resendVerification, "Verification email sent")}
                >
                  Resend link
                </button>
                <button className="btn btn-ghost btn-small" disabled={Boolean(busy)} onClick={() => act("check", async () => {})}>
                  I&apos;ve verified
                </button>
              </span>
            )}
          </div>
        </li>
        <li>
          <div className="spread">
            <div>
              <strong>Password</strong>
              <div className="muted small">{hasPassword ? "You can log in with your email and password." : "Not set."}</div>
            </div>
            {hasPassword && <span className="badge badge-green">On</span>}
          </div>
          {!hasPassword && (
            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                act("password", () => addPassword(password), "Password added. You can now log in with email too.").then(() =>
                  setPassword("")
                );
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (6+ characters)"
                autoComplete="new-password"
                minLength={6}
                style={{ maxWidth: 260 }}
                aria-label="New password"
              />
              <button className="btn btn-secondary btn-small" disabled={Boolean(busy) || password.length < 6}>
                Add password
              </button>
            </form>
          )}
        </li>
        <li>
          <div className="spread">
            <div>
              <strong>Google</strong>
              <div className="muted small">
                {hasGoogle ? "You can log in with Google." : "Connect Google to log in with one click next time."}
              </div>
            </div>
            {hasGoogle ? (
              <span className="row">
                <span className="badge badge-green">Connected</span>
                {hasPassword && (
                  <button
                    className="btn btn-ghost btn-small"
                    disabled={Boolean(busy)}
                    onClick={() => act("unlink", disconnectGoogle, "Google disconnected")}
                  >
                    Disconnect
                  </button>
                )}
              </span>
            ) : (
              <button
                className="btn btn-secondary btn-small"
                disabled={Boolean(busy) || Boolean(googleProblem)}
                onClick={() => act("google", connectGoogle, "Google connected")}
              >
                {busy === "google" ? "Connecting…" : "Connect Google"}
              </button>
            )}
          </div>
          {!hasGoogle && googleProblem && <p className="error small">{googleProblem}</p>}
        </li>
      </ul>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

// Your data: download a copy, or delete the account and the data that belongs to you.
function YourData() {
  const toast = useToast();
  const { currentUser, signOut } = useUser();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setExporting(true);
    try {
      const data = await collectMyData(currentUser.id);
      downloadJson(data, `mantor-my-data-${new Date().toISOString().slice(0, 10)}.json`);
      toast("Your data was downloaded");
    } catch (e) {
      toast(e.message || "Could not collect your data", "error");
    }
    setExporting(false);
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      const token = await currentAuthUser()?.getIdToken(true);
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: typed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Your account could not be deleted");
      await signOut(); // goes to the home page
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }

  return (
    <section className="card stack">
      <h2>Your data</h2>
      <p className="muted small">
        See what we store and why in the <Link href="/privacy">Privacy policy</Link>.
      </p>
      <div>
        <button className="btn btn-secondary btn-small" onClick={download} disabled={exporting}>
          {exporting ? "Collecting…" : "Download my data"}
        </button>
      </div>
      <div className="danger-zone stack">
        <strong>Delete my account</strong>
        <p className="small">
          This permanently deletes your profile, photo, assessment, personal analyses, comments, contribution records,
          mentor connections and your login. Work you submitted for a team stays with the team, without your name. It
          cannot be undone.
        </p>
        {!confirming ? (
          <div>
            <button className="btn btn-danger btn-small" onClick={() => setConfirming(true)}>
              Delete my account…
            </button>
          </div>
        ) : (
          <div className="stack">
            <label className="field">
              Type DELETE to confirm
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-label="Type DELETE to confirm" />
            </label>
            {error && <p className="error small">{error}</p>}
            <div className="row">
              <button className="btn btn-danger-solid btn-small" onClick={remove} disabled={typed !== "DELETE" || deleting}>
                {deleting ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AccountPage() {
  const toast = useToast();
  const { mode, currentUser, refreshUsers, signOut } = useUser();

  if (!currentUser) return <p className="muted">Loading…</p>;
  if (mode !== "auth") {
    return (
      <div className="card">
        <h1>Account</h1>
        <p className="muted">You are using the demo, so there is no account. Use “Viewing as” to switch people.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div>
        <h1>Account</h1>
        <p className="muted">
          {currentUser.role === "mentor" ? "Mentor" : "Learner"}
          {currentUser.admin ? " · Admin" : ""}
          {currentUser.role === "learner" && ` · mentors see you as ${currentUser.anonymousName}`}
        </p>
      </div>

      <section className="card stack">
        <h2>Your details</h2>
        <PhotoPicker />
        <ProfileForm submitLabel="Save changes" onSaved={() => toast("Details saved")} />
      </section>

      <SignInMethods />

      <section className="card stack">
        <h2>Mentoring</h2>
        <MentorApplication user={currentUser} onSaved={refreshUsers} />
      </section>

      <YourData />

      <div>
        <button className="btn btn-ghost" onClick={signOut}>
          Log out
        </button>
      </div>
    </div>
  );
}
