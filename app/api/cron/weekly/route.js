// Monday email for mentors: the "Your week" summary of all their active teams.
// Run by Vercel Cron (see vercel.json) with "Authorization: Bearer <CRON_SECRET>".
// Needs FIREBASE_SERVICE_ACCOUNT and a mail setup; uses AI when ANTHROPIC_API_KEY is set.
import { LOCALES } from "@/lib/i18n";
import { claimOnce, emailPeople, siteUrl } from "@/lib/server/deliver";
import { hasAdmin, readDoc, readWhere } from "@/lib/server/firebaseAdmin";
import { hasMail } from "@/lib/server/mail";
import { writeSummary } from "@/lib/server/mentorSummary";
import { localDate } from "@/lib/schedule";
import { weekStats } from "@/lib/weeklySummary";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // one AI call per mentor

const LABEL = { on_track: "On track", needs_attention: "Needs attention", stuck: "Stuck" };

// Every active team of one mentor, with what weekStats() needs.
async function teamsOf(mentorId) {
  const projects = await readWhere("projects", "mentorId", "==", mentorId);
  const teams = [];
  for (const project of projects) {
    for (const team of await readWhere("teams", "projectId", "==", project.id)) {
      if (team.status !== "active") continue;
      const [tasks, feedback, comments, contributions] = await Promise.all([
        readWhere("tasks", "teamId", "==", team.id),
        readWhere("feedback", "teamId", "==", team.id),
        readWhere("comments", "teamId", "==", team.id),
        readWhere("contributions", "teamId", "==", team.id),
      ]);
      teams.push({ ...team, project, tasks, feedback, comments, contributions });
    }
  }
  return teams;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!hasAdmin() || !hasMail()) return Response.json({ sent: 0, off: true });

  try {
    const base = await siteUrl();
    const users = await readWhere("users", "role", "in", ["learner", "mentor"]);
    const anonymousName = (id) => users.find((u) => u.id === id)?.anonymousName || "Learner";
    let sent = 0;
    for (const mentor of users.filter((u) => u.role === "mentor")) {
      const teams = await teamsOf(mentor.id);
      if (!teams.length || !(await claimOnce(`weekly_${mentor.id}_${localDate()}`, "weekly"))) continue;
      const profile = await readDoc("profiles", mentor.id);
      const locale = LOCALES.includes(profile?.language) ? profile.language : "en";
      const stats = weekStats(teams, { anonymousName });
      const summary = await writeSummary(stats, locale);
      sent += await emailPeople(
        [mentor.id],
        (t) => ({
          subject: t("Your week as a mentor: {n} team(s)", { n: teams.length }),
          lines: [
            summary.overview,
            ...summary.teams.map((team) => {
              const facts = stats.teams.find((s) => s.teamId === team.teamId);
              return `${facts.project} (${t(LABEL[team.status])}): ${team.headline} ${t("Try:")} ${team.suggestion}`;
            }),
          ],
          action: { label: t("Open your teams"), path: "/" },
        }),
        base
      );
    }
    return Response.json({ sent });
  } catch (error) {
    console.error("Weekly mentor email failed:", error);
    return Response.json({ error: "Weekly email failed." }, { status: 500 });
  }
}
