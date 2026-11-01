"use client";

// On the learner's home: mentors who liked the learner's work and asked who they are.
// Accepting shares the learner's real name with that mentor only. Declining keeps them anonymous.
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { respondToConnection } from "@/lib/db";

export default function ConnectionRequests() {
  const toast = useToast();
  const { users, connections, refreshConnections, currentUser } = useUser();
  const [busy, setBusy] = useState(null);
  const pending = connections.filter((c) => c.status === "pending");
  const accepted = connections.filter((c) => c.status === "accepted");
  if (!pending.length && !accepted.length) return null;

  const mentor = (id) => users.find((u) => u.id === id);

  async function respond(c, accept) {
    setBusy(c.id);
    try {
      // Accepting shares the learner's own name with this mentor only.
      await respondToConnection(c.id, accept, currentUser?.name);
      await refreshConnections();
      toast(accept ? `${mentor(c.mentorId)?.name} can now see your name` : "Request declined. You stay anonymous.");
    } catch (e) {
      toast(e.message || "Could not save your answer", "error");
    }
    setBusy(null);
  }

  return (
    <section id="requests" className="card">
      <h2>Mentor connections</h2>
      {pending.map((c) => {
        const m = mentor(c.mentorId);
        return (
          <div key={c.id} className="request">
            <p>
              <strong>{m?.name}</strong>
              {m?.company && <> from {m.company}</>} liked your work and would like to know who you are.
            </p>
            {c.message && <blockquote className="quote">{c.message}</blockquote>}
            <p className="muted small">
              Accepting shows your real name to this mentor only. Other mentors still see your anonymous name.
            </p>
            <div className="row">
              <button className="btn" onClick={() => respond(c, true)} disabled={busy === c.id}>
                Share my name
              </button>
              <button className="btn btn-ghost" onClick={() => respond(c, false)} disabled={busy === c.id}>
                Stay anonymous
              </button>
            </div>
          </div>
        );
      })}
      {accepted.length > 0 && (
        <p className="muted small" style={{ marginTop: pending.length ? 12 : 0 }}>
          Connected with {accepted.map((c) => mentor(c.mentorId)?.name).filter(Boolean).join(", ")}.
        </p>
      )}
    </section>
  );
}
