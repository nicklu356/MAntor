"use client";

// Who is in the team, and what each person contributed.
// The project's mentor can ask to learn a learner's identity ("I'm interested in your work").
// Nothing is revealed until the learner accepts (see the requests card on the learner's home).
import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { requestConnection } from "@/lib/db";
import { useLiveList } from "@/lib/live";
import { useT } from "@/components/LocaleProvider";

export default function TeamMembers({ team, project, canConnect }) {
  const t = useT();
  const toast = useToast();
  const { currentUser, userName, connections, refreshConnections } = useUser();
  const contributions = useLiveList("contributions", "teamId", team.id) || [];
  const [asking, setAsking] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);


  const hoursOf = (id) =>
    contributions.filter((c) => c.userId === id).reduce((sum, c) => sum + (Number(c.hoursSpent) || 0), 0);
  const entriesOf = (id) => contributions.filter((c) => c.userId === id).length;
  const connectionFor = (id) =>
    [...connections].reverse().find((c) => c.learnerId === id && c.mentorId === currentUser?.id);

  async function send(learnerId) {
    setSending(true);
    try {
      await requestConnection({
        mentorId: currentUser.id,
        learnerId,
        teamId: team.id,
        projectId: project.id,
        message: message.trim(),
      });
      await refreshConnections();
      toast(t("Request sent. Their name appears here if they accept."));
      setAsking(null);
      setMessage("");
    } catch (e) {
      toast(e.message || t("Could not send the request"), "error");
    }
    setSending(false);
  }

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div className="spread">
        <div>
          <h2>{t("Team")}</h2>
          <p className="muted small">
            {t("{n} of {size} members", { n: team.memberIds.length, size: project.teamSize })}
            {team.status === "active" && team.memberIds.length < project.teamSize && ` · ${t("open for new members")}`}
          </p>
        </div>
      </div>
      <ul className="list-plain">
        {team.memberIds.map((id) => {
          const conn = connectionFor(id);
          return (
            <li key={id}>
              <div className="spread">
                <div className="row">
                  <Avatar id={id} />
                  <div>
                    <Link href={`/portfolio/${id}`}>
                      <strong>{userName(id)}</strong>
                    </Link>
                    <div className="muted small">
                      {t(entriesOf(id) === 1 ? "{n} contribution" : "{n} contributions", { n: entriesOf(id) })} ·{" "}
                      {t("{h}h recorded", { h: hoursOf(id) })}
                    </div>
                  </div>
                </div>
                {canConnect && (
                  <span className="row">
                    {conn?.status === "accepted" && <span className="badge badge-green">{t("Connected")}</span>}
                    {conn?.status === "pending" && <span className="badge">{t("Request pending")}</span>}
                    {(!conn || conn.status === "declined") && asking !== id && (
                      <button className="btn btn-secondary btn-small" onClick={() => setAsking(id)}>
                        {t("Interested in their work")}
                      </button>
                    )}
                  </span>
                )}
              </div>
              {canConnect && asking === id && (
                <div className="stack" style={{ marginTop: 10 }}>
                  <p className="muted small">
                    {t("The learner sees your name and company and decides whether to share their identity with you.")}
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    style={{ minHeight: 70 }}
                    placeholder={t("Optional note, e.g. Your interview summary was excellent. Happy to chat about UX roles.")}
                    aria-label={t("Note to the learner")}
                  />
                  <div className="row">
                    <button className="btn btn-small" onClick={() => send(id)} disabled={sending}>
                      {sending ? t("Sending…") : t("Send request")}
                    </button>
                    <button className="btn btn-ghost btn-small" onClick={() => setAsking(null)} disabled={sending}>
                      {t("Cancel")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
