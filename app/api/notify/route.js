// Email notifications: the browser calls this right after an action (see notify() in lib/notify.js).
// Needs FIREBASE_SERVICE_ACCOUNT (to check the action and find addresses) and a mail setup
// (see lib/server/mail.js). Without either, it does nothing and says why.
//
// An email only goes to people who switched email notifications on (the default) and whose
// address is verified (Google accounts are; email accounts after clicking the verification link).
import { claimOnce, emailPeople, siteUrl } from "@/lib/server/deliver";
import { hasAdmin, requestUser } from "@/lib/server/firebaseAdmin";
import { hasMail } from "@/lib/server/mail";
import { EVENTS, planEmails } from "@/lib/server/notifyEvents";
import { readJson } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

// Per person: at most 30 notify calls in 10 minutes (each sends at most one email per recipient).
const calls = new Map();
function tooMany(uid) {
  const now = Date.now();
  const recent = (calls.get(uid) || []).filter((at) => now - at < 10 * 60 * 1000);
  recent.push(now);
  calls.set(uid, recent);
  if (calls.size > 5000) calls.clear();
  return recent.length > 30;
}

export async function POST(request) {
  if (!hasAdmin() || !hasMail()) {
    return Response.json({ sent: 0, off: true, reason: !hasAdmin() ? "no FIREBASE_SERVICE_ACCOUNT" : "no mail setup" });
  }
  const parsed = await readJson(request, 500);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  const { event, id } = parsed.body || {};
  if (!EVENTS.includes(event) || typeof id !== "string" || !id || id.length > 200 || id.includes("/")) {
    return Response.json({ error: "Unknown event." }, { status: 400 });
  }
  const caller = await requestUser(request);
  if (!caller) return Response.json({ error: "Please log in." }, { status: 401 });
  if (tooMany(caller.uid)) return Response.json({ error: "Too many notifications. Try again later." }, { status: 429 });

  try {
    const plan = await planEmails(event, id, caller.uid);
    if (plan.error) return Response.json({ error: plan.error }, { status: plan.status });

    if (!(await claimOnce(plan.key, event))) return Response.json({ sent: 0, duplicate: true });
    const recipients = plan.recipients.filter((uid) => uid !== caller.uid);
    const sent = await emailPeople(recipients, plan.email, await siteUrl());
    return Response.json({ sent });
  } catch (error) {
    console.error("Notification email failed:", error);
    return Response.json({ error: "The email could not be sent." }, { status: 500 });
  }
}
