// Which server settings exist (server only). No imports on purpose: /api/status must keep working
// even if a feature's library fails to load, so it can say what is wrong.
const set = (name) => Boolean(String(process.env[name] || "").trim());

export const hasAIKey = () => set("ANTHROPIC_API_KEY");
export const hasServiceAccount = () => set("FIREBASE_SERVICE_ACCOUNT") || set("FIRESTORE_EMULATOR_HOST");
export const hasMailSetup = () => set("MAIL_OUTBOX") || (set("SMTP_HOST") && set("SMTP_USER") && set("SMTP_PASS"));

// Names (never values) of the optional server settings that are missing.
export function missingSettings() {
  const missing = [];
  if (!hasAIKey()) missing.push("ANTHROPIC_API_KEY");
  if (!hasServiceAccount()) missing.push("FIREBASE_SERVICE_ACCOUNT");
  if (!set("MAIL_OUTBOX")) for (const name of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) if (!set(name)) missing.push(name);
  if (!set("CRON_SECRET")) missing.push("CRON_SECRET");
  return missing;
}

// Settings that exist but cannot work as they are (described without revealing them).
export function settingProblems() {
  const problems = [];
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (raw) {
    try {
      const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
      const account = JSON.parse(text);
      if (!account.private_key || !account.client_email) {
        problems.push("FIREBASE_SERVICE_ACCOUNT is JSON but has no private_key or client_email: paste the whole key file.");
      }
      const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (project && account.project_id && account.project_id !== project.trim()) {
        problems.push(`FIREBASE_SERVICE_ACCOUNT is for project "${account.project_id}", but the site uses "${project.trim()}".`);
      }
    } catch {
      problems.push("FIREBASE_SERVICE_ACCOUNT is not valid JSON: paste the whole key file, from { to }.");
    }
  }
  const port = String(process.env.SMTP_PORT || "").trim();
  if (port && !/^\d+$/.test(port)) problems.push("SMTP_PORT should be a number such as 465.");
  const site = String(process.env.SITE_URL || "").trim();
  if (site && /\s/.test(site)) problems.push("SITE_URL contains spaces.");
  return problems;
}
