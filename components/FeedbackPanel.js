"use client";

// Shows AI feedback for a task and lets the team request new feedback.
// When there is more than one review, each score shows the change since the previous review.
import { useCallback, useEffect, useState } from "react";
import { addFeedback, getFeedback } from "@/lib/db";

export function ScoreDots({ score }) {
  return (
    <span className="score-dots" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= score ? "dot on" : "dot"} />
      ))}
    </span>
  );
}

function Delta({ now, before }) {
  if (before == null || now === before) return null;
  const change = now - before;
  return (
    <span className={change > 0 ? "badge badge-green" : "badge badge-amber"}>
      {change > 0 ? `+${change}` : change}
    </span>
  );
}

export function ReviewBadges({ review }) {
  return (
    <>
      <span className="badge badge-blue">{review.source === "ai" ? "AI feedback" : "Mentor feedback"}</span>
      {review.sample && <span className="badge badge-amber">Example</span>}
      {review.simulated && <span className="badge badge-amber">Simulated</span>}
    </>
  );
}

export default function FeedbackPanel({ project, task, teamId, contributions, canRequest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    () => getFeedback(task.id).then((list) => setItems([...list].reverse())),
    [task.id]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function requestFeedback() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, task, submission: task.submission, contributions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      await addFeedback({
        taskId: task.id,
        teamId,
        source: "ai",
        scores: data.scores,
        summary: data.summary,
        simulated: data.simulated,
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const criteriaName = (id) => project?.criteria.find((c) => c.id === id)?.name || id;
  const latest = items[0];
  const previous = items[1];
  const earlier = items.slice(1);

  return (
    <section className="card">
      <div className="spread">
        <div>
          <h2>Feedback</h2>
          <p className="muted small">AI reviews your submission against the mentor&apos;s criteria.</p>
        </div>
        {canRequest && (
          <button className="btn" onClick={requestFeedback} disabled={loading || !task.submission || !project}>
            {loading ? "Reviewing…" : latest ? "Get new feedback" : "Get AI feedback"}
          </button>
        )}
      </div>

      {canRequest && !task.submission && <p className="muted small">Submit your work first to get feedback.</p>}
      {!canRequest && !latest && <p className="muted small">No feedback yet.</p>}
      {error && <p className="error">{error}</p>}

      {latest && (
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <ReviewBadges review={latest} />
            <span className="muted small">{new Date(latest.createdAt).toLocaleString()}</span>
          </div>
          <p>{latest.summary}</p>
          {latest.scores.map((s) => (
            <div key={s.criteriaId} className="score-row">
              <strong>{criteriaName(s.criteriaId)}</strong>
              <span className="row">
                <Delta now={s.score} before={previous?.scores.find((p) => p.criteriaId === s.criteriaId)?.score} />
                <ScoreDots score={s.score} />
              </span>
              <span className="muted small" style={{ gridColumn: "1 / -1" }}>
                {s.comment}
              </span>
            </div>
          ))}

          {earlier.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="muted small" style={{ cursor: "pointer" }}>
                {earlier.length} earlier review{earlier.length > 1 ? "s" : ""}
              </summary>
              <ul className="list-plain">
                {earlier.map((review) => (
                  <li key={review.id}>
                    <div className="row">
                      <ReviewBadges review={review} />
                      <span className="muted small">{new Date(review.createdAt).toLocaleString()}</span>
                    </div>
                    {review.scores.map((s) => (
                      <div key={s.criteriaId} className="row small" style={{ marginTop: 4 }}>
                        <span>{criteriaName(s.criteriaId)}</span>
                        <ScoreDots score={s.score} />
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
