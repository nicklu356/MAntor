// Writes a mentor's weekly summary (server only) from the week's facts (weekStats() in
// lib/weeklySummary.js: counts, task titles, anonymous names; never real names). With
// ANTHROPIC_API_KEY, Claude writes it; otherwise (or if the call fails) it is built from the facts.
// Used by the "Your week" card (app/api/mentor-summary) and the Monday email (app/api/cron/weekly).
import { aiLanguage, translator } from "@/lib/i18n";
import { DATA_RULE, askJson, clip, hasAI } from "@/lib/server/ai";
import { simulatedSummary, teamStatus } from "@/lib/weeklySummary";

const STATUSES = ["on_track", "needs_attention", "stuck"];

const SYSTEM_PROMPT = `You help a busy industry mentor who volunteers on a project-based learning platform.
Write their weekly summary of the learner teams they mentor. Use ONLY the facts provided; never invent work.
Learners are anonymous (for example "Learner #A3F"): refer to them only that way.
For each team: a one-sentence headline of how the week went, a status, and ONE concrete action the
mentor could take in under 10 minutes (answer a help request, comment on a weak criterion, check in
on a late task, give final feedback, or just encourage). Then up to 3 priorities across all teams,
most urgent first. Plain, warm, short sentences.
${DATA_RULE}`;

const SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string", description: "2 sentences on the week across all teams." },
    teams: {
      type: "array",
      items: {
        type: "object",
        properties: {
          teamId: { type: "string" },
          status: { type: "string", enum: STATUSES },
          headline: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["teamId", "status", "headline", "suggestion"],
        additionalProperties: false,
      },
    },
    priorities: { type: "array", items: { type: "string" }, description: "Up to 3, most urgent first." },
  },
  required: ["overview", "teams", "priorities"],
  additionalProperties: false,
};

const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v) * 10) / 10) : 0);
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);

export function cleanStats(body) {
  return {
    since: clip(body?.since, 40),
    teams: list(body?.teams, 30).map((s) => ({
      teamId: clip(s.teamId, 80),
      project: clip(s.project, 160),
      week: s.week == null ? null : num(s.week),
      weeks: s.weeks == null ? null : num(s.weeks),
      done: num(s.done),
      total: num(s.total),
      members: list(s.members, 6).map((m) => clip(m, 40)),
      submitted: list(s.submitted, 10).map((x) => clip(x, 120)),
      comments: num(s.comments),
      hours: num(s.hours),
      late: list(s.late, 10).map((x) => ({ task: clip(x.task, 120), days: num(x.days) })),
      help: list(s.help, 5).map((x) => ({ task: clip(x.task, 120), from: clip(x.from, 40), note: clip(x.note, 300) })),
      lowScores: list(s.lowScores, 10).map((x) => ({ task: clip(x.task, 120), score: num(x.score) })),
      quiet: list(s.quiet, 6).map((x) => clip(x, 40)),
      needsFinal: Boolean(s.needsFinal),
    })),
  };
}

function buildPrompt(stats) {
  const lines = stats.teams.map((s) =>
    [
      `<team id="${s.teamId}">`,
      `Project: ${s.project}. Members: ${s.members.join(", ")}.`,
      s.week ? `Week ${s.week} of ${s.weeks}.` : "No schedule.",
      `Tasks done: ${s.done} of ${s.total}.${s.needsFinal ? " Every task is done; no final feedback yet." : ""}`,
      `This week: submissions on ${s.submitted.length ? s.submitted.join("; ") : "nothing"}; ${s.comments} comment(s); ${s.hours}h of contributions recorded.`,
      `Late tasks: ${s.late.length ? s.late.map((x) => `${x.task} (${x.days} days late)`).join("; ") : "none"}.`,
      `Open help requests: ${s.help.length ? s.help.map((x) => `${x.from} on ${x.task}: <notes>${x.note}</notes>`).join("; ") : "none"}.`,
      `Latest AI scores of 2 or less: ${s.lowScores.length ? s.lowScores.map((x) => `${x.task} (${x.score}/5)`).join("; ") : "none"}.`,
      `No activity this week: ${s.quiet.length ? s.quiet.join(", ") : "nobody"}.`,
      `</team>`,
    ].join("\n")
  );
  return [`The week since ${stats.since}.`, "<evidence>", ...lines, "</evidence>"].join("\n");
}

// facts: from weekStats() (cleaned here, so it can come from the browser).
export async function writeSummary(facts, locale) {
  const stats = cleanStats(facts);
  const t = translator(locale);
  if (!hasAI() || !stats.teams.length) return simulatedSummary(stats, t);
  try {
    const output = await askJson({
      system: `${SYSTEM_PROMPT}\n${aiLanguage(locale)}`,
      prompt: buildPrompt(stats),
      schema: SCHEMA,
      effort: "low",
    });
    // Keep only known teams, one entry each; any team the AI skipped gets the plain summary.
    const plain = simulatedSummary(stats, t);
    const teams = stats.teams.map((s) => {
      const written = output.teams.find((team) => team.teamId === s.teamId);
      return written
        ? { teamId: s.teamId, status: STATUSES.includes(written.status) ? written.status : teamStatus(s), headline: written.headline, suggestion: written.suggestion }
        : plain.teams.find((team) => team.teamId === s.teamId);
    });
    return { overview: output.overview, teams, priorities: output.priorities.slice(0, 3), simulated: false };
  } catch (error) {
    console.error("Mentor summary AI failed:", error.message);
    return { ...simulatedSummary(stats, t), aiError: true };
  }
}
