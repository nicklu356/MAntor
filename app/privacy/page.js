// Privacy policy and terms of use, in plain language.
import Link from "next/link";
import { APP_NAME, CONTACT_EMAIL, REPOSITORY_URL, TEAM_NAME } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { MIN_AGE } from "@/lib/profile";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Privacy and terms") };
}

const UPDATED = "2026-11-01";

// [bold lead-in, text] pairs, so each section stays easy to translate.
const COLLECT = [
  ["Account:", "your email address and how you log in (password or Google). Passwords are handled by Firebase Authentication; we never see them."],
  ["Profile:", "first and last name, date of birth, education (level, school, field, graduation year) and, if you add one, a profile photo."],
  ["Your work:", "career assessment answers and result, team projects you join, submissions, contribution records, comments, help requests and the feedback you receive."],
  ["Mentors:", "the public name and company they give when applying, and the projects and feedback they write."],
];
const WHY = [
  "To run your account and your team projects.",
  "To match you with projects, review your work against mentors' criteria, and suggest next steps.",
  "To show your experience on a portfolio, only if you choose to publish it.",
  "To send email notifications you can switch off on your Account page.",
  "To keep the platform safe (for example, mentors are approved by an admin).",
];
const WHO = [
  ["Only you:", "your date of birth, email and private profile."],
  ["Your teammates:", "your name, photo and the work of your team."],
  ["Mentors:", "your work under an anonymous name (for example “Learner #A3F”). A mentor only learns your name and sees your photo if you accept their connection request."],
  ["Anyone with your public link:", "only if you publish your portfolio: your name, photo, education (not your date of birth), projects, verified scores and mentors' feedback. You can make it private again at any time."],
];
const SERVICES = [
  ["Google Firebase", "(Authentication and Firestore) stores your account and data."],
  ["Vercel", "hosts the website."],
  ["Anthropic (Claude)", "writes AI feedback, coaching, project drafts, summaries and analyses. It receives the text needed for the request (for example your submission and the mentor's criteria), not your name or email."],
  ["Email:", "if notifications are switched on, we send emails through our email provider to the address on your account."],
];
const RULES = [
  "Be respectful in teams and discussions, only submit work you are allowed to share, and do not put confidential company information into projects.",
  "Projects are realistic scenarios, not paid work. AI feedback and career suggestions are guidance and can be wrong; the career assessment is not a validated psychological test.",
  "{app} is a student prototype provided as is. We may change or end it; we will update this page when our practices change.",
];

function Bullets({ items, t }) {
  return (
    <ul className="bullets">
      {items.map((item) =>
        Array.isArray(item) ? (
          <li key={item[0]}>
            <strong>{t(item[0])}</strong> {t(item[1])}
          </li>
        ) : (
          <li key={item}>{t(item, { app: APP_NAME })}</li>
        )
      )}
    </ul>
  );
}

export default async function PrivacyPage() {
  const t = await getT();
  const contact = CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">
      {t("the project's GitHub page")}
    </a>
  );

  return (
    <div className="stack prose" style={{ maxWidth: 820 }}>
      <div>
        <div className="eyebrow">{t("Last updated {date}", { date: UPDATED })}</div>
        <h1>{t("Privacy and terms")}</h1>
        <p className="muted">
          {t(
            "{app} is a student project by {team}, started at the FEIT Hackathon 2026. This page explains, in plain language, what we collect, why, who can see it, and what you can do about it.",
            { app: APP_NAME, team: TEAM_NAME }
          )}{" "}
          {t("Questions:")} {contact}
        </p>
      </div>

      <section className="card">
        <h2>{t("What we collect")}</h2>
        <Bullets items={COLLECT} t={t} />
        <p className="small muted">
          {t(
            "We do not use advertising or tracking cookies. The site remembers a few settings in your browser (such as your language and which notifications you have read)."
          )}
        </p>
      </section>

      <section className="card">
        <h2>{t("Why we use it")}</h2>
        <Bullets items={WHY} t={t} />
      </section>

      <section className="card">
        <h2>{t("Who can see what")}</h2>
        <Bullets items={WHO} t={t} />
      </section>

      <section className="card">
        <h2>{t("Services we use")}</h2>
        <Bullets items={SERVICES} t={t} />
      </section>

      <section className="card">
        <h2>{t("Your choices")}</h2>
        <ul className="bullets">
          <li>
            <strong>{t("See and correct:")}</strong> {t("edit your details on your")}{" "}
            <Link href="/account">{t("Account")}</Link> {t("page.")}
          </li>
          <li>
            <strong>{t("Download:")}</strong>{" "}
            {t("“Download my data” on your Account page gives you a copy of what we store about you.")}
          </li>
          <li>
            <strong>{t("Delete:")}</strong>{" "}
            {t(
              "“Delete my account” removes your profile, photo, assessment, analyses, comments, contribution records, connections and login. Work you submitted for a team stays with that team without your name, because it belongs to the whole team."
            )}
          </li>
          <li>{t("We keep your data until you delete your account.")}</li>
        </ul>
      </section>

      <section className="card">
        <h2>{t("Using {app}", { app: APP_NAME })}</h2>
        <ul className="bullets">
          <li>{t("You need to be at least {age} years old.", { age: MIN_AGE })}</li>
          {RULES.map((rule) => (
            <li key={rule}>{t(rule, { app: APP_NAME })}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
