// About: the problem MAntor solves and the evidence behind it (useful for judges and new visitors).
import Link from "next/link";
import { APP_NAME, TEAM_NAME } from "@/lib/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("About") };
}

const PAIN_POINTS = [
  [
    "Knowledge is not applied",
    "Watching videos and answering quizzes is not the same as doing real work, yet entry-level jobs ask for experience.",
  ],
  [
    "Learning alone",
    "Online learners rarely interact with others, and low interaction is linked to low completion (Dolata et al., 2019).",
  ],
  [
    "Low motivation",
    "Overall MOOC completion rates are around 15% or lower (Jordan, 2015). Finishing depends heavily on self-discipline (Schulze, 2014).",
  ],
];

const STEPS = [
  ["Career assessment", "32 short work activities suggest a career field, with a short explanation of why it fits."],
  ["Choose a project", "Realistic workplace scenarios written by industry mentors, matched to your result."],
  ["Work as a team", "A shared task board, submissions, contribution records and discussion, updated live."],
  ["AI feedback on the mentor's standard", "Every submission is scored against the mentor's own criteria within minutes."],
  ["Mentor guidance", "Mentors see learners by anonymous name only and give final feedback on the work."],
  ["Personal analysis and portfolio", "Strengths, next steps, curated courses, and a portfolio that proves the experience."],
];

const DECISIONS = [
  "Mentors set the standard and AI delivers the feedback, so one mentor can support many teams.",
  "Learners stay anonymous to mentors until they choose to share their name, so work is judged on merit.",
  "Projects are realistic scenarios, not client work, so there are no confidentiality issues.",
  "The AI coach gives hints, never the finished work: the point is to learn by doing.",
];

export default async function AboutPage() {
  const t = await getT();
  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div>
        <div className="eyebrow">{t("About {app}", { app: APP_NAME })}</div>
        <h1>{t("Experience before your first job")}</h1>
        <p className="muted">
          {t(
            "{app} is a project-driven learning platform. Students and career changers build realistic workplace projects in small teams, with AI feedback based on a mentor's own criteria. Built by {team} for the FEIT Hackathon 2026, in response to Untapped's challenge “Engineering the Future of Learning”.",
            { app: APP_NAME, team: TEAM_NAME }
          )}
        </p>
      </div>

      <section className="card">
        <h2>{t("Why it matters")}</h2>
        <p>
          {t(
            "The World Economic Forum expects 39% of workers' core skills to change by 2030 (Future of Jobs Report 2025). People need a way to practise new skills on real work, not only to watch courses about them."
          )}
        </p>
        <div className="analysis-grid">
          {PAIN_POINTS.map(([title, text]) => (
            <div key={title}>
              <div className="eyebrow">{t(title)}</div>
              <p className="small">{t(text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t("How it works")}</h2>
        <ol className="steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{t(title)}</strong>
              <div className="muted small">{t(text)}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>{t("Design decisions")}</h2>
        <ul className="bullets">
          {DECISIONS.map((d) => (
            <li key={d}>{t(d)}</li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 12 }}>
          {t(
            "The demo uses sample mentors and projects. The career assessment is a guide based on Holland's RIASEC model, not a validated psychometric test."
          )}
        </p>
      </section>

      <section className="card">
        <h2>{t("Sources")}</h2>
        <ul className="bullets small">
          <li>World Economic Forum (2025). The Future of Jobs Report 2025.</li>
          <li>Jordan, K. (2015). MOOC completion rates: The data.</li>
          <li>Dolata, M. et al. (2019). How Knowledge Stock Exchanges can increase student success in MOOCs.</li>
          <li>Schulze, A. S. (2014). MOOCs and completion rates: are self-directed adult learners the most successful at MOOCs?</li>
        </ul>
      </section>

      <div className="row">
        <Link href="/projects" className="btn">
          {t("Browse projects")}
        </Link>
        <Link href="/assessment" className="btn btn-ghost">
          {t("Take the assessment")}
        </Link>
      </div>
    </div>
  );
}
