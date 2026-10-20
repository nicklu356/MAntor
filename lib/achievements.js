// Achievements: small milestones that make progress visible (and keep learners going).
// Everything is worked out from records that already exist, so nothing extra is stored.
// entries: [{ team, project, tasks, feedback, contributions (whole team), comments (whole team) }]
import { buildCriteriaResults } from "./progress.js";

export function computeAchievements(userId, entries) {
  const mine = (list) => list.filter((x) => x.userId === userId);
  const contributions = entries.flatMap((e) => mine(e.contributions || []));
  const comments = entries.flatMap((e) => mine(e.comments || []));
  const submitted = entries.flatMap((e) => (e.tasks || []).filter((t) => t.submission?.submittedBy === userId));
  const hours = contributions.reduce((sum, c) => sum + (Number(c.hoursSpent) || 0), 0);
  const kudos = contributions.reduce((sum, c) => sum + (c.kudos || []).length, 0);
  const improved = entries.some((e) =>
    buildCriteriaResults(e.project, (e.tasks || []).filter((t) => t.submission?.submittedBy === userId), e.feedback || []).some(
      (r) => r.reviews > 1 && r.latestScore > r.firstScore
    )
  );
  const completed = entries.filter((e) => e.team.status === "completed");
  const approved = completed.some((e) => {
    const finals = (e.feedback || []).filter((f) => f.kind === "final");
    const scores = finals[finals.length - 1]?.scores || [];
    return scores.length && scores.reduce((s, x) => s + x.score, 0) / scores.length >= 4;
  });
  const fields = new Set(entries.map((e) => e.project?.field).filter(Boolean));

  const list = [
    { id: "first-step", icon: "✦", title: "First submission", description: "Submit work on a task.", earned: submitted.length > 0 },
    {
      id: "feedback-loop",
      icon: "↗",
      title: "Feedback loop",
      description: "Improve a score by revising your work after feedback.",
      earned: improved,
    },
    {
      id: "team-player",
      icon: "◎",
      title: "Team player",
      description: "Record 3 contributions.",
      earned: contributions.length >= 3,
      progress: `${Math.min(contributions.length, 3)} / 3`,
    },
    { id: "deep-work", icon: "◷", title: "10 hours in", description: "Record 10 hours of work.", earned: hours >= 10, progress: `${Math.min(hours, 10)} / 10 h` },
    { id: "appreciated", icon: "♥", title: "Appreciated", description: "Get thanked by a teammate.", earned: kudos > 0 },
    {
      id: "communicator",
      icon: "❝",
      title: "Communicator",
      description: "Post 3 messages in team discussions.",
      earned: comments.length >= 3,
      progress: `${Math.min(comments.length, 3)} / 3`,
    },
    { id: "finisher", icon: "⚑", title: "Project finished", description: "Complete a project with mentor feedback.", earned: completed.length > 0 },
    {
      id: "mentor-approved",
      icon: "★",
      title: "Mentor approved",
      description: "Average 4 or more in a mentor's final feedback.",
      earned: approved,
    },
    { id: "explorer", icon: "⌖", title: "Explorer", description: "Work on projects in 2 different fields.", earned: fields.size >= 2 },
  ];
  return list.map((a) => (a.earned ? { ...a, progress: undefined } : a));
}
