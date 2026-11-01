// Privacy policy and terms of use, in plain language.
import Link from "next/link";
import { APP_NAME, CONTACT_EMAIL, REPOSITORY_URL, TEAM_NAME } from "@/lib/config";
import { MIN_AGE } from "@/lib/profile";

export const metadata = { title: "Privacy and terms" };

const UPDATED = "1 November 2026";

export default function PrivacyPage() {
  const contact = CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">
      the project&apos;s GitHub page
    </a>
  );

  return (
    <div className="stack prose" style={{ maxWidth: 820 }}>
      <div>
        <div className="eyebrow">Last updated {UPDATED}</div>
        <h1>Privacy and terms</h1>
        <p className="muted">
          {APP_NAME} is a student project by {TEAM_NAME}, started at the FEIT Hackathon 2026. This page explains, in plain
          language, what we collect, why, who can see it, and what you can do about it. Questions: {contact}.
        </p>
      </div>

      <section className="card">
        <h2>What we collect</h2>
        <ul className="bullets">
          <li>
            <strong>Account:</strong> your email address and how you log in (password or Google). Passwords are handled by
            Firebase Authentication; we never see them.
          </li>
          <li>
            <strong>Profile:</strong> first and last name, date of birth, education (level, school, field, graduation year)
            and, if you add one, a profile photo.
          </li>
          <li>
            <strong>Your work:</strong> career assessment answers and result, team projects you join, submissions,
            contribution records, comments, help requests and the feedback you receive.
          </li>
          <li>
            <strong>Mentors:</strong> the public name and company they give when applying, and the projects and feedback
            they write.
          </li>
        </ul>
        <p className="small muted">
          We do not use advertising or tracking cookies. The site remembers a few settings in your browser (such as which
          notifications you have read).
        </p>
      </section>

      <section className="card">
        <h2>Why we use it</h2>
        <ul className="bullets">
          <li>To run your account and your team projects.</li>
          <li>To match you with projects, review your work against mentors&apos; criteria, and suggest next steps.</li>
          <li>To show your experience on a portfolio, only if you choose to publish it.</li>
          <li>To keep the platform safe (for example, mentors are approved by an admin).</li>
        </ul>
      </section>

      <section className="card">
        <h2>Who can see what</h2>
        <ul className="bullets">
          <li>
            <strong>Only you:</strong> your date of birth, email and private profile.
          </li>
          <li>
            <strong>Your teammates:</strong> your name, photo and the work of your team.
          </li>
          <li>
            <strong>Mentors:</strong> your work under an anonymous name (for example “Learner #A3F”). A mentor only learns
            your name and sees your photo if you accept their connection request.
          </li>
          <li>
            <strong>Anyone with your public link:</strong> only if you publish your portfolio: your name, photo,
            education (not your date of birth), projects, verified scores and mentors&apos; feedback. You can make it
            private again at any time.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Services we use</h2>
        <ul className="bullets">
          <li>
            <strong>Google Firebase</strong> (Authentication and Firestore) stores your account and data.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website.
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> writes AI feedback, coaching, project drafts and analyses. It receives the
            text needed for the request (for example your submission and the mentor&apos;s criteria), not your name or
            email.
          </li>
          <li>
            <strong>Email:</strong> if notifications are switched on, we send emails through our email provider to the
            address on your account.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Your choices</h2>
        <ul className="bullets">
          <li>
            <strong>See and correct:</strong> edit your details on your <Link href="/account">Account</Link> page.
          </li>
          <li>
            <strong>Download:</strong> “Download my data” on your Account page gives you a copy of what we store about you.
          </li>
          <li>
            <strong>Delete:</strong> “Delete my account” removes your profile, photo, assessment, analyses, comments,
            contribution records, connections and login. Work you submitted for a team stays with that team without your
            name, because it belongs to the whole team.
          </li>
          <li>We keep your data until you delete your account.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Using {APP_NAME}</h2>
        <ul className="bullets">
          <li>You need to be at least {MIN_AGE} years old.</li>
          <li>
            Be respectful in teams and discussions, only submit work you are allowed to share, and do not put
            confidential company information into projects.
          </li>
          <li>
            Projects are realistic scenarios, not paid work. AI feedback and career suggestions are guidance and can be
            wrong; the career assessment is not a validated psychological test.
          </li>
          <li>
            {APP_NAME} is a student prototype provided as is. We may change or end it; we will update this page when our
            practices change.
          </li>
        </ul>
      </section>
    </div>
  );
}
