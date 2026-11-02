// What needs a mentor's attention across their teams, so they step in only where it matters:
// open help requests, tasks whose latest AI review scored 2 or less, teams with tasks 3 or more
// days past their due date, and teams that finished every task but have no final feedback yet.
// teams: [{ id, project, tasks, feedback }]
import { addDays, daysBetween, isDate, localDate } from "./schedule.js";

export function buildAttention(teams, today = localDate()) {
  const items = [];
  for (const team of teams) {
    const finals = (team.feedback || []).filter((f) => f.kind === "final");

    for (const task of team.tasks || []) {
      const href = `/teams/${team.id}/tasks/${task.id}`;
      const help = task.helpRequest;
      if (help && !help.resolvedAt) {
        items.push({ id: `help:${task.id}`, kind: "help", at: help.at, teamId: team.id, href, task, userId: help.userId, note: help.note });
      }
      const reviews = (team.feedback || []).filter((f) => f.kind !== "final" && f.taskId === task.id && !f.sample);
      const latest = reviews[reviews.length - 1];
      const low = latest?.scores?.filter((s) => s.score <= 2) || [];
      if (low.length && task.status !== "done") {
        items.push({ id: `low:${task.id}`, kind: "struggling", at: latest.createdAt, teamId: team.id, href, task, lowest: Math.min(...low.map((s) => s.score)) });
      }
    }

    const tasks = team.tasks || [];
    const late = tasks.filter((t) => t.status !== "done" && isDate(t.dueDate) && daysBetween(t.dueDate, today) >= 3);
    if (team.status === "active" && late.length) {
      const oldest = late.map((t) => t.dueDate).sort()[0];
      items.push({ id: `late:${team.id}`, kind: "late", at: `${addDays(oldest, 3)}T00:00:00.000Z`, teamId: team.id, href: `/teams/${team.id}`, project: team.project, late });
    }
    if (team.status === "active" && tasks.length && tasks.every((t) => t.status === "done") && !finals.length) {
      const lastDone = tasks.map((t) => t.submission?.submittedAt || t.createdAt).sort().pop();
      items.push({ id: `final:${team.id}`, kind: "final", at: lastDone, teamId: team.id, href: `/teams/${team.id}`, project: team.project });
    }
  }
  // Help requests first, then struggling tasks, then final feedback; oldest first within each, so nobody waits long.
  const order = { help: 0, struggling: 1, late: 2, final: 3 };
  return items.sort((a, b) => order[a.kind] - order[b.kind] || String(a.at).localeCompare(String(b.at)));
}
