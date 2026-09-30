// AI task feedback.
// The browser sends the task, the submission, and the mentor's criteria.
// Claude scores the submission against each criterion and returns structured feedback.
// Without ANTHROPIC_API_KEY (or if the AI call fails), a simulated response is returned
// so the demo never breaks.
import { MAX_SUBMISSION_CHARS } from "@/lib/config";
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

const SYSTEM_PROMPT = `You are a supportive industry mentor reviewing work from a beginner learner on a project-based learning platform.
Score the submission ONLY against the mentor's criteria provided.
For each criterion give a score from 1 to 5 (1 = not shown, 3 = partly meets, 5 = fully meets) and one specific, actionable comment.
Be encouraging but honest. Point to what is in the submission. Never invent work that is not there.
Write in plain English that a beginner understands.
${DATA_RULE}`;

const FEEDBACK_TOOL = {
  name: "give_feedback",
  description: "Return structured feedback on the learner's submission.",
  input_schema: {
    type: "object",
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            criteriaId: { type: "string" },
            score: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string" },
          },
          required: ["criteriaId", "score", "comment"],
        },
      },
      summary: {
        type: "string",
        description: "2 to 3 sentences: what went well and the single most useful next step.",
      },
    },
    required: ["scores", "summary"],
  },
};

function buildPrompt({ project, task, submission, contributions, criteria }) {
  return [
    `Project: ${project.title}`,
    `Project scenario: ${project.description}`,
    ``,
    `Task: ${task.title}`,
    `Task instructions: ${task.description}`,
    ``,
    `Mentor's criteria for this task:`,
    ...criteria.map((c) => `* [${c.id}] ${c.name}: ${c.description}`),
    ``,
    `<contributions>`,
    ...(contributions.length
      ? contributions.map((c) => `* ${c.description} (${c.hoursSpent}h)`)
      : ["* none recorded"]),
    `</contributions>`,
    ``,
    `<submission>`,
    submission.content,
    `</submission>`,
  ].join("\n");
}

function simulatedFeedback({ criteria, submission }, reason) {
  const length = submission.content.trim().length;
  const score = Math.max(2, Math.min(4, Math.round(length / 120) + 2));
  const why =
    reason === "error"
      ? "The AI service could not be reached, so this is simulated feedback."
      : "This is simulated feedback because no Claude API key is set. Add ANTHROPIC_API_KEY to .env.local to get real AI feedback.";
  return {
    scores: criteria.map((c) => ({
      criteriaId: c.id,
      score,
      comment: `Check your work against this standard: "${c.description}" Add specific evidence that shows you met it.`,
    })),
    summary: `${why} Longer, more specific submissions score higher in the simulation.`,
    simulated: true,
  };
}

export async function POST(request) {
  const parsed = await readJson(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const { project, task, submission } = parsed.body || {};
  if (!project || !task || !submission?.content) {
    return Response.json({ error: "Project, task and submission are required" }, { status: 400 });
  }
  if (!Array.isArray(project.criteria) || !Array.isArray(task.criteriaIds)) {
    return Response.json({ error: "Project criteria and task criteria are required" }, { status: 400 });
  }
  if (String(submission.content).length > MAX_SUBMISSION_CHARS) {
    return Response.json(
      { error: `Submission is too long (max ${MAX_SUBMISSION_CHARS} characters).` },
      { status: 413 }
    );
  }

  const criteria = project.criteria
    .filter((c) => task.criteriaIds.includes(c.id))
    .map((c) => ({ id: clip(c.id, 40), name: clip(c.name, 120), description: clip(c.description, 400) }));
  if (!criteria.length) {
    return Response.json({ error: "This task has no criteria to review against" }, { status: 400 });
  }

  const input = {
    project: { title: clip(project.title, 200), description: clip(project.description, 1200) },
    task: { title: clip(task.title, 200), description: clip(task.description, 800) },
    submission: { content: clip(submission.content, MAX_SUBMISSION_CHARS) },
    contributions: (Array.isArray(parsed.body.contributions) ? parsed.body.contributions : [])
      .slice(0, 20)
      .map((c) => ({ description: clip(c.description, 300), hoursSpent: Number(c.hoursSpent) || 0 })),
    criteria,
  };

  if (!hasAI()) return Response.json(simulatedFeedback(input, "no-key"));

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const message = await getClient().messages.create({
      model: getModel(),
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [FEEDBACK_TOOL],
      tool_choice: { type: "tool", name: FEEDBACK_TOOL.name },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse) throw new Error("Claude did not return feedback");

    const validIds = new Set(criteria.map((c) => c.id));
    const scores = (toolUse.input.scores || [])
      .filter((s) => validIds.has(s.criteriaId))
      .map((s) => ({
        criteriaId: s.criteriaId,
        score: Math.max(1, Math.min(5, Math.round(Number(s.score) || 1))),
        comment: String(s.comment || ""),
      }));
    if (!scores.length) throw new Error("Claude returned no usable scores");

    return Response.json({ scores, summary: String(toolUse.input.summary || ""), simulated: false });
  } catch (error) {
    console.error("AI feedback failed, using simulated feedback:", error);
    return Response.json(simulatedFeedback(input, "error"));
  }
}
