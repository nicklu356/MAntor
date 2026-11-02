"use client";

// The career assessment result: top match, every field's fit, what the work is like,
// and the learner's RIASEC interest profile.
import Link from "next/link";
import { FIELD_INFO, RIASEC, RIASEC_KEYS } from "@/lib/assessment";
import { useT } from "@/components/LocaleProvider";

const CONFIDENCE = {
  high: { label: "Clear result", tone: "badge-green" },
  medium: { label: "Close call", tone: "badge-amber" },
  low: { label: "Less certain", tone: "badge-amber" },
};

// Notes are saved in English with field names inside; translate the known shapes.
function translateNote(t, note) {
  const tie = note.match(/^(.+) and (.+) are almost tied\. Try a project in each\.$/);
  if (tie) return t("{a} and {b} are almost tied. Try a project in each.", { a: t(tie[1]), b: t(tie[2]) });
  const partial = note.match(/^You answered (\d+) of (\d+) activities\.$/);
  if (partial) return t("You answered {n} of {total} activities.", { n: partial[1], total: partial[2] });
  return t(note);
}

function FieldDetails({ field }) {
  const t = useT();
  const info = FIELD_INFO[field];
  if (!info) return null;
  return (
    <div className="field-details">
      <p>{t(info.summary)}</p>
      <div className="analysis-grid">
        <div>
          <div className="eyebrow">{t("A typical week")}</div>
          <ul className="bullets">
            {info.dayToDay.map((d) => (
              <li key={d}>{t(d)}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">{t("Entry roles")}</div>
          <ul className="bullets">
            {info.roles.map((r) => (
              <li key={r}>{t(r)}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">{t("Skills to build")}</div>
          <ul className="bullets">
            {info.skills.map((s) => (
              <li key={s}>{t(s)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function CareerResult({ result, projectCounts = {}, onRetake }) {
  const t = useT();
  const [top, ...rest] = result.matches;
  const confidence = CONFIDENCE[result.confidence] || CONFIDENCE.high;
  const projectsLink = (field) => {
    const n = projectCounts[field] || 0;
    return n ? (
      <Link href={`/projects?field=${encodeURIComponent(field)}`} className="small">
        {t(n > 1 ? "See {n} projects →" : "See {n} project →", { n })}
      </Link>
    ) : (
      <span className="muted small">{t("No projects yet")}</span>
    );
  };

  return (
    <div className="stack">
      <section className="card hero">
        <div className="spread">
          <div className="eyebrow">{t("Your career assessment result")}</div>
          <span className="row">
            <span className={`badge ${confidence.tone}`}>{t(confidence.label)}</span>
            {result.simulated && <span className="badge">{t("Fixed explanation (no AI key)")}</span>}
          </span>
        </div>
        <div className="muted">{t("Your best match")}</div>
        <div className="career-field">
          {t(top.field)} <span className="career-percent">{t("{percent}% fit", { percent: top.percent })}</span>
        </div>
        <p>
          <strong>{t("Why:")} </strong>
          {/* The fixed explanation (no AI key) is translatable; AI text is already in the language it was asked in. */}
          {result.explanation === FIELD_INFO[top.field]?.blurb ? t(result.explanation) : result.explanation}
        </p>
        {result.notes?.length > 0 && (
          <ul className="bullets small" style={{ marginBottom: 12 }}>
            {result.notes.map((n) => (
              <li key={n}>{translateNote(t, n)}</li>
            ))}
          </ul>
        )}
        <div className="row">
          <Link href={`/projects?field=${encodeURIComponent(top.field)}`} className="btn">
            {t("See {field} projects", { field: t(top.field) })}
          </Link>
          {onRetake && (
            <button className="btn btn-secondary" onClick={onRetake}>
              {t("Retake")}
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>{t("What {field} work is like", { field: t(top.field) })}</h2>
        <FieldDetails field={top.field} />
      </section>

      <section className="card">
        <h2>{t("All career fields")}</h2>
        <p className="muted small">
          {t("How well each field fits the activities you enjoy. Open one to see what the work is like.")}
        </p>
        {[top, ...rest].map((m, index) => (
          <details key={m.field} className="match" open={index > 0 && index < 3}>
            <summary>
              <div className="spread" style={{ width: "100%" }}>
                <strong>
                  {index + 1}. {t(m.field)}
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
              <h2>{t("Your interest profile")}</h2>
              <p className="muted small">
                {t("Based on Holland's six interest types (RIASEC). Your code is")}{" "}
                <strong>{result.hollandCode}</strong>:{" "}
                {result.hollandCode
                  .split("")
                  .map((k) => t(RIASEC[k]?.nickname))
                  .join(", ")}
              </p>
            </div>
          </div>
          {RIASEC_KEYS.map((k) => (
            <div key={k} className="progress-row">
              <div className="spread" style={{ width: "100%" }}>
                <div>
                  <strong>
                    {t(RIASEC[k].name)} · {t(RIASEC[k].nickname)}
                  </strong>
                  <div className="muted small">{t(RIASEC[k].description)}</div>
                </div>
                <span className="muted small">{result.profile[k]}%</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${result.profile[k]}%` }} />
              </div>
            </div>
          ))}
          <p className="muted small" style={{ marginTop: 12 }}>
            {t(
              "This is a guide to help you pick a first project, not a validated psychometric test. Interests change as you try things, so retake it after a project or two."
            )}
          </p>
        </section>
      )}
    </div>
  );
}
