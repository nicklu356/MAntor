// Public portfolio (no login needed): /p/<user id>. Rendered on the server from Firestore, and only
// for learners who switched it on. The link is meant for CVs, LinkedIn and job applications.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreDots } from "@/components/FeedbackPanel";
import { APP_NAME } from "@/lib/config";
import { hasAdmin } from "@/lib/server/firebaseAdmin";
import { getPublicPortfolio } from "@/lib/server/portfolio";

export const dynamic = "force-dynamic";

async function load(id) {
  if (!hasAdmin()) return { off: true };
  try {
    return { portfolio: await getPublicPortfolio(id) };
  } catch (error) {
    console.error("Public portfolio failed:", error);
    return { failed: true };
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { portfolio } = await load(id);
  if (!portfolio) return { title: "Portfolio" };
  return {
    title: `${portfolio.name} · Portfolio`,
    description: `${portfolio.name}'s project experience on ${APP_NAME}: realistic workplace projects reviewed against industry mentors' standards.`,
  };
}

export default async function PublicPortfolioPage({ params }) {
  const { id } = await params;
  const { portfolio, off, failed } = await load(id);
  if (off || failed) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <h1>Portfolio unavailable</h1>
        <p className="muted">
          {off
            ? "Public portfolios are not switched on for this site yet (the server needs FIREBASE_SERVICE_ACCOUNT, see README)."
            : "This portfolio could not be loaded. Please try again later."}
        </p>
      </div>
    );
  }
  if (!portfolio) notFound();

  const completed = portfolio.projects.filter((p) => p.status === "completed").length;
  const hours = portfolio.projects.flatMap((p) => p.contributions).reduce((sum, c) => sum + c.hoursSpent, 0);

  return (
    <div className="stack portfolio">
      <section className="card portfolio-head">
        <div className="public-head">
          <span className="avatar" style={{ width: 96, height: 96, fontSize: 32 }} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {portfolio.photo ? <img src={portfolio.photo} alt="" /> : portfolio.name.slice(0, 1)}
          </span>
          <div>
            <div className="eyebrow">Project portfolio · {APP_NAME}</div>
            <h1>{portfolio.name}</h1>
            {portfolio.education && (
              <p className="muted">
                {portfolio.education.level}, {portfolio.education.field} · {portfolio.education.school}
                {portfolio.education.year ? ` (${portfolio.education.year})` : ""}
              </p>
            )}
            {portfolio.careerField && <p className="muted small">Building experience in {portfolio.careerField}</p>}
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{portfolio.projects.length}</div>
            <div className="muted small">Team projects</div>
          </div>
          <div className="stat">
            <div className="stat-value">{completed}</div>
            <div className="muted small">Completed with mentor review</div>
          </div>
          <div className="stat">
            <div className="stat-value">{hours}h</div>
            <div className="muted small">Recorded contribution</div>
          </div>
        </div>
      </section>

      {portfolio.projects.length === 0 && <p className="card muted">No projects yet.</p>}

      {portfolio.projects.map((p) => (
        <section key={p.id} className="card stack">
          <div>
            <div className="row">
              <span className="badge badge-blue">{p.field}</span>
              {p.status === "completed" ? (
                <span className="badge badge-green">✓ Completed · reviewed by mentor</span>
              ) : (
                <span className="badge">In progress</span>
              )}
            </div>
            <h2 style={{ marginTop: 8 }}>{p.title}</h2>
            <div className="muted small">
              Scenario by {p.company} · team of {p.teamSize} · {p.tasksDone} of {p.tasksTotal} tasks done
            </div>
          </div>

          {p.mentorFeedback && (
            <div>
              <div className="eyebrow">Mentor&apos;s final feedback</div>
              <blockquote className="quote">{p.mentorFeedback.summary}</blockquote>
              <div className="muted small">
                {p.mentorFeedback.mentorName}, {p.mentorFeedback.company}
              </div>
            </div>
          )}

          <div className="analysis-grid">
            <div>
              <div className="eyebrow">Verified results against the mentor&apos;s criteria</div>
              {p.results.length === 0 ? (
                <p className="muted small">No verified reviews yet.</p>
              ) : (
                p.results.map((r) => (
                  <div key={r.key} className="score-row">
                    <span>
                      <strong>{r.name}</strong>
                      {r.history.length > 1 && <span className="muted small"> · {r.history.join(" → ")}</span>}
                    </span>
                    <ScoreDots score={r.latestScore} />
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="eyebrow">What they did (self-reported)</div>
              {p.contributions.length === 0 ? (
                <p className="muted small">No contributions recorded.</p>
              ) : (
                <ul className="bullets">
                  {p.contributions.map((c) => (
                    <li key={c.id}>
                      {c.description}{" "}
                      <span className="muted small">
                        ({c.hoursSpent}h{c.task ? ` · ${c.task}` : ""})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ))}

      <p className="muted small">
        Scores are AI reviews saved by the {APP_NAME} server against criteria written by industry mentors; final
        feedback is written by the mentor. Projects are realistic scenarios, not client work.{" "}
        <Link href="/about">About {APP_NAME}</Link>
      </p>
    </div>
  );
}
