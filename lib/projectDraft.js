import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from "./config.js";
import { clampWeeks, templateWeeks } from "./schedule.js";

// Helpers for mentor projects: saving the project form, and the AI draft (app/api/project-draft).
// Kept here, free of server-only imports, so they can be unit tested.

// Turns Claude's answer into { criteria, tasks } with tasks pointing at criteria by index
// (criteriaIndexes, 0-based), which is what the project form uses. Returns null if unusable.
export function normaliseDraft(output) {
  const text = (v, max) => String(v ?? "").trim().slice(0, max);
  const criteria = (Array.isArray(output?.criteria) ? output.criteria : [])
    .map((c) => ({ name: text(c.name, 80), description: text(c.description, 300) }))
    .filter((c) => c.name && c.description)
    .slice(0, 6);
  if (!criteria.length) return null;

  const tasks = (Array.isArray(output?.tasks) ? output.tasks : [])
    .map((t) => ({
      title: text(t.title, 120),
      description: text(t.description, 500),
      criteriaIndexes: [
        ...new Set(
          (Array.isArray(t.criteriaNumbers) ? t.criteriaNumbers : [])
            .map((n) => Math.round(Number(n)) - 1)
            .filter((i) => i >= 0 && i < criteria.length)
        ),
      ],
    }))
    .filter((t) => t.title && t.description)
    .slice(0, 8);
  if (!tasks.length) return null;

  // A task with no valid criterion is judged on the first one, so every task can get feedback.
  for (const t of tasks) if (!t.criteriaIndexes.length) t.criteriaIndexes = [0];
  return { criteria, tasks };
}

// The shape every good project shares: research, define, build, test, present.
const TEMPLATES = {
  "UX Design": ["User research", "Problem definition", "Design quality", "Usability testing"],
  "Data Analysis": ["Data cleaning", "Analysis method", "Insight quality", "Clear communication"],
  Cybersecurity: ["Threat identification", "Risk assessment", "Practical controls", "Clear reporting"],
  "Digital Marketing": ["Audience research", "Message and channel", "Measurable goals", "Results review"],
  "Software Development": ["Requirements", "Working software", "Code quality", "Testing"],
  "Product Management": ["Customer insight", "Prioritisation", "Success metrics", "Clear pitch"],
  "Business Analysis": ["Process mapping", "Root cause", "Requirements", "Recommendation"],
  "Sustainability Consulting": ["Baseline measurement", "Options analysis", "Business case", "Stakeholder buy-in"],
};

const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// t: optional translator (see lib/i18n); English when left out.
export function fallbackDraft(input, reason, t = fill) {
  const names = TEMPLATES[input.field] || TEMPLATES["UX Design"];
  const criteria = names.map((name) => ({
    name: t(name),
    description: t('Shows {criterion} that a {field} professional would accept for "{title}".', {
      criterion: t(name).toLowerCase(),
      field: t(input.field),
      title: input.title,
    }),
  }));
  const steps = [
    ["Understand the problem", "Research the scenario and write down the key facts, people involved and open questions."],
    ["Define the goal", "Agree as a team on one clear goal and how you will know you reached it."],
    ["Build the solution", "Create your main deliverable and explain the choices you made."],
    ["Check and present", "Test or review your work, note what you changed, and write a short summary for the manager."],
  ];
  const tasks = steps.map(([title, description], i) => ({ title: t(title), description: t(description), criteriaIndexes: [i] }));
  const note =
    reason === "error"
      ? t("The AI service could not be reached, so this is a template draft.")
      : t("This is a template draft because no Claude API key is set.");
  return { criteria, tasks, simulated: true, note };
}

// Turns the project form into the saved shape. Criteria keep stable ids (c1, c2, ...) so existing
// feedback still points at the right criterion after an edit.
export function cleanProject(data) {
  // Existing criteria keep their id; new ones get the next free "cN".
  const used = new Set();
  const kept = data.criteria.map((c) => (c.id && !used.has(c.id) ? (used.add(c.id), c.id) : null));
  let next = 1;
  const criteria = data.criteria.map((c, i) => {
    let cid = kept[i];
    while (!cid) {
      const candidate = `c${next++}`;
      if (!used.has(candidate)) cid = candidate;
    }
    used.add(cid);
    return { id: cid, name: c.name.trim(), description: c.description.trim() };
  });
  // The form refers to criteria by their position until they have an id.
  // Each task belongs to one week of the project (its milestone); see lib/schedule.js.
  const durationWeeks = clampWeeks(data.durationWeeks);
  const weeks = templateWeeks(data.taskTemplates, durationWeeks);
  const taskTemplates = data.taskTemplates.map((t, i) => ({
    title: t.title.trim(),
    description: t.description.trim(),
    criteriaIds: t.criteriaIndexes.map((i) => criteria[i]?.id).filter(Boolean),
    week: weeks[i],
  }));
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    field: data.field,
    difficulty: data.difficulty,
    teamSize: Math.max(MIN_TEAM_SIZE, Math.min(MAX_TEAM_SIZE, Number(data.teamSize) || 3)),
    durationWeeks,
    criteria,
    taskTemplates,
  };
}
