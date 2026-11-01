// AI task feedback.
// Claude scores the submission against each of the mentor's criteria and returns structured feedback.
// - Real accounts with FIREBASE_SERVICE_ACCOUNT: the browser sends only the task id and its login
//   token; the server reads everything from Firestore and saves the review as `verified`.
// - Otherwise (demo, or no service account): the browser sends the task, submission and criteria,
//   and saves the review itself.
// Without ANTHROPIC_API_KEY (or if the AI call fails), a simulated response is returned
// so the demo never breaks.
import { MAX_SUBMISSION_CHARS } from "@/lib/config";
import {
  DATA_RULE,
  askJson,
  clip,
  hasAI,
  rateLimit,
  readJson,
  tooManyRequests,
} from "@/lib/server/ai";
import { adminDb, hasAdmin, readDoc, readWhere, requestUser } from "@/lib/server/firebaseAdmin";

const SYSTEM_PROMPT = `You are a supportive industry mentor reviewing work from a beginner learner on a project-based learning platform.
Score the submission ONLY against the mentor's criteria provided.
For each criterion give a score from 1 to 5 (1 = not shown, 3 = partly meets, 5 = fully meets) and one specific, actionable comment.
Be encouraging but honest. Point to what is in the submission. Never invent work that is not there.
Write in plain English that a beginner understands.
${DATA_RULE}`;

// Structured output: Claude must answer with exactly this JSON shape.
const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criteriaId: { type: "string" },
          score: { type: "integer", description: "1 to 5" },
          comment: { type: "string" },
        },
        required: ["criteriaId", "score", "comment"],
        additionalProperties: false,
      },
    },
    summary: {
      type: "string",
      description: "2 to 3 sentences: what went well and the single most useful next step.",
    },
  },
  required: ["scores", "summary"],
  additionalProperties: false,
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

// Turns a project, task, submission and contributions into the prompt input, or an error.
function buildInput({ project, task, submission, contributions }) {
  if (!project || !task || !submission?.content) {
    return { error: "Project, task and submission are required", status: 400 };
  }
  if (!Array.isArray(project.criteria) || !Array.isArray(task.criteriaIds)) {
    return { error: "Project criteria and task criteria are required", status: 400 };
  }
  if (String(submission.content).length > MAX_SUBMISSION_CHARS) {
    return { error: `Submission is too long (max ${MAX_SUBMISSION_CHARS} characters).`, status: 413 };
  }
  const criteria = project.criteria
    .filter((c) => task.criteriaIds.includes(c.id))
    .map((c) => ({ id: clip(c.id, 40), name: clip(c.name, 120), description: clip(c.description, 400) }));
  if (!criteria.length) return { error: "This task has no criteria to review against", status: 400 };
  return {
    input: {
      project: { title: clip(project.title, 200), description: clip(project.description, 1200) },
      task: { title: clip(task.title, 200), description: clip(task.description, 800) },
      submission: { content: clip(submission.content, MAX_SUBMISSION_CHARS) },
      contributions: (Array.isArray(contributions) ? contributions : [])
        .slice(0, 20)
        .map((c) => ({ description: clip(c.description, 300), hoursSpent: Number(c.hoursSpent) || 0 })),
      criteria,
    },
  };
}

// Claude's review, or the simulated one without a key or when the AI call fails.
async function review(input) {
  if (!hasAI()) return simulatedFeedback(input, "no-key");
  try {
    const output = await askJson({ system: SYSTEM_PROMPT, prompt: buildPrompt(input), schema: FEEDBACK_SCHEMA });
    const validIds = new Set(input.criteria.map((c) => c.id));
    const scores = (output.scores || [])
      .filter((s) => validIds.has(s.criteriaId))
      .map((s) => ({
        criteriaId: s.criteriaId,
        score: Math.max(1, Math.min(5, Math.round(Number(s.score) || 1))),
        comment: String(s.comment || ""),
      }));
    if (!scores.length) throw new Error("Claude returned no usable scores");
    return { scores, summary: String(output.summary || ""), simulated: false };
  } catch (error) {
    console.error("AI feedback failed, using simulated feedback:", error);
    return simulatedFeedback(input, "error");
  }
}

// Real accounts with FIREBASE_SERVICE_ACCOUNT set: the server reads the task from Firestore itself,
// checks the caller is in the team, and saves the review marked `verified`. Nothing the browser
// sends can change the scores.
async function reviewAndSave(request, taskId) {
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  const task = await readDoc("tasks", String(taskId));
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  const team = await readDoc("teams", task.teamId);
  if (!team?.memberIds?.includes(user.uid)) {
    return Response.json({ error: "Only members of this team can ask for feedback." }, { status: 403 });
  }
  const [project, contributions] = await Promise.all([
    readDoc("projects", task.projectId),
    readWhere("contributions", "taskId", "==", task.id),
  ]);
  const built = buildInput({ project, task, submission: task.submission, contributions });
  if (built.error) return Response.json({ error: built.error }, { status: built.status });

  if (hasAI()) {
    const limit = rateLimit(request);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);
  }
  const result = await review(built.input);
  const id = `fb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const record = {
    taskId: task.id,
    teamId: task.teamId,
    source: "ai",
    kind: "task",
    authorId: null,
    requestedBy: user.uid,
    scores: result.scores,
    summary: result.summary,
    simulated: Boolean(result.simulated),
    sample: false,
    verified: true,
    createdAt: new Date().toISOString(),
  };
  await adminDb().collection("feedback").doc(id).set(record);
  return Response.json({ ...record, id, saved: true });
}

export async function POST(request) {
  const parsed = await readJson(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.body || {};

  if (body.taskId && hasAdmin() && request.headers.get("authorization")) {
    try {
      return await reviewAndSave(request, body.taskId);
    } catch (error) {
      console.error("Saving verified feedback failed:", error);
      return Response.json({ error: "The review could not be saved. Please try again." }, { status: 500 });
    }
  }

  // Demo, or no service account: review what the browser sent; the browser saves it (unverified).
  const built = buildInput(body);
  if (built.error) return Response.json({ error: built.error }, { status: built.status });
  if (hasAI()) {
    const limit = rateLimit(request);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);
  }
  return Response.json(await review(built.input));
}
