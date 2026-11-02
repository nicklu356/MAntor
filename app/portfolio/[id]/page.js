"use client";

// A learner's portfolio: the projects they worked on, what they did, how the work scored
// against the mentors' criteria, and the mentors' final feedback.
// It is the "proof of experience" a learner can share or print (Save as PDF).
// Mentors see the learner's anonymous name unless the learner accepted their connection request.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoreDots } from "@/components/FeedbackPanel";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { computeAchievements } from "@/lib/achievements";
import {
  getContributionsForTeam,
  getProject,
  getTasks,
  getTeamComments,
  getTeamFeedback,
  getTeamsForUser,
  getUser,
} from "@/lib/db";
import { average } from "@/lib/format";
import PublicLink from "@/components/PublicLink";
import { buildCriteriaResults } from "@/lib/progress";
import { useT } from "@/components/LocaleProvider";

async function loadPortfolio(userId) {
  const teams = await getTeamsForUser(userId);
  const entries = await Promise.all(
    teams.map(async (team) => {
      const [project, tasks, feedback, contributions, comments] = await Promise.all([
        getProject(team.projectId),
        getTasks(team.id),
        getTeamFeedback(team.id),
        getContributionsForTeam(team.id),
        getTeamComments(team.id),
      ]);
      if (!project) return null;
      const finals = feedback.filter((f) => f.kind === "final");
      const mine = contributions.filter((c) => c.userId === userId);
      return {
        team,
        project,
        tasks,
        feedback,
        allContributions: contributions,
        comments,
        results: buildCriteriaResults(project, tasks, feedback).filter((r) => r.latestScore != null),
        final: finals[finals.length - 1] || null,
        contributions: mine.map((c) => ({ ...c, taskTitle: tasks.find((item) => item.id === c.taskId)?.title })),
        submitted: tasks.filter((item) => item.submission?.submittedBy === userId).length,
      };
    })
  );
  // Completed projects first, then the most recent.
  return entries
    .filter(Boolean)
    .sort((a, b) => (b.team.status === "completed") - (a.team.status === "completed") || String(b.team.createdAt).localeCompare(String(a.team.createdAt)));
}

export default function PortfolioPage() {
  const t = useT();
  const { id } = useParams();
  const toast = useToast();
  const { mode, currentUser, users, userName } = useUser();
  const [learner, setLearner] = useState(undefined);
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    getUser(id).then((u) => {
      setLearner(u?.role === "learner" ? u : null);
      if (u?.role === "learner") loadPortfolio(id).then(setEntries);
    });
  }, [id]);

  if (learner === undefined) return <p className="muted">{t("Loading…")}</p>;
  if (learner === null) return <p className="card">{t("Portfolio not found.")}</p>;

  const isOwner = currentUser?.id === learner.id;
  const all = entries || [];
  const hours = all.flatMap((e) => e.contributions).reduce((sum, c) => sum + (Number(c.hoursSpent) || 0), 0);
  const scores = all.flatMap((e) => e.results.map((r) => r.latestScore));
  const avg = average(scores);
  const improved = all.flatMap((e) => e.results).filter((r) => r.reviews > 1 && r.latestScore > r.firstScore).length;
  const strengths = [...new Set(all.flatMap((e) => e.results.filter((r) => r.latestScore >= 4).map((r) => r.name)))];
  const mentorOf = (fid) => users.find((u) => u.id === fid);
  const achievements = entries
    ? computeAchievements(
        learner.id,
        all.map((e) => ({ ...e, contributions: e.allContributions }))
      )
    : [];
  const earned = achievements.filter((a) => a.earned);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(t("Link copied"));
    } catch {
      toast(t("Could not copy the link"), "error");
    }
  }

  return (
    <div className="stack portfolio">
      <section className="card portfolio-head">
        <div className="spread">
          <div>
            <div className="eyebrow">{t("Project portfolio")}</div>
            <h1>{userName(learner.id)}</h1>
            {learner.careerField && <p className="muted">{t("Building experience in {field}", { field: t(learner.careerField) })}</p>}
          </div>
          <div className="row no-print">
            <button className="btn btn-secondary btn-small" onClick={copyLink}>
              {t("Copy link")}
            </button>
            <button className="btn btn-small" onClick={() => window.print()}>
              {t("Save as PDF")}
            </button>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{all.length}</div>
            <div className="muted small">{t("Projects")}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{all.filter((e) => e.team.status === "completed").length}</div>
            <div className="muted small">{t("Completed with mentor review")}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{hours}h</div>
            <div className="muted small">{t("Recorded contribution")}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{avg == null ? "–" : `${avg.toFixed(1)}/5`}</div>
            <div className="muted small">
              {t("Average criteria score")}
              {improved ? ` · ${t("{n} improved after feedback", { n: improved })}` : ""}
            </div>
          </div>
        </div>
        {strengths.length > 0 && (
          <div className="row" style={{ marginTop: 12 }}>
            <span className="muted small">{t("Strong in:")}</span>
            {strengths.map((s) => (
              <span key={s} className="badge badge-blue">
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {isOwner && mode === "auth" && <PublicLink />}

      {entries && (isOwner || earned.length > 0) && (
        <section className="card">
          <div className="spread">
            <h2>{t("Achievements")}</h2>
            <span className="badge badge-blue">
              {t("{n} of {total}", { n: earned.length, total: achievements.length })}
            </span>
          </div>
          <div className="achievements">
            {(isOwner ? achievements : earned).map((a) => (
              <div key={a.id} className={a.earned ? "achievement earned" : "achievement no-print"}>
                <span className="achievement-icon" aria-hidden="true">
                  {a.icon}
                </span>
                <div>
                  <strong>{t(a.title)}</strong>
                  <div className="muted small">
                    {t(a.description)}
                    {a.progress && ` (${a.progress})`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {entries === null && <div className="card skeleton" />}
      {entries?.length === 0 && (
        <div className="card">
          <p className="muted">{t("No projects yet.")}</p>
          {isOwner && (
            <Link href="/projects" className="btn btn-secondary">
              {t("Find a project")}
            </Link>
          )}
        </div>
      )}

      {all.map((e) => {
        const mentor = e.final ? mentorOf(e.final.authorId) : null;
        return (
          <section key={e.team.id} className="card stack">
            <div className="spread">
              <div>
                <div className="row">
                  <span className="badge badge-blue">{t(e.project.field)}</span>
                  {e.team.status === "completed" ? (
                    <span className="badge badge-green">{t("✓ Completed · reviewed by mentor")}</span>
                  ) : (
                    <span className="badge">{t("In progress")}</span>
                  )}
                </div>
                <h2 style={{ marginTop: 8 }}>{e.project.title}</h2>
                <div className="muted small">
                  {t("Scenario by {company} · team of {n}", { company: e.project.company, n: e.team.memberIds.length })} ·{" "}
                  {t("{done} of {total} tasks done", {
                    done: e.tasks.filter((item) => item.status === "done").length,
                    total: e.tasks.length,
                  })}{" "}
                  · {t("{n} submitted by this learner", { n: e.submitted })}
                </div>
              </div>
              {(isOwner || e.team.memberIds.includes(currentUser?.id)) && (
                <Link href={`/teams/${e.team.id}`} className="btn btn-ghost btn-small no-print">
                  {t("Open team →")}
                </Link>
              )}
            </div>

            {e.final && (
              <div>
                <div className="eyebrow">{t("Mentor's final feedback")}</div>
                <blockquote className="quote">{e.final.summary}</blockquote>
                {mentor && (
                  <div className="muted small">
                    {mentor.name}, {mentor.company}
                  </div>
                )}
              </div>
            )}

            <div className="analysis-grid">
              <div>
                <div className="eyebrow">{t("Team results against the mentor's criteria")}</div>
                {e.results.length === 0 ? (
                  <p className="muted small">{t("No reviewed work yet.")}</p>
                ) : (
                  e.results.map((r) => (
                    <div key={r.key} className="score-row">
                      <span>
                        <strong>{r.name}</strong>
                        {r.reviews > 1 && r.latestScore > r.firstScore && (
                          <span className="muted small"> · {r.history.join(" → ")}</span>
                        )}
                      </span>
                      <ScoreDots score={r.latestScore} />
                    </div>
                  ))
                )}
              </div>
              <div>
                <div className="eyebrow">{t("What this learner did")}</div>
                {e.contributions.length === 0 ? (
                  <p className="muted small">{t("No contributions recorded.")}</p>
                ) : (
                  <ul className="bullets">
                    {e.contributions.map((c) => (
                      <li key={c.id}>
                        {c.description}{" "}
                        <span className="muted small">
                          ({c.hoursSpent}h{c.taskTitle ? ` · ${c.taskTitle}` : ""})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        );
      })}

      <p className="muted small">
        {t(
          "Scores come from AI feedback against criteria written by industry mentors. Projects are realistic scenarios, not client work."
        )}
      </p>
    </div>
  );
}
