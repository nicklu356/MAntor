"use client";

// Your account: name, email, anonymous name, and the application to become a mentor.
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { getTeamsForUser, requestMentorRole, updateMyName } from "@/lib/db";

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

export default function AccountPage() {
  const toast = useToast();
  const { mode, currentUser, refreshUsers, signOut } = useUser();
  const [name, setName] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!currentUser) return <p className="muted">Loading…</p>;
  if (mode !== "auth") {
    return (
      <div className="card">
        <h1>Account</h1>
        <p className="muted">You are using the demo, so there is no account. Use “Viewing as” to switch people.</p>
      </div>
    );
  }

  const draftName = name ?? currentUser.name ?? "";

  async function saveName(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const teams = await getTeamsForUser(currentUser.id);
      await updateMyName(currentUser.id, draftName, teams.map((t) => t.id));
      await refreshUsers();
      setName(null);
      toast("Name saved");
    } catch (err) {
      toast(err.message || "Could not save your name", "error");
    }
    setSaving(false);
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Account</h1>

      <section className="card stack">
        <h2>Your details</h2>
        {currentUser.role !== "mentor" && (
          <form onSubmit={saveName} className="stack">
            <label className="field">
              Name
              <input value={draftName} onChange={(e) => setName(e.target.value)} maxLength={60} required />
              <span className="muted small">Only your teammates see your name.</span>
            </label>
            <div>
              <button className="btn btn-secondary btn-small" disabled={saving || !draftName.trim() || name === null}>
                {saving ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
        )}
        <div className="analysis-grid">
          <div>
            <div className="eyebrow">Email</div>
            {currentUser.email || "–"}
          </div>
          <div>
            <div className="eyebrow">Role</div>
            {currentUser.role === "mentor" ? "Mentor" : "Learner"}
            {currentUser.admin ? " · Admin" : ""}
          </div>
          {currentUser.role === "learner" && (
            <div>
              <div className="eyebrow">Name mentors see</div>
              {currentUser.anonymousName}
            </div>
          )}
        </div>
      </section>

      <section className="card stack">
        <h2>Mentoring</h2>
        <MentorApplication user={currentUser} onSaved={refreshUsers} />
      </section>

      <div>
        <button className="btn btn-ghost" onClick={signOut}>
          Log out
        </button>
      </div>
    </div>
  );
}
