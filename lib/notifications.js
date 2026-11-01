// Builds the notification list for the bell in the header from records that already exist
// (comments, submissions, feedback, connections). Nothing extra is stored: "read" is simply
// "created before the last time this viewer opened the bell" (kept in the browser).
//
// teams: [{ id, project, tasks, comments, feedback, contributions }]
// userName: (id) => string, so mentors still only see anonymous names.
const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// t: optional translator (see lib/i18n); English when left out.
export function buildNotifications({ viewer, teams, connections = [], userName, users = [], t = fill }) {
  if (!viewer) return [];
  const items = [];
  const quote = (text) => `“${text}”`;

  for (const team of teams) {
    const taskById = Object.fromEntries((team.tasks || []).map((task) => [task.id, task]));
    const taskHref = (taskId) => `/teams/${team.id}/tasks/${taskId}`;
    const title = team.project?.title || t("your project");

    for (const c of team.comments || []) {
      if (c.userId === viewer.id || !taskById[c.taskId]) continue;
      items.push({
        id: `comment:${c.id}`,
        at: c.createdAt,
        text: t("{name} commented on {task}", { name: userName(c.userId), task: quote(taskById[c.taskId].title) }),
        detail: c.text,
        href: taskHref(c.taskId),
      });
    }

    for (const task of team.tasks || []) {
      const s = task.submission;
      if (!s || s.submittedBy === viewer.id) continue;
      items.push({
        id: `submission:${task.id}:${s.submittedAt}`,
        at: s.submittedAt,
        text: t("{name} submitted {task}", { name: userName(s.submittedBy), task: quote(task.title) }),
        href: taskHref(task.id),
      });
    }

    for (const task of team.tasks || []) {
      const help = task.helpRequest;
      if (!help) continue;
      if (viewer.role === "mentor" && !help.resolvedAt) {
        items.push({
          id: `help:${task.id}:${help.at}`,
          at: help.at,
          text: t("{name} asked for your help on {task}", { name: userName(help.userId), task: quote(task.title) }),
          detail: help.note,
          href: taskHref(task.id),
        });
      }
      if (viewer.role === "learner" && help.resolvedAt && help.resolvedBy !== viewer.id) {
        items.push({
          id: `helped:${task.id}:${help.resolvedAt}`,
          at: help.resolvedAt,
          text: t("{name} answered the help request on {task}", { name: userName(help.resolvedBy), task: quote(task.title) }),
          href: taskHref(task.id),
        });
      }
    }

    for (const c of team.contributions || []) {
      if (c.userId !== viewer.id) continue;
      for (const k of c.kudos || []) {
        if (k.userId === viewer.id) continue;
        items.push({
          id: `kudos:${c.id}:${k.userId}`,
          at: k.at,
          text: taskById[c.taskId]
            ? t("{name} thanked you for your work on {task}", { name: userName(k.userId), task: quote(taskById[c.taskId].title) })
            : t("{name} thanked you for your work", { name: userName(k.userId) }),
          detail: c.description,
          href: taskById[c.taskId] ? taskHref(c.taskId) : `/teams/${team.id}`,
        });
      }
    }

    for (const f of team.feedback || []) {
      if (f.sample) continue;
      if (f.kind === "final") {
        if (f.authorId === viewer.id) continue;
        items.push({
          id: `final:${f.id}`,
          at: f.createdAt,
          text: t("{name} gave your team final feedback on {project}", { name: userName(f.authorId), project: quote(title) }),
          href: `/teams/${team.id}`,
        });
      } else if (f.taskId && taskById[f.taskId] && f.requestedBy !== viewer.id) {
        items.push({
          id: `feedback:${f.id}`,
          at: f.createdAt,
          text: t("New AI feedback on {task}", { task: quote(taskById[f.taskId].title) }),
          href: taskHref(f.taskId),
        });
      }
    }
  }

  const mentorName = (id) => {
    const m = users.find((u) => u.id === id);
    return m ? `${m.name}${m.company ? ` (${m.company})` : ""}` : t("A mentor");
  };
  for (const c of connections) {
    if (viewer.role === "learner" && c.status === "pending") {
      items.push({
        id: `conn:${c.id}`,
        at: c.createdAt,
        text: t("{name} liked your work and would like to know who you are", { name: mentorName(c.mentorId) }),
        detail: c.message,
        href: "/#requests",
      });
    }
    if (viewer.role === "mentor" && c.status !== "pending" && c.respondedAt) {
      items.push({
        id: `conn:${c.id}:${c.status}`,
        at: c.respondedAt,
        text:
          c.status === "accepted"
            ? t("{name} accepted your request and shared their name", { name: userName(c.learnerId) })
            : t("A learner declined your request to connect"),
        href: c.teamId ? `/teams/${c.teamId}` : "/",
      });
    }
  }

  return items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export const countUnread = (items, lastSeen) =>
  lastSeen ? items.filter((i) => String(i.at) > lastSeen).length : items.length;
