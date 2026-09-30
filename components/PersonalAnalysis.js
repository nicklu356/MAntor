"use client";

// AI personal analysis for one learner in one team: strengths, what to improve,
// next steps, and course suggestions (only from the curated list in lib/courses.js).
// Without an API key the server builds a simulated analysis from the scores, so this never breaks.
import { useCallback, useEffect, useState } from "react";
import { getCourse } from "@/lib/courses";
import { addAnalysis, getAnalyses, getContributionsForTeam, getTeamFeedback } from "@/lib/db";
import { buildCriteriaResults } from "@/lib/progress";

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <ul className="bullets">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function PersonalAnalysis({ team, project, tasks, currentUser }) {
  const [latest, setLatest] = useState(undefined);
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [analyses, feedback] = await Promise.all([
      getAnalyses(team.id, currentUser.id),
      getTeamFeedback(team.id),
    ]);
    setLatest(analyses[0] || null);
    setHasReview(feedback.some((f) => f.kind !== "final" && f.taskId));
  }, [team.id, currentUser.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const [feedback, allContributions] = await Promise.all([
        getTeamFeedback(team.id),
        getContributionsForTeam(team.id),
      ]);
      const results = buildCriteriaResults(project, tasks, feedback);
      const finals = feedback.filter((f) => f.kind === "final");
      const final = finals.length ? finals[finals.length - 1] : null;

      // No names are sent to the AI: only scores, comments and the learner's own contribution text.
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: { title: project.title, field: project.field, description: project.description },
          criteriaResults: results.map((r) => ({
            name: r.name,
            description: r.description,
            taskTitle: r.taskTitle,
            firstScore: r.firstScore,
            latestScore: r.latestScore,
            reviews: r.reviews,
            latestComment: r.latestComment,
          })),
          contributions: allContributions
            .filter((c) => c.userId === currentUser.id)
            .map((c) => ({ description: c.description, hoursSpent: c.hoursSpent })),
          mentorFinal: final
            ? {
                summary: final.summary,
                scores: final.scores.map((s) => ({
                  name: project.criteria.find((c) => c.id === s.criteriaId)?.name || s.criteriaId,
                  score: s.score,
                  comment: s.comment,
                })),
              }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      await addAnalysis({
        teamId: team.id,
        projectId: project.id,
        userId: currentUser.id,
        summary: data.summary,
        strengths: data.strengths,
        improvements: data.improvements,
        nextSteps: data.nextSteps,
        courses: data.courses,
        simulated: data.simulated,
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  if (latest === undefined) return null;

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div className="spread">
        <div>
          <h2>My personal analysis</h2>
          <p className="muted small">
            AI turns your feedback and contributions into strengths, next steps and course ideas.
          </p>
        </div>
        <button className="btn" onClick={generate} disabled={loading || !hasReview}>
          {loading ? "Analysing…" : latest ? "Refresh analysis" : "Generate my analysis"}
        </button>
      </div>

      {!hasReview && <p className="muted small">Get AI feedback on at least one task first.</p>}
      {error && <p className="error">{error}</p>}

      {latest && (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="row">
            <span className="badge badge-blue">AI analysis</span>
            {latest.simulated && <span className="badge badge-amber">Simulated</span>}
            <span className="muted small">{new Date(latest.createdAt).toLocaleString()}</span>
          </div>
          <p>{latest.summary}</p>
          <div className="analysis-grid">
            <List title="Strengths" items={latest.strengths} />
            <List title="To improve" items={latest.improvements} />
            <List title="Next steps" items={latest.nextSteps} />
          </div>

          {latest.courses?.length > 0 && (
            <div>
              <div className="eyebrow">Suggested courses</div>
              <div className="grid">
                {latest.courses.map((c) => {
                  const course = getCourse(c.id);
                  if (!course) return null;
                  return (
                    <a key={c.id} href={course.url} target="_blank" rel="noreferrer" className="card course-card">
                      <span className="badge">{course.provider}</span>
                      <strong>{course.title}</strong>
                      <span className="muted small">{c.reason}</span>
                      <span className="small">Open course ↗</span>
                    </a>
                  );
                })}
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                Picked from a curated list, so the AI never invents courses.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
