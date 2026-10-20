"use client";

// The career assessment result: top match, every field's fit, what the work is like,
// and the learner's RIASEC interest profile.
import Link from "next/link";
import { FIELD_INFO, RIASEC, RIASEC_KEYS } from "@/lib/assessment";

const CONFIDENCE = {
  high: { label: "Clear result", tone: "badge-green" },
  medium: { label: "Close call", tone: "badge-amber" },
  low: { label: "Less certain", tone: "badge-amber" },
};

function FieldDetails({ field }) {
  const info = FIELD_INFO[field];
  if (!info) return null;
  return (
    <div className="field-details">
      <p>{info.summary}</p>
      <div className="analysis-grid">
        <div>
          <div className="eyebrow">A typical week</div>
          <ul className="bullets">
            {info.dayToDay.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">Entry roles</div>
          <ul className="bullets">
            {info.roles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">Skills to build</div>
          <ul className="bullets">
            {info.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function CareerResult({ result, projectCounts = {}, onRetake }) {
  const [top, ...rest] = result.matches;
  const confidence = CONFIDENCE[result.confidence] || CONFIDENCE.high;
  const projectsLink = (field) => {
    const n = projectCounts[field] || 0;
    return n ? (
      <Link href={`/projects?field=${encodeURIComponent(field)}`} className="small">
        See {n} project{n > 1 ? "s" : ""} →
      </Link>
    ) : (
      <span className="muted small">No projects yet</span>
    );
  };

  return (
    <div className="stack">
      <section className="card hero">
        <div className="spread">
          <div className="eyebrow">Your career assessment result</div>
          <span className="row">
            <span className={`badge ${confidence.tone}`}>{confidence.label}</span>
            {result.simulated && <span className="badge">Fixed explanation (no AI key)</span>}
          </span>
        </div>
        <div className="muted">Your best match</div>
        <div className="career-field">
          {top.field} <span className="career-percent">{top.percent}% fit</span>
        </div>
        <p>
          <strong>Why: </strong>
          {result.explanation}
        </p>
        {result.notes?.length > 0 && (
          <ul className="bullets small" style={{ marginBottom: 12 }}>
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <div className="row">
          <Link href={`/projects?field=${encodeURIComponent(top.field)}`} className="btn">
            See {top.field} projects
          </Link>
          {onRetake && (
            <button className="btn btn-secondary" onClick={onRetake}>
              Retake
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>What {top.field} work is like</h2>
        <FieldDetails field={top.field} />
      </section>

      <section className="card">
        <h2>All career fields</h2>
        <p className="muted small">How well each field fits the activities you enjoy. Open one to see what the work is like.</p>
        {[top, ...rest].map((m, index) => (
          <details key={m.field} className="match" open={index > 0 && index < 3}>
            <summary>
              <div className="spread" style={{ width: "100%" }}>
                <strong>
                  {index + 1}. {m.field}
                </strong>
                <span className="row">
                  {projectsLink(m.field)}
                  <span className="badge badge-blue">{m.percent}%</span>
                </span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${m.percent}%` }} />
              </div>
            </summary>
            {index > 0 && <FieldDetails field={m.field} />}
          </details>
        ))}
      </section>

      {result.profile && (
        <section className="card">
          <div className="spread">
            <div>
              <h2>Your interest profile</h2>
              <p className="muted small">
                Based on Holland&apos;s six interest types (RIASEC). Your code is{" "}
                <strong>{result.hollandCode}</strong>: {result.hollandCode
                  .split("")
                  .map((k) => RIASEC[k]?.nickname)
                  .join(", ")}
                .
              </p>
            </div>
          </div>
          {RIASEC_KEYS.map((k) => (
            <div key={k} className="progress-row">
              <div className="spread" style={{ width: "100%" }}>
                <div>
                  <strong>
                    {RIASEC[k].name} · {RIASEC[k].nickname}
                  </strong>
                  <div className="muted small">{RIASEC[k].description}</div>
                </div>
                <span className="muted small">{result.profile[k]}%</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${result.profile[k]}%` }} />
              </div>
            </div>
          ))}
          <p className="muted small" style={{ marginTop: 12 }}>
            This is a guide to help you pick a first project, not a validated psychometric test. Interests change as you
            try things, so retake it after a project or two.
          </p>
        </section>
      )}
    </div>
  );
}
