// Mentors describe a workplace scenario; AI drafts the criteria and the tasks.
// The mentor then edits the draft before publishing, so the standard is still theirs.
// Without ANTHROPIC_API_KEY (or if the AI call fails), a template for the field is returned.
import { DIFFICULTIES, FIELDS, MAX_PROJECT_DESCRIPTION_CHARS } from "@/lib/config";
import { DATA_RULE, askJson, clip, hasAI, rateLimit, readJson, tooManyRequests } from "@/lib/server/ai";
import { fallbackDraft, normaliseDraft } from "@/lib/projectDraft";
import { LOCALES, aiLanguage, translator } from "@/lib/i18n";

const SYSTEM_PROMPT = `You help industry mentors turn a realistic workplace scenario into a team project for beginners.
Write 3 to 5 criteria: each is one industry standard a reviewer can check in the submitted work (name: 2 to 4 words, description: one sentence of what "good" looks like).
Write 3 to 6 tasks in the order a real team would do them. Each task has a short title, one or two sentences of instructions a beginner can act on, and the numbers of the criteria it is judged on (1 = first criterion).
Every criterion must be used by at least one task. The work must be doable in text or with free tools, without real company data.
${DATA_RULE}`;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, description: { type: "string" } },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          criteriaNumbers: { type: "array", items: { type: "integer" } },
        },
        required: ["title", "description", "criteriaNumbers"],
        additionalProperties: false,
      },
    },
  },
  required: ["criteria", "tasks"],
  additionalProperties: false,
};

export async function POST(request) {
  const parsed = await readJson(request, 10000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.body || {};

  const input = {
    title: clip(body.title, 200).trim(),
    field: FIELDS.includes(body.field) ? body.field : FIELDS[0],
    difficulty: DIFFICULTIES.includes(body.difficulty) ? body.difficulty : "beginner",
    description: clip(body.description, MAX_PROJECT_DESCRIPTION_CHARS).trim(),
    locale: LOCALES.includes(body.locale) ? body.locale : "en",
  };
  const t = translator(input.locale);
  if (!input.title || input.description.length < 30) {
    return Response.json(
      { error: "Write a title and a scenario of at least a couple of sentences first." },
      { status: 400 }
    );
  }

  if (!hasAI()) return Response.json(fallbackDraft(input, "no-key", t));

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const output = await askJson({
      system: `${SYSTEM_PROMPT}\n${aiLanguage(input.locale)}`,
      schema: DRAFT_SCHEMA,
      prompt: [
        `Field: ${input.field}`,
        `Difficulty: ${input.difficulty}`,
        `<notes>`,
        `Title: ${input.title}`,
        `Scenario: ${input.description}`,
        `</notes>`,
      ].join("\n"),
    });
    const draft = normaliseDraft(output);
    if (!draft) throw new Error("Claude returned an unusable draft");
    return Response.json({ ...draft, simulated: false });
  } catch (error) {
    console.error("AI project draft failed, using template:", error);
    return Response.json(fallbackDraft(input, "error", t));
  }
}
