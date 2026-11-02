// Deadlines and milestones. A project lasts a number of weeks; each task belongs to one week
// (its milestone) and is due at the end of that week, counted from the day the team started.
// Dates are plain "YYYY-MM-DD" text (the team's calendar day, no time zone surprises).
export const DEFAULT_WEEKS = 4;
export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;

const DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" for a Date (or ms), in the viewer's own time zone.
export function localDate(value = new Date()) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toUtc = (date) => {
  const [y, m, d] = String(date).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(toUtc(value));

export function addDays(date, days) {
  const d = new Date(toUtc(date) + days * DAY);
  return d.toISOString().slice(0, 10);
}

// Whole days from a to b (positive when b is later).
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / DAY);

export function clampWeeks(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_WEEKS;
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, n));
}

// The week of each task template: the mentor's choice if valid, otherwise spread evenly
// (4 tasks over 4 weeks: one a week; 8 tasks over 4 weeks: two a week).
export function templateWeeks(templates, weeks) {
  const total = clampWeeks(weeks);
  return templates.map((template, i) => {
    const chosen = Math.round(Number(template.week));
    if (chosen >= 1 && chosen <= total) return chosen;
    return Math.max(1, Math.ceil(((i + 1) * total) / templates.length));
  });
}

// A new team's calendar: it ends after the project's weeks; each task is due at the end of its week.
export function planTeamSchedule(project, startDate) {
  const weeks = clampWeeks(project.durationWeeks);
  const templates = project.taskTemplates || [];
  const taskWeeks = templateWeeks(templates, weeks);
  return {
    startDate,
    endDate: addDays(startDate, weeks * 7),
    tasks: taskWeeks.map((week) => ({ week, dueDate: addDays(startDate, week * 7) })),
  };
}

// How a task's deadline looks today: null (no date, or done), or
// { kind: "overdue" | "today" | "soon" | "later", days } where days is days left (negative when late).
export function dueState(task, today = localDate()) {
  if (!task || task.status === "done" || !isDate(task.dueDate)) return null;
  const days = daysBetween(today, task.dueDate);
  if (days < 0) return { kind: "overdue", days };
  if (days === 0) return { kind: "today", days };
  if (days <= 3) return { kind: "soon", days };
  return { kind: "later", days };
}

// The short label for a due date ("Due today", "Due in 2 days", "3 days late", "Due 14 Nov").
export function dueLabel(task, t, today = localDate(), locale = "en") {
  const state = dueState(task, today);
  if (!state) return "";
  if (state.kind === "overdue") {
    const late = -state.days;
    return t(late === 1 ? "{n} day late" : "{n} days late", { n: late });
  }
  if (state.kind === "today") return t("Due today");
  if (state.days === 1) return t("Due tomorrow");
  if (state.kind === "soon") return t("Due in {n} days", { n: state.days });
  return t("Due {date}", { date: formatDay(task.dueDate, locale) });
}

export function formatDay(date, locale = "en") {
  if (!isDate(date)) return "";
  return new Date(toUtc(date)).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Where the team is in its project: { week, weeks, daysLeft, finished } (null without dates).
export function teamProgress(team, today = localDate()) {
  if (!isDate(team?.startDate) || !isDate(team?.endDate)) return null;
  const weeks = Math.max(1, Math.round(daysBetween(team.startDate, team.endDate) / 7));
  const elapsed = daysBetween(team.startDate, today);
  const week = Math.min(weeks, Math.max(1, Math.floor(elapsed / 7) + 1));
  const daysLeft = daysBetween(today, team.endDate);
  return { week, weeks, daysLeft, finished: daysLeft < 0, timeShare: Math.min(1, Math.max(0, elapsed / (weeks * 7))) };
}

// The team's milestones: one per week, with its tasks and whether all of them are done.
export function milestones(team, tasks, today = localDate()) {
  const progress = teamProgress(team, today);
  if (!progress) return [];
  const weekOf = (task) =>
    task.week || (isDate(task.dueDate) ? Math.max(1, Math.ceil(daysBetween(team.startDate, task.dueDate) / 7)) : null);
  return Array.from({ length: progress.weeks }, (_, i) => {
    const week = i + 1;
    const weekTasks = tasks.filter((task) => weekOf(task) === week);
    const end = addDays(team.startDate, week * 7);
    const done = weekTasks.length > 0 && weekTasks.every((task) => task.status === "done");
    return {
      week,
      end,
      tasks: weekTasks,
      done,
      current: week === progress.week && !progress.finished,
      late: !done && weekTasks.length > 0 && daysBetween(today, end) < 0,
    };
  });
}
