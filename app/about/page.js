// About: the problem MAntor solves and the evidence behind it (useful for judges and new visitors).
import Link from "next/link";
import { APP_NAME, TEAM_NAME } from "@/lib/config";

export const metadata = { title: "About" };

const PAIN_POINTS = [
  {
    title: "Knowledge is not applied",
    text: "Watching videos and answering quizzes is not the same as doing real work, yet entry-level jobs ask for experience.",
  },
  {
    title: "Learning alone",
    text: "Online learners rarely interact with others, and low interaction is linked to low completion (Dolata et al., 2019).",
  },
  {
    title: "Low motivation",
    text: "Overall MOOC completion rates are around 15% or lower (Jordan, 2015). Finishing depends heavily on self-discipline (Schulze, 2014).",
  },
];

const STEPS = [
  ["Career assessment", "Six short questions suggest a field, with a short explanation of why it fits."],
  ["Choose a project", "Realistic workplace scenarios written by industry mentors, matched to your result."],
  ["Work as a team", "A shared task board, submissions, contribution records and discussion."],
  ["AI feedback on the mentor's standard", "Every submission is scored against the mentor's own criteria within minutes."],
  ["Mentor guidance", "Mentors see learners by anonymous name only and give final feedback on the work."],
  ["Personal analysis and portfolio", "Strengths, next steps, curated courses, and a portfolio that proves the experience."],
];

export default function AboutPage() {
  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div>
        <div className="eyebrow">About {APP_NAME}</div>
        <h1>Experience before your first job</h1>
        <p className="muted">
          {APP_NAME} is a project-driven learning platform. Students and career changers build realistic workplace projects
          in small teams, with AI feedback based on a mentor&apos;s own criteria. Built by {TEAM_NAME} for the FEIT Hackathon
          2026, in response to Untapped&apos;s challenge &quot;Engineering the Future of Learning&quot;.
        </p>
      </div>

      <section className="card">
        <h2>Why it matters</h2>
        <p>
          The World Economic Forum expects 39% of workers&apos; core skills to change by 2030 (Future of Jobs Report 2025).
          People need a way to practise new skills on real work, not only to watch courses about them.
        </p>
        <div className="analysis-grid">
          {PAIN_POINTS.map((p) => (
            <div key={p.title}>
              <div className="eyebrow">{p.title}</div>
              <p className="small">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <div className="muted small">{text}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Design decisions</h2>
        <ul className="bullets">
          <li>Mentors set the standard and AI delivers the feedback, so one mentor can support many teams.</li>
          <li>Learners stay anonymous to mentors until they choose to share their name, so work is judged on merit.</li>
          <li>Projects are realistic scenarios, not client work, so there are no confidentiality issues.</li>
          <li>The AI coach gives hints, never the finished work: the point is to learn by doing.</li>
        </ul>
        <p className="muted small" style={{ marginTop: 12 }}>
          Prototype: login is simulated with the &quot;Viewing as&quot; switch, the demo mentors and projects are sample
          data, and the career assessment is rule based, not a validated psychometric test.
        </p>
      </section>

      <section className="card">
        <h2>Sources</h2>
        <ul className="bullets small">
          <li>World Economic Forum (2025). The Future of Jobs Report 2025.</li>
          <li>Jordan, K. (2015). MOOC completion rates: The data.</li>
          <li>Dolata, M. et al. (2019). How Knowledge Stock Exchanges can increase student success in MOOCs.</li>
          <li>Schulze, A. S. (2014). MOOCs and completion rates: are self-directed adult learners the most successful at MOOCs?</li>
        </ul>
      </section>

      <div className="row">
        <Link href="/projects" className="btn">
          Browse projects
        </Link>
        <Link href="/assessment" className="btn btn-ghost">
          Take the assessment
        </Link>
      </div>
    </div>
  );
}
