// Emails a list of people (server only): only those with a verified address who have not switched
// email notifications off, each in the language they use on the site. Used by the notify route
// (after an action) and the daily deadline reminders.
import { headers } from "next/headers";
import { LOCALES, translator } from "@/lib/i18n";
import { adminAuth, adminDb, readDoc } from "@/lib/server/firebaseAdmin";
import { renderEmail, sendMail } from "@/lib/server/mail";

// Links in emails: SITE_URL if set, else the Vercel production address, else this request's host.
export async function siteUrl() {
  const configured = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  // "m-antor.vercel.app" works too: https:// is added when it is missing.
  if (configured) return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// One email per key, ever: the log entry can only be created once (it holds no personal data).
// Returns false if this key was already emailed.
export async function claimOnce(key, event) {
  try {
    await adminDb().collection("mailLog").doc(key).create({ event, at: new Date().toISOString() });
    return true;
  } catch (error) {
    if (error.code === 6) return false; // ALREADY_EXISTS
    throw error;
  }
}

// email(t) => { subject, lines, action: { label, path } }. Returns how many emails were sent.
export async function emailPeople(uids, email, base) {
  let sent = 0;
  for (const uid of [...new Set(uids)]) {
    const [profile, account] = await Promise.all([readDoc("profiles", uid), adminAuth().getUser(uid).catch(() => null)]);
    if (!account?.email || !account.emailVerified || profile?.emailNotifications === false) continue;
    const t = translator(LOCALES.includes(profile?.language) ? profile.language : "en");
    const { subject, lines, action } = email(t);
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
  return sent;
}
