// Tells the app whether real AI is switched on (an API key exists) or simulated, whether the
// server can use Firebase with full access, and whether email works. It never reveals the keys
// themselves: only the NAMES of server settings that are missing, so an admin knows what to add.
import { hasAI } from "@/lib/server/ai";
import { hasAdmin } from "@/lib/server/firebaseAdmin";
import { hasMail } from "@/lib/server/mail";

export const dynamic = "force-dynamic";

export function GET() {
  const missing = [];
  if (!hasAdmin()) missing.push("FIREBASE_SERVICE_ACCOUNT");
  if (!process.env.MAIL_OUTBOX) {
    for (const name of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) if (!process.env[name]?.trim()) missing.push(name);
  }
  if (!process.env.CRON_SECRET) missing.push("CRON_SECRET");
  return Response.json({
    ai: hasAI(),
    admin: hasAdmin(), // the server can save verified feedback and serve public portfolios
    mail: hasMail(), // emails can be sent (SMTP or a test outbox is set up)
    missing,
    // Which deployment is running (Vercel sets this), to spot an old deployment.
    version: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local",
  });
}
