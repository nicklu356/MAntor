// Sends email (server only). Three ways, chosen by environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM   a real mail server (for example Gmail
//                                                           with an app password, Resend, SendGrid)
//   MAIL_OUTBOX=<file>                                      write each email as one JSON line to a
//                                                           file instead (tests and local trials)
//   neither                                                 email is switched off; nothing is sent
// Never give these NEXT_PUBLIC_ names: the password must stay on the server.
import { appendFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { APP_NAME } from "@/lib/config";

const smtpReady = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const hasMail = () => Boolean(process.env.MAIL_OUTBOX || smtpReady());

let transport = null;
function smtp() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 587 upgrades to TLS with STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// A short, plain email: the subject as a heading, a few lines, one button, and a footer saying
// how to switch it off.
export function renderEmail({ subject, lines, action, footer }) {
  const text = [subject, "", ...lines, "", `${action.label}: ${action.url}`, "", "—", footer].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1d2642">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<div style="font-weight:bold;font-size:20px;color:#e8a05c;margin-bottom:16px">${escapeHtml(APP_NAME)}</div>
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>
${lines.map((line) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(line)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${escapeHtml(action.url)}" style="background:#1d2642;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(action.label)}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">${escapeHtml(footer)}</p>
</div></body></html>`;
  return { text, html };
}

// Sends one email. Returns true if it was handed to the mail server (or written to the outbox).
export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || `${APP_NAME} <${process.env.SMTP_USER || "no-reply@localhost"}>`;
  if (process.env.MAIL_OUTBOX) {
    await appendFile(process.env.MAIL_OUTBOX, JSON.stringify({ from, to, subject, text, html, at: new Date().toISOString() }) + "\n");
    return true;
  }
  if (!smtpReady()) return false;
  await smtp().sendMail({ from, to, subject, text, html });
  return true;
}
