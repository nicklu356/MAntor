// Career assessment explanation: "why this field fits you".
// The score itself is calculated in the browser (lib/assessment.js).
// Without an API key, or if the AI call fails, a fixed explanation is returned.
import { FIELDS, FIELD_INFO } from "@/lib/assessment";
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

const SYSTEM_PROMPT = `You explain career assessment results to beginners who are new to the workplace.
Write 2 to 3 friendly sentences in plain English (no lists, no headings) that say why the given field fits this person, using their own answers as evidence.
Do not promise jobs or salaries. Do not mention scores.
${DATA_RULE}`;

export async function POST(request) {
  const parsed = await readJson(request, 20000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const { field, answers } = parsed.body || {};
  if (!FIELDS.includes(field)) {
    return Response.json({ error: "Unknown career field" }, { status: 400 });
  }
  const fixed = { explanation: FIELD_INFO[field].blurb, simulated: true };

  if (!hasAI()) return Response.json(fixed);

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const evidence = (Array.isArray(answers) ? answers : [])
    .slice(0, 12)
    .map((a) => `* Q: ${clip(a.question, 200)}\n  A: ${clip(a.answer, 200)}`)
    .join("\n");

  try {
    const message = await getClient().messages.create({
      model: getModel(),
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Recommended field: ${field}\n\n<evidence>\n${evidence}\n</evidence>`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!text) throw new Error("Empty explanation");
    return Response.json({ explanation: text, simulated: false });
  } catch (error) {
    console.error("AI assessment explanation failed, using fixed text:", error);
    return Response.json(fixed);
  }
}
