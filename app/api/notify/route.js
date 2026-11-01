// Email notifications: the browser calls this right after an action (see notify() in lib/notify.js).
// Needs FIREBASE_SERVICE_ACCOUNT (to check the action and find addresses) and a mail setup
// (see lib/server/mail.js). Without either, it does nothing and says why.
//
// An email only goes to people who switched email notifications on (the default) and whose
// address is verified (Google accounts are; email accounts after clicking the verification link).
import { headers } from "next/headers";
import { translator, LOCALES } from "@/lib/i18n";
import { adminAuth, adminDb, hasAdmin, readDoc, requestUser } from "@/lib/server/firebaseAdmin";
import { hasMail, renderEmail, sendMail } from "@/lib/server/mail";
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

async function siteUrl() {
  // Links in emails: SITE_URL if set, else the Vercel production address, else this request's host.
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
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

    // One email per event: the log entry can only be created once (it holds no personal data).
    try {
      await adminDb().collection("mailLog").doc(plan.key).create({ event, at: new Date().toISOString() });
    } catch (error) {
      if (error.code === 6) return Response.json({ sent: 0, duplicate: true }); // ALREADY_EXISTS
      throw error;
    }

    const base = await siteUrl();
    let sent = 0;
    for (const uid of [...new Set(plan.recipients)].filter((r) => r !== caller.uid)) {
      const [profile, account] = await Promise.all([
        readDoc("profiles", uid),
        adminAuth().getUser(uid).catch(() => null),
      ]);
      if (!account?.email || !account.emailVerified || profile?.emailNotifications === false) continue;
      const t = translator(LOCALES.includes(profile?.language) ? profile.language : "en");
      const { subject, lines, action } = plan.email(t);
      const { text, html } = renderEmail({
        subject,
        lines,
        action: { label: action.label, url: base + action.path },
        footer: t("You get this email because email notifications are on. Switch them off on your Account page: {url}", {
          url: `${base}/account`,
        }),
      });
      if (await sendMail({ to: account.email, subject, text, html })) sent += 1;
    }
    return Response.json({ sent });
  } catch (error) {
    console.error("Notification email failed:", error);
    return Response.json({ error: "The email could not be sent." }, { status: 500 });
  }
}
