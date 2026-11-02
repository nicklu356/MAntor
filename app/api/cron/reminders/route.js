// Daily deadline reminders: emails each active team the day before its tasks are due.
// Vercel runs it every morning (see "crons" in vercel.json) and sends "Authorization: Bearer
// <CRON_SECRET>" by itself once CRON_SECRET is set in the project's environment variables.
// Needs FIREBASE_SERVICE_ACCOUNT and a mail setup (see lib/server/mail.js), like other emails.
import { APP_NAME } from "@/lib/config";
import { claimOnce, emailPeople, siteUrl } from "@/lib/server/deliver";
import { hasAdmin, readDoc, readWhere } from "@/lib/server/firebaseAdmin";
import { hasMail } from "@/lib/server/mail";
import { addDays } from "@/lib/schedule";

export const dynamic = "force-dynamic";

// "Tomorrow" in the team's part of the world (REMINDER_TIME_ZONE, Melbourne by default).
function todayIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!hasAdmin() || !hasMail()) return Response.json({ sent: 0, off: true });

  const tomorrow = addDays(todayIn(process.env.REMINDER_TIME_ZONE || "Australia/Melbourne"), 1);
  try {
    const due = (await readWhere("tasks", "dueDate", "==", tomorrow)).filter((task) => task.status !== "done");
    const byTeam = new Map();
    for (const task of due) byTeam.set(task.teamId, [...(byTeam.get(task.teamId) || []), task]);
    const base = await siteUrl();
    let sent = 0;
    for (const [teamId, tasks] of byTeam) {
      const team = await readDoc("teams", teamId);
      if (team?.status !== "active" || !(await claimOnce(`due_${teamId}_${tomorrow}`, "due"))) continue;
      const project = await readDoc("projects", team.projectId);
      sent += await emailPeople(
        team.memberIds,
        (t) => ({
          subject: t("Due tomorrow in “{project}”", { project: project?.title || APP_NAME }),
          lines: [
            ...tasks.map((task) => `• ${task.title}`),
            t("Finished already? Move it to Done on the board, so your team and mentor know."),
          ],
          action: { label: t("Open the board"), path: `/teams/${teamId}` },
        }),
        base
      );
    }
    return Response.json({ date: tomorrow, teams: byTeam.size, sent });
  } catch (error) {
    console.error("Deadline reminders failed:", error);
    return Response.json({ error: "Reminders failed." }, { status: 500 });
  }
}
