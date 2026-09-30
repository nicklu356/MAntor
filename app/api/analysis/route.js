// AI personal analysis: strengths, areas to improve, next steps and course suggestions.
// The browser sends the learner's evidence (scores, own contributions, mentor feedback).
// Courses can ONLY come from lib/courses.js, so the AI can never invent a course or link.
// Without ANTHROPIC_API_KEY (or if the AI call fails), an analysis is built from the scores.
import { COURSES } from "@/lib/courses";
import {
  DATA_RULE,
  clip,
  getClient,
  getModel,
  hasAI,
  rateLimit,
  readJson,
  tooManyRequests,
} from "@/lib/server/ai";

const SYSTEM_PROMPT = `You are a supportive career coach for a beginner who just finished project work on a learning platform.
Use ONLY the evidence provided (criteria scores, mentor and AI comments, the learner's own contributions). Never invent work that is not there.
Be encouraging but honest. Keep every item to one or two plain sentences.
Recommend 2 or 3 courses, and ONLY choose ids from the course list provided.
${DATA_RULE}`;

const ANALYSIS_TOOL = {
  name: "give_analysis",
  description: "Return a personal analysis for the learner.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2 to 3 sentences about how the project went." },
      strengths: { type: "array", items: { type: "string" }, description: "2 to 4 strengths." },
      improvements: { type: "array", items: { type: "string" }, description: "2 to 4 things to improve." },
      nextSteps: { type: "array", items: { type: "string" }, description: "2 to 3 concrete next steps." },
      courses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "A course id from the provided list." },
            reason: { type: "string", description: "One sentence on why this course helps." },
          },
          required: ["id", "reason"],
        },
      },
    },
    required: ["summary", "strengths", "improvements", "nextSteps", "courses"],
  },
};

// null / missing stays null (Number(null) would wrongly become 0). Scores are kept between 1 and 5.
const scoreOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : null;
};

function cleanInput(body) {
  const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
  return {
    project: {
      title: clip(body.project?.title, 200),
      field: clip(body.project?.field, 60),
      description: clip(body.project?.description, 1200),
    },
    results: list(body.criteriaResults, 12).map((r) => ({
      name: clip(r.name, 120),
      description: clip(r.description, 400),
      taskTitle: clip(r.taskTitle, 200),
      firstScore: scoreOrNull(r.firstScore),
      latestScore: scoreOrNull(r.latestScore),
      reviews: Number(r.reviews) || 0,
      latestComment: clip(r.latestComment, 500),
    })),
    contributions: list(body.contributions, 20).map((c) => ({
      description: clip(c.description, 300),
      hoursSpent: Number(c.hoursSpent) || 0,
    })),
    mentorFinal: body.mentorFinal
      ? {
          summary: clip(body.mentorFinal.summary, 1500),
          scores: list(body.mentorFinal.scores, 12).map((s) => ({
            name: clip(s.name, 120),
            score: scoreOrNull(s.score) ?? 0,
            comment: clip(s.comment, 300),
          })),
        }
      : null,
  };
}

function buildPrompt(input) {
  return [
    `Project: ${input.project.title} (${input.project.field})`,
    `Scenario: ${input.project.description}`,
    ``,
    `<evidence>`,
    `Criteria results (score out of 5, first review to latest review):`,
    ...input.results.map(
      (r) =>
        `* ${r.name} (task: ${r.taskTitle}): ${
          r.latestScore == null
            ? "not reviewed yet"
            : `${r.firstScore ?? r.latestScore} -> ${r.latestScore} after ${r.reviews} review(s). Comment: ${r.latestComment}`
        }`
    ),
    ``,
    `Learner's own contributions:`,
    ...(input.contributions.length
      ? input.contributions.map((c) => `* ${c.description} (${c.hoursSpent}h)`)
      : ["* none recorded"]),
    ``,
    input.mentorFinal
      ? `Mentor's final feedback: ${input.mentorFinal.summary}\n${input.mentorFinal.scores
          .map((s) => `* ${s.name}: ${s.score}/5 ${s.comment}`)
          .join("\n")}`
      : `Mentor's final feedback: not given yet`,
    `</evidence>`,
    ``,
    `Course list (choose ids only from this list):`,
    ...COURSES.map((c) => `* [${c.id}] ${c.title} (${c.field}, ${c.level})`),
  ].join("\n");
}

// Analysis built from the scores alone (used without an API key).
function simulatedAnalysis(input, reason) {
  const reviewed = input.results.filter((r) => r.latestScore != null);
  const strong = reviewed.filter((r) => r.latestScore >= 4);
  const weak = reviewed.filter((r) => r.latestScore <= 3);
  const notReviewed = input.results.filter((r) => r.latestScore == null);
  const average = reviewed.length
    ? reviewed.reduce((sum, r) => sum + r.latestScore, 0) / reviewed.length
    : 0;
  const improved = reviewed.filter((r) => r.firstScore != null && r.latestScore > r.firstScore);
  const hours = input.contributions.reduce((sum, c) => sum + c.hoursSpent, 0);

  const summary =
    `${reason === "error" ? "The AI service could not be reached, so this analysis is simulated from your scores. " : "This analysis is simulated from your scores because no Claude API key is set. "}` +
    (reviewed.length
      ? `Across ${reviewed.length} reviewed criteria your average is ${average.toFixed(1)} out of 5` +
        (improved.length ? `, and ${improved.length} improved after you revised your work.` : ".")
      : "You have no reviewed criteria yet.");

  const strengths = strong.map((r) => `${r.name}: scored ${r.latestScore}/5. ${r.latestComment || "Keep doing what you did here."}`);
  if (improved.length) strengths.push(`You improved your work after feedback (${improved.map((r) => r.name).join(", ")}). Acting on feedback is a key workplace skill.`);
  if (hours > 0) strengths.push(`You recorded ${hours} hour(s) of your own contribution, which makes your teamwork visible.`);
  if (!strengths.length) strengths.push("You started the project and put real work on the board.");

  const improvements = weak.map((r) => `${r.name}: scored ${r.latestScore}/5. ${r.latestComment || `Aim for this standard: ${r.description}`}`);
  notReviewed.forEach((r) => improvements.push(`${r.name}: not reviewed yet. Submit "${r.taskTitle}" and ask for feedback.`));
  if (!improvements.length) improvements.push("No weak spots in the reviewed criteria. Try a harder project next.");

  const nextSteps = weak.slice(0, 2).map((r) => `Revise "${r.taskTitle}" and check it against: ${r.description}`);
  if (input.mentorFinal) nextSteps.push("Pick one point from your mentor's final feedback and apply it in your next project.");
  nextSteps.push("Choose a new project in the same field, or a harder one, and repeat the cycle.");

  const fieldCourse = COURSES.find((c) => c.field === input.project.field);
  const general = COURSES.find((c) => c.id === "course_pm");
  const courses = [];
  if (fieldCourse) courses.push({ id: fieldCourse.id, reason: `Builds the core skills behind this ${input.project.field} project.` });
  if (general) courses.push({ id: general.id, reason: "Teamwork, planning and communication are used in every project." });

  return { summary, strengths, improvements, nextSteps: nextSteps.slice(0, 3), courses, simulated: true };
}

export async function POST(request) {
  const parsed = await readJson(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const body = parsed.body || {};
  if (!body.project || !Array.isArray(body.criteriaResults)) {
    return Response.json({ error: "Project and criteria results are required" }, { status: 400 });
  }
  const input = cleanInput(body);
  if (!input.results.some((r) => r.latestScore != null)) {
    return Response.json({ error: "Get feedback on at least one task first." }, { status: 400 });
  }

  if (!hasAI()) return Response.json(simulatedAnalysis(input, "no-key"));

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const message = await getClient().messages.create({
      model: getModel(),
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse) throw new Error("Claude did not return an analysis");

    const strings = (v, n) => (Array.isArray(v) ? v.map((s) => String(s)).filter(Boolean).slice(0, n) : []);
    const validIds = new Set(COURSES.map((c) => c.id));
    const seen = new Set();
    const courses = (Array.isArray(toolUse.input.courses) ? toolUse.input.courses : [])
      .filter((c) => validIds.has(c.id) && !seen.has(c.id) && seen.add(c.id))
      .slice(0, 3)
      .map((c) => ({ id: c.id, reason: String(c.reason || "") }));

    return Response.json({
      summary: String(toolUse.input.summary || ""),
      strengths: strings(toolUse.input.strengths, 4),
      improvements: strings(toolUse.input.improvements, 4),
      nextSteps: strings(toolUse.input.nextSteps, 3),
      courses,
      simulated: false,
    });
  } catch (error) {
    console.error("AI analysis failed, using simulated analysis:", error);
    return Response.json(simulatedAnalysis(input, "error"));
  }
}
