// "Your week" card on the mentor's home page. The browser sends the week's facts (anonymous names
// only); see lib/server/mentorSummary.js for how the summary is written.
import { LOCALES } from "@/lib/i18n";
import { hasAI, rateLimit, readJson, tooManyRequests } from "@/lib/server/ai";
import { writeSummary } from "@/lib/server/mentorSummary";

export async function POST(request) {
  const parsed = await readJson(request, 40000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  const locale = LOCALES.includes(parsed.body?.locale) ? parsed.body.locale : "en";
  if (hasAI()) {
    const limit = rateLimit(request);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);
  }
  return Response.json(await writeSummary(parsed.body?.stats, locale));
}
