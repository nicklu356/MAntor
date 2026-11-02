// A mentor's week across all their teams: what moved, what is stuck, and one thing to do per team.
// weekStats() turns the records into small facts (learners by anonymous name only); the AI writes
// the summary from those facts (app/api/mentor-summary), and simulatedSummary() writes a plain
// one without an API key. The weekly digest email uses the same facts.
import { dueState, localDate, teamProgress } from "./schedule.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const clip = (text, max) => String(text || "").slice(0, max);

// teams: [{ id, status, startDate, endDate, memberIds, project, tasks, feedback, comments, contributions }]
// anonymousName: (userId) => "Learner #A3F"
export function weekStats(teams, { anonymousName, now = Date.now(), today = localDate(now) }) {
  const since = new Date(now - WEEK).toISOString();
  const recent = (at) => Boolean(at) && String(at) >= since;

  const result = teams
    .filter((team) => team.status === "active")
    .map((team) => {
      const tasks = team.tasks || [];
      const comments = (team.comments || []).filter((c) => recent(c.createdAt));
      const contributions = (team.contributions || []).filter((c) => recent(c.createdAt));
      const submitted = tasks.filter((task) => recent(task.submission?.submittedAt));
      const active = new Set([
        ...comments.map((c) => c.userId),
        ...contributions.map((c) => c.userId),
        ...submitted.map((task) => task.submission.submittedBy),
      ]);
      const reviews = (team.feedback || []).filter((f) => f.kind !== "final" && !f.sample);
      const lowScores = tasks
        .filter((task) => task.status !== "done")
        .map((task) => {
          const latest = reviews.filter((f) => f.taskId === task.id).pop();
          const lowest = latest?.scores?.length ? Math.min(...latest.scores.map((s) => s.score)) : null;
          return lowest != null && lowest <= 2 ? { task: clip(task.title, 120), score: lowest } : null;
        })
        .filter(Boolean);
      const progress = teamProgress(team, today);
      const done = tasks.filter((task) => task.status === "done").length;
      return {
        teamId: team.id,
        project: clip(team.project?.title, 160),
        week: progress?.week ?? null,
        weeks: progress?.weeks ?? null,
        done,
        total: tasks.length,
        members: team.memberIds.map(anonymousName), // tells apart two teams on the same project
        submitted: submitted.map((task) => clip(task.title, 120)),
        comments: comments.length,
        hours: contributions.reduce((sum, c) => sum + (Number(c.hoursSpent) || 0), 0),
        late: tasks
          .map((task) => ({ task, state: dueState(task, today) }))
          .filter(({ state }) => state?.kind === "overdue")
          .map(({ task, state }) => ({ task: clip(task.title, 120), days: -state.days })),
        help: tasks
          .filter((task) => task.helpRequest && !task.helpRequest.resolvedAt)
          .map((task) => ({ task: clip(task.title, 120), from: anonymousName(task.helpRequest.userId), note: clip(task.helpRequest.note, 300) })),
        lowScores,
        quiet: team.memberIds.filter((id) => !active.has(id)).map(anonymousName),
        needsFinal: tasks.length > 0 && done === tasks.length && !(team.feedback || []).some((f) => f.kind === "final"),
      };
    });
  return { since, teams: result };
}

const hasActivity = (s) => s.submitted.length > 0 || s.comments > 0 || s.hours > 0;

export function teamStatus(s) {
  if (s.help.length || (s.late.length && !hasActivity(s))) return "stuck";
  if (s.late.length || s.lowScores.length || s.quiet.length || s.needsFinal) return "needs_attention";
  return "on_track";
}

// The one thing the mentor could do for this team, most urgent first.
function suggestion(s, t) {
  if (s.help.length) return t("Answer the help request on “{task}”.", { task: s.help[0].task });
  if (s.needsFinal) return t("Give final feedback: every task is done.");
  if (s.late.length) return t("Check in about “{task}”, {n} day(s) late.", { task: s.late[0].task, n: s.late[0].days });
  if (s.lowScores.length) {
    return t("“{task}” scored {score}/5: a short comment on what good looks like would help.", s.lowScores[0]);
  }
  if (s.quiet.length) return t("{names} had no activity this week: a quick hello may help.", { names: s.quiet.join(", ") });
  return t("Things are moving: a short note of encouragement is enough.");
}

// A summary without AI, from the facts alone (also the fallback when the AI call fails).
export function simulatedSummary(stats, t = fill) {
  const teams = stats.teams.map((s) => {
    const parts = [
      s.week ? t("Week {week} of {weeks}.", s) : "",
      t("{done} of {total} tasks done.", s),
      t("This week: {submitted} submission(s), {comments} comment(s), {hours}h recorded.", {
        submitted: s.submitted.length,
        comments: s.comments,
        hours: s.hours,
      }),
    ];
    return { teamId: s.teamId, status: teamStatus(s), headline: parts.filter(Boolean).join(" "), suggestion: suggestion(s, t) };
  });
  const count = (status) => teams.filter((team) => team.status === status).length;
  const overview = stats.teams.length
    ? t("{n} active team(s): {ok} on track, {attention} need attention, {stuck} stuck.", {
        n: teams.length,
        ok: count("on_track"),
        attention: count("needs_attention"),
        stuck: count("stuck"),
      })
    : t("No active teams this week.");
  const order = { stuck: 0, needs_attention: 1, on_track: 2 };
  const priorities = teams
    .filter((team) => team.status !== "on_track")
    .sort((a, b) => order[a.status] - order[b.status])
    .slice(0, 3)
    .map((team) => `${stats.teams.find((s) => s.teamId === team.teamId).project}: ${team.suggestion}`);
  return { overview, teams, priorities, simulated: true };
}
