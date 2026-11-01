"use client";

// Career assessment: 32 work activities, rated from "Strongly dislike" to "Strongly like",
// shown 8 per page. Scoring happens in the browser (lib/assessment.js); the AI only writes the
// "why this fits you" text (a fixed text without an API key).
// Progress is kept in this browser, so a learner can leave and come back.
// The result is saved on the learner, so Projects can rank projects by fit.
import { useEffect, useMemo, useState } from "react";
import CareerResult from "@/components/CareerResult";
import { useUser } from "@/components/UserProvider";
import { FIELD_INFO, ITEMS, SCALE, describeAnswers, scoreAssessment } from "@/lib/assessment";
import { getProjects, updateUser } from "@/lib/db";
import { useLocale } from "@/components/LocaleProvider";

const PAGE_SIZE = 8;
const PAGES = Math.ceil(ITEMS.length / PAGE_SIZE);
const draftKey = (userId) => `mantor-assessment-${userId}`;

// A saved result on the user record, in the shape <CareerResult> expects.
function savedResult(user) {
  if (!user?.careerMatches?.length) return null;
  return {
    field: user.careerField,
    matches: user.careerMatches,
    profile: user.careerProfile,
    hollandCode: user.hollandCode,
    confidence: user.careerConfidence,
    notes: user.careerNotes || [],
    explanation: user.careerExplanation,
  };
}

export default function AssessmentPage() {
  const { t, locale } = useLocale();
  const { currentUser, isMentor, refreshUsers } = useUser();
  const [mode, setMode] = useState("intro"); // intro | quiz | result
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [projectCounts, setProjectCounts] = useState({});

  useEffect(() => {
    getProjects().then((list) => {
      const counts = {};
      for (const p of list) counts[p.field] = (counts[p.field] || 0) + 1;
      setProjectCounts(counts);
    });
  }, []);

  // On user switch: show their saved result, or restore an unfinished attempt.
  useEffect(() => {
    if (!currentUser) return;
    let draft = null;
    try {
      draft = JSON.parse(window.localStorage.getItem(draftKey(currentUser.id)) || "null");
    } catch {}
    const saved = savedResult(currentUser);
    setAnswers(draft?.answers || {});
    setPage(draft?.page || 0);
    setResult(saved);
    setMode(saved ? "result" : "intro");
    setError("");
    // Only when the person changes, not when their record is refreshed after saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const pageItems = useMemo(() => ITEMS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [page]);

  if (!currentUser) return <p className="muted">{t("Loading…")}</p>;
  if (isMentor) {
    return (
      <div className="card">
        <h1>{t("Career assessment")}</h1>
        <p className="muted">{t("The assessment is for learners. Switch to a learner in the header to try it.")}</p>
      </div>
    );
  }

  const answered = ITEMS.filter((i) => answers[i.id]).length;
  const pageComplete = pageItems.every((i) => answers[i.id]);
  const hasDraft = answered > 0 && answered < ITEMS.length;

  function saveDraft(nextAnswers, nextPage) {
    try {
      window.localStorage.setItem(draftKey(currentUser.id), JSON.stringify({ answers: nextAnswers, page: nextPage }));
    } catch {}
  }

  function rate(id, value) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    saveDraft(next, page);
  }

  function goTo(nextPage) {
    setPage(nextPage);
    saveDraft(answers, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function start(fresh) {
    if (fresh) {
      setAnswers({});
      setPage(0);
      saveDraft({}, 0);
    }
    setMode("quiz");
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    setSaving(true);
    setError("");
    const scored = scoreAssessment(answers);
    let explanation = FIELD_INFO[scored.field].blurb;
    let simulated = true;
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: scored.field,
          runnerUp: scored.runnerUp,
          hollandCode: scored.hollandCode,
          answers: describeAnswers(answers),
          locale,
        }),
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
      await updateUser(currentUser.id, {
        careerField: scored.field,
        careerExplanation: explanation,
        careerMatches: scored.matches,
        careerProfile: scored.profile,
        hollandCode: scored.hollandCode,
        careerConfidence: scored.confidence,
        careerNotes: scored.notes,
        assessedAt: new Date().toISOString(),
      });
      try {
        window.localStorage.removeItem(draftKey(currentUser.id));
      } catch {}
      await refreshUsers();
      setResult({ ...scored, explanation, simulated });
      setMode("result");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message || t("Could not save your result"));
    }
    setSaving(false);
  }

  if (mode === "result" && result) {
    return (
      <div style={{ maxWidth: 860 }}>
        <h1>{t("Career assessment")}</h1>
        {currentUser.assessedAt && (
          <p className="muted small">
            {t("Taken on {date}", { date: new Date(currentUser.assessedAt).toLocaleDateString() })}
          </p>
        )}
        <CareerResult result={result} projectCounts={projectCounts} onRetake={() => start(true)} />
      </div>
    );
  }

  if (mode === "intro") {
    return (
      <div className="card stack" style={{ maxWidth: 720 }}>
        <div>
          <h1>{t("Career assessment")}</h1>
          <p>
            {t("Rate {n} short work activities by how much you would enjoy doing them. It takes about 5 minutes.", {
              n: ITEMS.length,
            })}
          </p>
        </div>
        <ul className="bullets">
          <li>{t("Think about whether you would enjoy it, not whether you already have the skills.")}</li>
          <li>{t("There are no right or wrong answers. Use the whole scale: it makes your result more accurate.")}</li>
          <li>
            {t("You get your best match among {n} career fields, how every field fits you, and your interest profile.", {
              n: Object.keys(FIELD_INFO).length,
            })}
          </li>
        </ul>
        {currentUser.careerField && !savedResult(currentUser) && (
          <p className="muted small">
            {t("Your current result is {field}. Retaking replaces it.", { field: t(currentUser.careerField) })}
          </p>
        )}
        <div className="row">
          {hasDraft ? (
            <>
              <button className="btn" onClick={() => start(false)}>
                {t("Continue ({answered} of {total} done)", { answered, total: ITEMS.length })}
              </button>
              <button className="btn btn-ghost" onClick={() => start(true)}>
                {t("Start over")}
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => start(true)}>
              {t("Start the assessment")}
            </button>
          )}
        </div>
        <p className="muted small">
          {t("Based on Holland's RIASEC interest model. A guide for choosing a first project, not a validated career test.")}
        </p>
      </div>
    );
  }

  const last = page === PAGES - 1;

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <div>
        <h1>{t("Career assessment")}</h1>
        <div className="spread">
          <span className="muted small">
            {t("Page {page} of {pages}", { page: page + 1, pages: PAGES })}
          </span>
          <span className="muted small">
            {t("{answered} of {total} answered", { answered, total: ITEMS.length })}
          </span>
        </div>
        <div className="bar" style={{ marginTop: 8 }}>
          <div className="bar-fill" style={{ width: `${(answered / ITEMS.length) * 100}%` }} />
        </div>
      </div>

      <div className="card">
        <p className="muted small" style={{ marginBottom: 4 }}>
          {t("How much would you enjoy…")}
        </p>
        {pageItems.map((item, index) => (
          <fieldset key={item.id} className="likert">
            <legend>
              <span className="muted small">{page * PAGE_SIZE + index + 1}.</span> {t(item.text)}
            </legend>
            <div className="likert-options" role="radiogroup">
              {SCALE.map((s) => (
                <label key={s.value} className={answers[item.id] === s.value ? "likert-option selected" : "likert-option"}>
                  <input
                    type="radio"
                    name={item.id}
                    value={s.value}
                    checked={answers[item.id] === s.value}
                    onChange={() => rate(item.id, s.value)}
                  />
                  <span>{t(s.label)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      <div className="spread">
        <button className="btn btn-ghost" onClick={() => (page === 0 ? setMode(result ? "result" : "intro") : goTo(page - 1))}>
          {t("← Back")}
        </button>
        {last ? (
          <button className="btn" onClick={finish} disabled={!pageComplete || saving}>
            {saving ? t("Working out your result…") : t("See my result")}
          </button>
        ) : (
          <button className="btn" onClick={() => goTo(page + 1)} disabled={!pageComplete}>
            {t("Next →")}
          </button>
        )}
      </div>
      {!pageComplete && <p className="muted small">{t("Rate every activity on this page to continue.")}</p>}
    </div>
  );
}
