// Career assessment explanation: "why this field fits you".
// The score itself is calculated in the browser (lib/assessment.js).
// Without an API key, or if the AI call fails, a fixed explanation is returned.
import { FIELDS, FIELD_INFO, RIASEC } from "@/lib/assessment";
import { LOCALES, aiLanguage } from "@/lib/i18n";
import {
  DATA_RULE,
  askText,
  clip,
  hasAI,
  rateLimit,
  readJson,
  tooManyRequests,
} from "@/lib/server/ai";

const SYSTEM_PROMPT = `You explain career assessment results to beginners who are new to the workplace.
The assessment uses Holland's RIASEC interest types. Write 2 to 3 friendly sentences in plain English (no lists, no headings) that say why the recommended field fits this person, using the activities they liked as evidence, and how it relates to their second match.
Do not promise jobs or salaries. Do not mention percentages or scores.
${DATA_RULE}`;

export async function POST(request) {
  const parsed = await readJson(request, 20000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const { field, answers, runnerUp, hollandCode } = parsed.body || {};
  const locale = LOCALES.includes(parsed.body?.locale) ? parsed.body.locale : "en";
  if (!FIELDS.includes(field)) {
    return Response.json({ error: "Unknown career field" }, { status: 400 });
  }
  const fixed = { explanation: FIELD_INFO[field].blurb, simulated: true };

  if (!hasAI()) return Response.json(fixed);

  const limit = rateLimit(request);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const list = (v) => (Array.isArray(v) ? v.slice(0, 10).map((t) => `* ${clip(t, 160)}`) : []);
  const code = String(hollandCode || "")
    .split("")
    .filter((k) => RIASEC[k])
    .slice(0, 3);
  const evidence = [
    `Interest types (strongest first): ${code.map((k) => `${RIASEC[k].name} (${RIASEC[k].description})`).join("; ") || "unknown"}`,
    FIELDS.includes(runnerUp) ? `Second match: ${runnerUp}` : "",
    `Activities they liked:`,
    ...(list(answers?.liked).length ? list(answers.liked) : ["* none"]),
    `Activities they disliked:`,
    ...(list(answers?.disliked).length ? list(answers.disliked) : ["* none"]),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const text = await askText({
      system: `${SYSTEM_PROMPT}\n${aiLanguage(locale)}`,
      messages: [
        {
          role: "user",
          content: `Recommended field: ${field}\n\n<evidence>\n${evidence}\n</evidence>`,
        },
      ],
    });
    return Response.json({ explanation: text, simulated: false });
  } catch (error) {
    console.error("AI assessment explanation failed, using fixed text:", error);
    return Response.json(fixed);
  }
}
