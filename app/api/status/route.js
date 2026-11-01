// Tells the app whether real AI is switched on (an API key exists) or simulated, and whether the
// server can use Firebase with full access. It never reveals the keys themselves.
import { hasAI } from "@/lib/server/ai";
import { hasAdmin } from "@/lib/server/firebaseAdmin";
import { hasMail } from "@/lib/server/mail";

export const dynamic = "force-dynamic";

export function GET() {
  // admin: the server can save verified feedback and serve public portfolios.
  // mail: emails can be sent (SMTP or a test outbox is set up).
  return Response.json({ ai: hasAI(), admin: hasAdmin(), mail: hasMail() });
}
