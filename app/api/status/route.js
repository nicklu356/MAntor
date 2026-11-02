// Tells the app whether real AI is switched on or simulated, whether the server can use Firebase
// with full access, and whether email works. It never reveals the keys themselves: only the NAMES
// of missing settings and plain descriptions of problems, so an admin knows what to fix.
// It also checks that the server libraries for these features load, and reports the error if not.
import { hasAIKey, hasMailSetup, hasServiceAccount, missingSettings, settingProblems } from "@/lib/server/env";

export const dynamic = "force-dynamic";

async function loads(name, load) {
  try {
    await load();
    return null;
  } catch (error) {
    return `${name} failed to load: ${String(error?.message || error).slice(0, 200)}`;
  }
}

export async function GET() {
  const problems = settingProblems();
  const failures = await Promise.all([
    hasServiceAccount() ? loads("Firebase Admin", () => import("@/lib/server/firebaseAdmin")) : null,
    hasMailSetup() ? loads("Email", () => import("@/lib/server/mail")) : null,
  ]);
  problems.push(...failures.filter(Boolean));
  return Response.json(
    {
      ai: hasAIKey(),
      admin: hasServiceAccount(), // the server can save verified feedback and serve public portfolios
      mail: hasMailSetup(), // emails can be sent (SMTP or a test outbox is set up)
      missing: missingSettings(),
      problems,
      // Which deployment is running (Vercel sets this), to spot an old deployment.
      version: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
