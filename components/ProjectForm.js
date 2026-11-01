"use client";

// Mentor's project editor: the scenario, the criteria (the industry standard) and the tasks.
// "Draft with AI" fills in criteria and tasks from the scenario; the mentor edits before publishing.
// Tasks point at criteria by position (criteriaIndexes) until the project is saved.
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { DIFFICULTIES, FIELDS, MAX_PROJECT_DESCRIPTION_CHARS, MAX_TEAM_SIZE, MIN_TEAM_SIZE } from "@/lib/config";
import { useLocale } from "@/components/LocaleProvider";

const emptyCriterion = () => ({ name: "", description: "" });
const emptyTask = () => ({ title: "", description: "", criteriaIndexes: [0] });

// Converts a saved project into the form's shape.
export function projectToForm(project) {
  return {
    title: project.title,
    field: project.field,
    difficulty: project.difficulty,
    teamSize: project.teamSize,
    description: project.description,
    criteria: project.criteria.map((c) => ({ ...c })),
    taskTemplates: (project.taskTemplates || []).map((item) => ({
      title: item.title,
      description: item.description,
      criteriaIndexes: item.criteriaIds.map((id) => project.criteria.findIndex((c) => c.id === id)).filter((i) => i >= 0),
    })),
  };
}

export const emptyProjectForm = () => ({
  title: "",
  field: FIELDS[0],
  difficulty: "beginner",
  teamSize: 3,
  description: "",
  criteria: [emptyCriterion()],
  taskTemplates: [emptyTask()],
});

export function validateProject(form) {
  if (!form.title.trim()) return "Give the project a title.";
  if (form.description.trim().length < 30) return "Describe the workplace scenario in a few sentences.";
  if (!form.criteria.length || form.criteria.some((c) => !c.name.trim() || !c.description.trim()))
    return "Every criterion needs a name and a description.";
  if (!form.taskTemplates.length || form.taskTemplates.some((item) => !item.title.trim() || !item.description.trim()))
    return "Every task needs a title and instructions.";
  if (form.taskTemplates.some((item) => !item.criteriaIndexes.length)) return "Every task must be judged on at least one criterion.";
  return "";
}

export default function ProjectForm({ initial, submitLabel, onSubmit, hasTeams }) {
  const { t, locale } = useLocale();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (changes) => setForm((f) => ({ ...f, ...changes }));
  const setCriterion = (i, changes) =>
    set({ criteria: form.criteria.map((c, j) => (j === i ? { ...c, ...changes } : c)) });
  const setTask = (i, changes) =>
    set({ taskTemplates: form.taskTemplates.map((item, j) => (j === i ? { ...item, ...changes } : item)) });

  function removeCriterion(i) {
    // Shift task references so they keep pointing at the same criteria.
    set({
      criteria: form.criteria.filter((_, j) => j !== i),
      taskTemplates: form.taskTemplates.map((item) => ({
        ...item,
        criteriaIndexes: item.criteriaIndexes.filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)),
      })),
    });
  }

  function moveTask(i, step) {
    const j = i + step;
    if (j < 0 || j >= form.taskTemplates.length) return;
    const list = [...form.taskTemplates];
    [list[i], list[j]] = [list[j], list[i]];
    set({ taskTemplates: list });
  }

  async function draftWithAI() {
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/project-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          field: form.field,
          difficulty: form.difficulty,
          description: form.description,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Could not draft the project"));
      set({ criteria: data.criteria, taskTemplates: data.tasks });
      toast(data.simulated ? t(data.note || "Template draft added") : t("AI draft added. Review and edit it before publishing."));
    } catch (e) {
      setError(e.message);
    }
    setDrafting(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validateProject(form);
    if (problem) return setError(t(problem));
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || t("Could not save the project"));
      setSaving(false);
    }
  }

  const canDraft = form.title.trim() && form.description.trim().length >= 30;

  return (
    <form onSubmit={handleSubmit} className="stack">
      <section className="card stack">
        <h2>{t("1. The scenario")}</h2>
        <label className="field">
          {t("Project title")}
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={120}
            placeholder={t("e.g. Reduce checkout drop-off for a food delivery app")}
          />
        </label>
        <div className="form-row">
          <label className="field">
            {t("Field")}
            <select value={form.field} onChange={(e) => set({ field: e.target.value })}>
              {FIELDS.map((f) => (
                <option key={f} value={f}>
                  {t(f)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Difficulty")}
            <select value={form.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {t(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Team size")}
            <select value={form.teamSize} onChange={(e) => set({ teamSize: Number(e.target.value) })}>
              {Array.from({ length: MAX_TEAM_SIZE - MIN_TEAM_SIZE + 1 }, (_, i) => MIN_TEAM_SIZE + i).map((n) => (
                <option key={n} value={n}>
                  {t("{n} learners", { n })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          {t("Workplace scenario")}
          <textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            maxLength={MAX_PROJECT_DESCRIPTION_CHARS}
            placeholder={t(
              "Describe a realistic situation from your work, without confidential details. What is the problem, who is affected, and what should the team deliver?"
            )}
          />
          <span className="muted small">
            {form.description.length} / {MAX_PROJECT_DESCRIPTION_CHARS}
          </span>
        </label>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={draftWithAI} disabled={!canDraft || drafting}>
            {drafting ? t("Drafting…") : t("✦ Draft criteria and tasks with AI")}
          </button>
          <span className="muted small">
            {canDraft ? t("Replaces the criteria and tasks below.") : t("Write a title and scenario first.")}
          </span>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>{t("2. Criteria")}</h2>
          <p className="muted small">
            {t("The standard you would hold a junior colleague to. AI feedback scores every submission against these.")}
          </p>
        </div>
        {form.criteria.map((c, i) => (
          <div key={i} className="editor-item">
            <div className="spread">
              <strong>{t("Criterion {n}", { n: i + 1 })}</strong>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => removeCriterion(i)}
                disabled={form.criteria.length === 1}
              >
                {t("Remove")}
              </button>
            </div>
            <input
              value={c.name}
              onChange={(e) => setCriterion(i, { name: e.target.value })}
              maxLength={80}
              placeholder={t("Name, e.g. User research")}
              aria-label={`Criterion ${i + 1} name`}
            />
            <input
              value={c.description}
              onChange={(e) => setCriterion(i, { description: e.target.value })}
              maxLength={300}
              placeholder={t("What good looks like, e.g. Interviews at least 3 users and summarises their needs")}
              aria-label={`Criterion ${i + 1} description`}
            />
          </div>
        ))}
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => set({ criteria: [...form.criteria, emptyCriterion()] })}
            disabled={form.criteria.length >= 8}
          >
            {t("+ Add criterion")}
          </button>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>{t("3. Tasks")}</h2>
          <p className="muted small">
            {t("Every new team gets these tasks on its board, in this order.")}
            {hasTeams && ` ${t("Teams that already started keep the tasks they were given.")}`}
          </p>
        </div>
        {form.taskTemplates.map((item, i) => (
          <div key={i} className="editor-item">
            <div className="spread">
              <strong>{t("Task {n}", { n: i + 1 })}</strong>
              <span className="row">
                <button type="button" className="btn btn-ghost btn-small" onClick={() => moveTask(i, -1)} disabled={i === 0} aria-label={t("Move up")}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => moveTask(i, 1)}
                  disabled={i === form.taskTemplates.length - 1}
                  aria-label={t("Move down")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => set({ taskTemplates: form.taskTemplates.filter((_, j) => j !== i) })}
                  disabled={form.taskTemplates.length === 1}
                >
                  {t("Remove")}
                </button>
              </span>
            </div>
            <input
              value={item.title}
              onChange={(e) => setTask(i, { title: e.target.value })}
              maxLength={120}
              placeholder={t("Title, e.g. Interview 3 users")}
              aria-label={`Task ${i + 1} title`}
            />
            <textarea
              value={item.description}
              onChange={(e) => setTask(i, { description: e.target.value })}
              maxLength={500}
              style={{ minHeight: 70 }}
              placeholder={t("Instructions a beginner can act on")}
              aria-label={`Task ${i + 1} instructions`}
            />
            <div className="row small">
              <span className="muted">{t("Judged on:")}</span>
              {form.criteria.map((c, k) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={item.criteriaIndexes.includes(k)}
                    onChange={(e) =>
                      setTask(i, {
                        criteriaIndexes: e.target.checked
                          ? [...item.criteriaIndexes, k].sort((a, b) => a - b)
                          : item.criteriaIndexes.filter((x) => x !== k),
                      })
                    }
                  />
                  {c.name || t("Criterion {n}", { n: k + 1 })}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => set({ taskTemplates: [...form.taskTemplates, emptyTask()] })}
            disabled={form.taskTemplates.length >= 10}
          >
            {t("+ Add task")}
          </button>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={saving}>
          {saving ? t("Saving…") : submitLabel}
        </button>
      </div>
    </form>
  );
}
