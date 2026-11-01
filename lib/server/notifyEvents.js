// Email notifications (server only). The browser says "I just did X" (an event and a record id);
// the server checks the record really exists and that this person really did it, then decides who
// hears about it. So nobody can use it to send email to people of their choice.
//
// Who gets an email:
//   comment        teammates of the person who wrote it (the mentor's comments go to the whole team)
//   help           the project's mentor, when a learner asks for help on a task
//   final          the team, when the mentor gives final feedback
//   connection     the learner, when a mentor would like to know who they are
//   mentorRequest  the admins, when someone applies to be a mentor
//   mentorDecision the applicant, when an admin approves or declines
// Mentors only ever see a learner's anonymous name, in email too.
import { APP_NAME } from "@/lib/config";
import { readDoc, readWhere } from "@/lib/server/firebaseAdmin";

export const EVENTS = ["comment", "help", "final", "connection", "mentorRequest", "mentorDecision"];

const excerpt = (text, max = 300) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

const refuse = (status, error) => ({ status, error });

// Returns { key, recipients, email(t) } or { status, error }.
// key: one email per event, even if the browser asks twice. email(t): the text in the recipient's language.
export async function planEmails(event, id, callerId) {
  switch (event) {
    case "comment": {
      const comment = await readDoc("comments", id);
      if (!comment || comment.userId !== callerId) return refuse(403, "Not your comment.");
      const [team, task] = await Promise.all([readDoc("teams", comment.teamId), readDoc("tasks", comment.taskId)]);
      if (!team || !task) return refuse(404, "Team or task not found.");
      const [project, names, author] = await Promise.all([
        readDoc("projects", team.projectId),
        readDoc("teamNames", team.id),
        readDoc("users", callerId),
      ]);
      const byMentor = project?.mentorId === callerId;
      const name = byMentor ? author?.name : names?.[callerId] || author?.anonymousName;
      return {
        key: `comment_${id}`,
        recipients: team.memberIds.filter((uid) => uid !== callerId),
        email: (t) => ({
          subject: t("{name} commented on “{task}”", { name: name || t("A teammate"), task: task.title }),
          lines: [excerpt(comment.text)],
          action: { label: t("Open the task"), path: `/teams/${team.id}/tasks/${task.id}` },
        }),
      };
    }

    case "help": {
      const task = await readDoc("tasks", id);
      const help = task?.helpRequest;
      if (!help || help.userId !== callerId || help.resolvedAt) return refuse(403, "No open help request of yours.");
      const team = await readDoc("teams", task.teamId);
      const project = team && (await readDoc("projects", team.projectId));
      if (!project?.mentorId) return refuse(404, "Project not found.");
      const learner = await readDoc("users", callerId);
      return {
        key: `help_${id}_${help.at}`,
        recipients: [project.mentorId],
        email: (t) => ({
          subject: t("A team needs your help on “{task}”", { task: task.title }),
          lines: [
            t("{name}, from a team on “{project}”, asked for your help.", {
              name: learner?.anonymousName || t("A learner"),
              project: project.title,
            }),
            ...(help.note ? [excerpt(help.note)] : []),
          ],
          action: { label: t("Open the task"), path: `/teams/${team.id}/tasks/${task.id}` },
        }),
      };
    }

    case "final": {
      const feedback = await readDoc("feedback", id);
      if (!feedback || feedback.kind !== "final" || feedback.authorId !== callerId) return refuse(403, "Not your feedback.");
      const team = await readDoc("teams", feedback.teamId);
      const project = team && (await readDoc("projects", team.projectId));
      if (!project || project.mentorId !== callerId) return refuse(403, "Not your project.");
      const mentor = await readDoc("users", callerId);
      return {
        key: `final_${id}`,
        recipients: team.memberIds,
        email: (t) => ({
          subject: t("Final feedback on “{project}”", { project: project.title }),
          lines: [t("{name} left final feedback for your team. It is also on your portfolio.", { name: mentor?.name || t("Your mentor") })],
          action: { label: t("See the feedback"), path: `/teams/${team.id}` },
        }),
      };
    }

    case "connection": {
      const connection = await readDoc("connections", id);
      if (!connection || connection.mentorId !== callerId || connection.status !== "pending") {
        return refuse(403, "Not your request.");
      }
      const [mentor, project] = await Promise.all([readDoc("users", callerId), readDoc("projects", connection.projectId)]);
      return {
        key: `connection_${id}`,
        recipients: [connection.learnerId],
        email: (t) => ({
          subject: t("A mentor is interested in your work"),
          lines: [
            t("{name} from {company} liked your work on “{project}” and would like to know who you are.", {
              name: mentor?.name || t("A mentor"),
              company: mentor?.company || "?",
              project: project?.title || t("your project"),
            }),
            ...(connection.message ? [excerpt(connection.message)] : []),
            t("Only you decide whether to share your name."),
          ],
          action: { label: t("Answer the request"), path: "/" },
        }),
      };
    }

    case "mentorRequest": {
      const user = await readDoc("users", callerId);
      const request = user?.mentorRequest;
      if (id !== callerId || !request || request.declinedAt) return refuse(403, "No open application of yours.");
      const admins = await readWhere("users", "admin", "==", true);
      return {
        key: `mentorRequest_${callerId}_${request.at}`,
        recipients: admins.map((a) => a.id),
        email: (t) => ({
          subject: t("New mentor application: {name}", { name: request.name }),
          lines: [t("{name} ({company}) applied to mentor on {app}.", { name: request.name, company: request.company, app: APP_NAME })],
          action: { label: t("Review applications"), path: "/admin" },
        }),
      };
    }

    case "mentorDecision": {
      const caller = await readDoc("users", callerId);
      if (!caller?.admin) return refuse(403, "Only admins decide on applications.");
      const user = await readDoc("users", id);
      if (user?.role === "mentor") {
        return {
          key: `mentorApproved_${id}`,
          recipients: [id],
          email: (t) => ({
            subject: t("You are now a mentor on {app}", { app: APP_NAME }),
            lines: [t("Your application was approved. You can now turn situations from your work into team projects.")],
            action: { label: t("Create a project"), path: "/projects/new" },
          }),
        };
      }
      const declinedAt = user?.mentorRequest?.declinedAt;
      if (!declinedAt) return refuse(400, "No decision to share yet.");
      return {
        key: `mentorDeclined_${id}_${declinedAt}`,
        recipients: [id],
        email: (t) => ({
          subject: t("Your mentor application"),
          lines: [t("Your application to mentor was not approved this time. You can apply again from your Account page.")],
          action: { label: t("Open your account"), path: "/account" },
        }),
      };
    }

    default:
      return refuse(400, "Unknown event.");
  }
}
