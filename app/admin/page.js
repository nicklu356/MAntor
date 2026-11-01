"use client";

// Admin: approve mentors and manage the sample content.
// To make someone an admin, open Firestore in the Firebase console, find users/<their uid>,
// and add the field  admin  (boolean)  true.  Users cannot give themselves this field.
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { approveMentor, declineMentor, removeDemoRecords, seedSampleContent } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export default function AdminPage() {
  const toast = useToast();
  const { mode, users, isAdmin, refreshUsers, currentUser } = useUser();
  const [busy, setBusy] = useState("");

  if (!currentUser) return <p className="muted">Loading…</p>;
  if (mode !== "auth" || !isAdmin) {
    return (
      <div className="card">
        <h1>Admin</h1>
        <p className="muted">Only admins can open this page.</p>
      </div>
    );
  }

  const pending = users.filter((u) => u.role === "learner" && u.mentorRequest && !u.mentorRequest.declinedAt);
  const mentors = users.filter((u) => u.role === "mentor");
  const learners = users.filter((u) => u.role === "learner");

  async function act(key, action, success) {
    setBusy(key);
    try {
      const result = await action();
      await refreshUsers();
      toast(typeof success === "function" ? success(result) : success);
    } catch (e) {
      toast(e.message || "Something went wrong", "error");
    }
    setBusy("");
  }

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div>
        <h1>Admin</h1>
        <p className="muted">
          {learners.length} learners · {mentors.length} mentors
        </p>
      </div>

      <section className="card">
        <div className="spread">
          <h2>Mentor applications</h2>
          <span className={pending.length ? "badge badge-amber" : "badge badge-green"}>
            {pending.length ? `${pending.length} waiting` : "None waiting"}
          </span>
        </div>
        {pending.length === 0 ? (
          <p className="muted small">New applications appear here. People apply from their Account page.</p>
        ) : (
          <ul className="list-plain">
            {pending.map((u) => (
              <li key={u.id}>
                <div className="spread">
                  <div>
                    <strong>{u.mentorRequest.name}</strong> · {u.mentorRequest.company}
                    <div className="muted small">
                      {u.anonymousName} · applied {timeAgo(u.mentorRequest.at)}
                    </div>
                    {u.mentorRequest.note && <blockquote className="quote">{u.mentorRequest.note}</blockquote>}
                  </div>
                  <span className="row">
                    <button
                      className="btn btn-small"
                      disabled={Boolean(busy)}
                      onClick={() => act(u.id, () => approveMentor(u), `${u.mentorRequest.name} is now a mentor`)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-ghost btn-small"
                      disabled={Boolean(busy)}
                      onClick={() => act(u.id, () => declineMentor(u), "Application declined")}
                    >
                      Decline
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>Sample content</h2>
        <p className="muted small">
          Loads the 8 sample projects and their sample mentors, so new learners have something to join. Running it
          again resets those projects (teams already working on them keep their tasks).
        </p>
        <div>
          <button
            className="btn"
            disabled={Boolean(busy)}
            onClick={() => act("seed", seedSampleContent, "Sample projects loaded")}
          >
            {busy === "seed" ? "Loading…" : "Load sample projects"}
          </button>
        </div>
        <p className="muted small">
          If you loaded the old demo data (Mia, Liam, Sofia, Noah and their teams) into this database before accounts
          existed, remove it here. Real users are not touched.
        </p>
        <div>
          <button
            className="btn btn-danger"
            disabled={Boolean(busy)}
            onClick={() =>
              act("clean", removeDemoRecords, (n) => (n ? `Removed ${n} old demo records` : "No old demo records found"))
            }
          >
            {busy === "clean" ? "Removing…" : "Remove old demo records"}
          </button>
        </div>
      </section>
    </div>
  );
}
