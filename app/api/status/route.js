// Tells the app whether real AI is switched on (an API key exists) or simulated, and whether the
// server can use Firebase with full access. It never reveals the keys themselves.
import { hasAI } from "@/lib/server/ai";
import { hasAdmin } from "@/lib/server/firebaseAdmin";

export const dynamic = "force-dynamic";

export function GET() {
  // admin: the server can save verified feedback and serve public portfolios.
  return Response.json({ ai: hasAI(), admin: hasAdmin() });
}
