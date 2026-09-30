"use client";

// The mentor's final feedback for a team.
// Mentors of this project see a form; everyone else sees the feedback once it exists.
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { ScoreDots } from "@/components/FeedbackPanel";
import { MAX_FEEDBACK_CHARS } from "@/lib/config";
import { addFinalFeedback, getTeamFeedback } from "@/lib/db";

export default function FinalFeedback({ team, project, tasks, canGive, onSaved }) {
  const { users, currentUser } = useUser();
  const [latest, setLatest] = useState(undefined);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      getTeamFeedback(team.id).then((list) => {
        const finals = list.filter((f) => f.kind === "final");
        setLatest(finals.length ? finals[finals.length - 1] : null);
      }),
    [team.id]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (latest === undefined || !project) return null;

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const criteriaName = (id) => project.criteria.find((c) => c.id === id)?.name || id;
  const author = latest ? users.find((u) => u.id === latest.authorId) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!summary.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addFinalFeedback({
        teamId: team.id,
        authorId: currentUser.id,
        summary: summary.trim(),
        scores: project.criteria.map((c) => ({
          criteriaId: c.id,
          score: Number(scores[c.id]) || 3,
          comment: (comments[c.id] || "").trim(),
        })),
        allTasksDone: openTasks === 0,
      });
      setSummary("");
      setScores({});
      setComments({});
      await load();
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not save feedback");
    }
    setSaving(false);
  }

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h2>Mentor final feedback</h2>

      {latest ? (
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="badge badge-blue">Mentor feedback</span>
            {author && (
              <span className="muted small">
                {author.name} · {author.company}
              </span>
            )}
            <span className="muted small">{new Date(latest.createdAt).toLocaleString()}</span>
          </div>
          <p className="pre">{latest.summary}</p>
          {latest.scores.map((s) => (
            <div key={s.criteriaId} className="score-row">
              <strong>{criteriaName(s.criteriaId)}</strong>
              <ScoreDots score={s.score} />
              {s.comment && (
                <span className="muted small" style={{ gridColumn: "1 / -1" }}>
                  {s.comment}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        !canGive && (
          <p className="muted">
            Your mentor will leave final feedback when the project is finished. It appears here.
          </p>
        )
      )}

      {canGive && (
        <form onSubmit={handleSubmit} className="stack" style={{ marginTop: latest ? 20 : 8 }}>
          <div>
            <strong>{latest ? "Update final feedback" : "Give final feedback"}</strong>
            <p className="muted small">
              You see learners by anonymous name only, so your feedback is about the work.
              {openTasks > 0 &&
                ` ${openTasks} task${openTasks > 1 ? "s are" : " is"} still open: you can give feedback now, but the team is only marked completed when every task is done.`}
            </p>
          </div>
          {project.criteria.map((c) => (
            <div key={c.id} className="score-row">
              <div>
                <strong>{c.name}</strong>
                <div className="muted small">{c.description}</div>
              </div>
              <select
                value={scores[c.id] || "3"}
                onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })}
                aria-label={`Score for ${c.name}`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
              <input
                value={comments[c.id] || ""}
                onChange={(e) => setComments({ ...comments, [c.id]: e.target.value })}
                maxLength={300}
                placeholder="Optional comment for this criterion"
                style={{ gridColumn: "1 / -1" }}
                aria-label={`Comment for ${c.name}`}
              />
            </div>
          ))}
          <label className="field">
            Overall feedback
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={MAX_FEEDBACK_CHARS}
              placeholder="What went well, and the one thing to work on next."
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div>
            <button className="btn" disabled={saving || !summary.trim()}>
              {saving ? "Saving…" : latest ? "Update final feedback" : "Save final feedback"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
