"use client";

// Career assessment: 6 questions. The score is calculated here in the browser.
// The "why this fits you" text comes from the AI (or a fixed text without an API key).
// The result is saved on the learner, so the Projects page can show "Matches your result".
import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/components/UserProvider";
import { FIELD_INFO, QUESTIONS, describeAnswers, scoreAssessment } from "@/lib/assessment";
import { updateUser } from "@/lib/db";

export default function AssessmentPage() {
  const { currentUser, isMentor, refreshUsers } = useUser();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!currentUser) return <p className="muted">Loading…</p>;
  if (isMentor) {
    return (
      <div className="card">
        <h1>Career assessment</h1>
        <p className="muted">The assessment is for learners. Switch to a learner in the header to try it.</p>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const complete = answered === QUESTIONS.length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!complete) return;
    setSaving(true);
    setError("");

    const { scores, field, runnerUp } = scoreAssessment(answers);
    let explanation = FIELD_INFO[field].blurb;
    let simulated = true;
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, answers: describeAnswers(answers) }),
      });
      const data = await res.json();
      if (res.ok && data.explanation) {
        explanation = data.explanation;
        simulated = Boolean(data.simulated);
      }
    } catch {
      // Keep the fixed explanation: the result must never depend on the AI.
    }

    try {
      await updateUser(currentUser.id, { careerField: field, careerExplanation: explanation });
      await refreshUsers();
      setResult({ scores, field, runnerUp, explanation, simulated });
    } catch (err) {
      setError(err.message || "Could not save your result");
    }
    setSaving(false);
  }

  function retake() {
    setAnswers({});
    setResult(null);
  }

  if (result) {
    const max = Math.max(...Object.values(result.scores), 1);
    return (
      <div className="stack">
        <section className="card hero">
          <div className="spread">
            <div className="eyebrow">Your career assessment result</div>
            {result.simulated && <span className="badge badge-amber">Fixed explanation (no AI key)</span>}
          </div>
          <div className="muted">You are a good fit for</div>
          <div className="career-field">{result.field}</div>
          <p>
            <strong>Why: </strong>
            {result.explanation}
          </p>
          {result.runnerUp && (
            <p className="muted small">You might also enjoy {result.runnerUp}.</p>
          )}
          <div className="row">
            <Link href="/projects" className="btn">
              See projects that match
            </Link>
            <button className="btn btn-ghost" onClick={retake}>
              Retake
            </button>
          </div>
        </section>

        <section className="card">
          <h2>How your answers pointed</h2>
          {Object.entries(result.scores).map(([field, score]) => (
            <div key={field} className="progress-row">
              <div className="spread" style={{ width: "100%" }}>
                <strong>{field}</strong>
                <span className="muted small">
                  {score} of {QUESTIONS.length}
                </span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(score / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ maxWidth: 720 }}>
      <div>
        <h1>Career assessment</h1>
        <p className="muted">
          Six short questions, no right or wrong answers. Pick what feels most like you.
        </p>
      </div>

      {QUESTIONS.map((q, index) => (
        <fieldset key={q.id} className="card question">
          <legend>
            <span className="muted small">
              Question {index + 1} of {QUESTIONS.length}
            </span>
            <div>{q.text}</div>
          </legend>
          {q.options.map((option, i) => (
            <label key={option.text} className={answers[q.id] === i ? "option selected" : "option"}>
              <input
                type="radio"
                name={q.id}
                checked={answers[q.id] === i}
                onChange={() => setAnswers({ ...answers, [q.id]: i })}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
      ))}

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={!complete || saving}>
          {saving ? "Working out your result…" : "See my result"}
        </button>
        <span className="muted small">
          {answered} of {QUESTIONS.length} answered
        </span>
      </div>
    </form>
  );
}
