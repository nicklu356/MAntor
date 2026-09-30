"use client";

// Progress visualisation: tasks done, and for every criterion the score history
// (for example 2 -> 3 -> 4) so learners can see that revising their work pays off.
import { useEffect, useState } from "react";
import { getTeamFeedback } from "@/lib/db";
import { buildCriteriaResults } from "@/lib/progress";

export default function ProgressPanel({ project, tasks, teamId }) {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    getTeamFeedback(teamId).then(setFeedback);
  }, [teamId]);

  if (!project || feedback === null) return null;

  const rows = buildCriteriaResults(project, tasks, feedback);
  const reviewed = rows.filter((r) => r.latestScore != null);
  const average = reviewed.length
    ? reviewed.reduce((sum, r) => sum + r.latestScore, 0) / reviewed.length
    : null;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const donePercent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div className="spread">
        <div>
          <h2>Progress</h2>
          <p className="muted small">
            Scores from AI feedback, measured against the mentor&apos;s criteria.
          </p>
        </div>
        <div className="row">
          <span className="badge">
            {reviewed.length} of {rows.length} criteria reviewed
          </span>
          {average != null && <span className="badge badge-blue">Average {average.toFixed(1)} / 5</span>}
        </div>
      </div>

      <div className="progress-row">
        <div className="spread" style={{ width: "100%" }}>
          <strong>Tasks done</strong>
          <span className="muted small">
            {doneCount} of {tasks.length}
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill bar-green" style={{ width: `${donePercent}%` }} />
        </div>
      </div>

      {rows.map((r) => {
        const improved = r.history.length > 1 && r.latestScore > r.firstScore;
        return (
          <div key={r.key} className="progress-row">
            <div className="spread" style={{ width: "100%" }}>
              <div>
                <strong>{r.name}</strong>
                <div className="muted small">{r.taskTitle}</div>
              </div>
              {r.latestScore == null ? (
                <span className="muted small">Not reviewed yet</span>
              ) : (
                <span className="row">
                  {r.history.length > 1 && <span className="muted small">{r.history.join(" → ")}</span>}
                  {improved && <span className="badge badge-green">+{r.latestScore - r.firstScore}</span>}
                  <span className="badge badge-blue">{r.latestScore} / 5</span>
                </span>
              )}
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${((r.latestScore || 0) / 5) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
