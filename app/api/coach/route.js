// "Ask the AI coach": a learner chats about the task they are working on.
// The coach gives hints and asks questions, but never writes the deliverable for them,
// because the point of the platform is to learn by doing.
// Without ANTHROPIC_API_KEY (or if the AI call fails), a simulated hint is returned.
import { MAX_COACH_MESSAGE_CHARS, MAX_SUBMISSION_CHARS } from "@/lib/config";
import { DATA_RULE, askText, clip, hasAI, rateLimit, readJson, tooManyRequests } from "@/lib/server/ai";
import { LOCALES, aiLanguage, translator } from "@/lib/i18n";

const MAX_TURNS = 12;

function systemPrompt(input) {
  return [
    `You are a friendly industry mentor coaching a beginner on a project-based learning platform.`,
    `Help the learner do the task THEMSELVES: explain ideas, ask guiding questions, suggest how to approach it, and point out what the mentor's criteria expect.`,
    `Never write the finished deliverable for them (no complete problem statements, reports, designs or code solutions). Short examples of a technique are fine.`,
    `Keep answers under 150 words, in plain language, with at most 3 short bullet points.`,
    aiLanguage(input.locale),
    `If they ask for something unrelated to the project, gently bring them back to the task.`,
    DATA_RULE,
    ``,
    `Project: ${input.project.title}`,
    `Scenario: ${input.project.description}`,
    `Task: ${input.task.title}`,
    `Task instructions: ${input.task.description}`,
    `Mentor's criteria for this task:`,
    ...input.criteria.map((c) => `* ${c.name}: ${c.description}`),
    ``,
    `<notes>`,
    input.draft ? `The team's current draft:\n${input.draft}` : "The team has not written a draft yet.",
    `</notes>`,
  ].join("\n");
}

// A rule-based hint, so the coach still feels useful without an API key.
function simulatedReply(input, reason) {
  const t = translator(input.locale);
  const last = input.messages[input.messages.length - 1]?.content.toLowerCase() || "";
  const turn = input.messages.filter((m) => m.role === "user").length;
  const criterion = input.criteria[(turn - 1) % Math.max(1, input.criteria.length)];
  const prefix =
    reason === "error"
      ? t("(Simulated: the AI service could not be reached.)")
      : t("(Simulated coach: add ANTHROPIC_API_KEY for real answers.)");
  const vars = { name: criterion?.name, expects: criterion?.description };

  let body;
  if (/start|begin|where|how do i|stuck|開始|從哪|卡住|怎麼/.test(last)) {
    body = t(
      'Start small: re-read the task, then write down 3 questions you need answered to do it well. For "{name}", the mentor expects: {expects} What evidence could show that?',
      vars
    );
  } else if (/check|good|enough|review|ready|檢查|夠好|夠了|準備好/.test(last)) {
    body = input.draft
      ? t(
          'Compare your draft with each criterion, one at a time. For "{name}", find the exact sentence that proves it. If you can\'t point to one, that is what to add next. Then ask for AI feedback.',
          vars
        )
      : t(
          'Write a first rough draft before polishing. A rough draft you can improve beats a blank page. Then check it against "{name}".',
          vars
        );
  } else {
    body = t(
      'Good question. Think about it through the mentor\'s eyes: "{name}" means: {expects} What is one concrete thing you could add or change to show that?',
      vars
    );
  }
  return { reply: `${prefix} ${body}`, simulated: true };
}

export async function POST(request) {
  const parsed = await readJson(request, 40000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.body || {};

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: clip(m.content, m.role === "user" ? MAX_COACH_MESSAGE_CHARS : 2000) }));
  // The conversation must start with the learner.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (!body.task?.title) return Response.json({ error: "Task is required" }, { status: 400 });

  const input = {
    project: { title: clip(body.project?.title, 200), description: clip(body.project?.description, 1200) },
    task: { title: clip(body.task.title, 200), description: clip(body.task.description, 800) },
    criteria: (Array.isArray(body.criteria) ? body.criteria : [])
      .slice(0, 8)
      .map((c) => ({ name: clip(c.name, 120), description: clip(c.description, 400) })),
    draft: clip(body.draft, MAX_SUBMISSION_CHARS),
    locale: LOCALES.includes(body.locale) ? body.locale : "en",
    messages,
  };

  if (!hasAI()) return Response.json(simulatedReply(input, "no-key"));

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const reply = await askText({ system: systemPrompt(input), messages: input.messages });
    return Response.json({ reply, simulated: false });
  } catch (error) {
    console.error("AI coach failed, using simulated reply:", error);
    return Response.json(simulatedReply(input, "error"));
  }
}
