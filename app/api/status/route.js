// Tells the header whether real AI is switched on (an API key exists) or simulated.
// It never reveals the key itself.
import { hasAI } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ai: hasAI() });
}
