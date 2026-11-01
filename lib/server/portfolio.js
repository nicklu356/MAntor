// A learner's public portfolio, built on the server with full Firestore access.
// Only learners who turned "Public portfolio" on are shown. Only trustworthy evidence counts:
// AI scores the server saved (verified) and the mentor's own final feedback. Contributions are
// the learner's own records and are labelled that way.
import { buildCriteriaResults } from "@/lib/progress";
import { readDoc, readWhere } from "./firebaseAdmin";

export async function getPublicPortfolio(userId) {
  const user = await readDoc("users", String(userId));
  if (!user || user.role !== "learner" || !user.portfolioPublic) return null;
  const profile = (await readDoc("profiles", user.id)) || {};
  const teams = (await readWhere("teams", "memberIds", "array-contains", user.id)).filter((t) => t.status !== "disbanded");

  const projects = await Promise.all(
    teams.map(async (team) => {
      const [project, tasks, feedback, contributions] = await Promise.all([
        readDoc("projects", team.projectId),
        readWhere("tasks", "teamId", "==", team.id),
        readWhere("feedback", "teamId", "==", team.id),
        readWhere("contributions", "teamId", "==", team.id),
      ]);
      if (!project) return null;
      const verified = feedback.filter((f) => f.kind !== "final" && f.verified && !f.simulated);
      const finals = feedback.filter((f) => f.kind === "final");
      const final = finals[finals.length - 1] || null;
      const mentor = final ? await readDoc("users", final.authorId) : null;
      const mine = contributions.filter((c) => c.userId === user.id);
      return {
        id: team.id,
        status: team.status,
        title: project.title,
        field: project.field,
        company: project.company,
        teamSize: team.memberIds.length,
        tasksDone: tasks.filter((t) => t.status === "done").length,
        tasksTotal: tasks.length,
        results: buildCriteriaResults(project, tasks, verified)
          .filter((r) => r.latestScore != null)
          .map(({ key, name, taskTitle, history, latestScore }) => ({ key, name, taskTitle, history, latestScore })),
        mentorFeedback: final
          ? {
              summary: final.summary,
              mentorName: mentor?.name || "Mentor",
              company: mentor?.company || project.company,
              scores: (final.scores || []).map((s) => ({
                name: project.criteria.find((c) => c.id === s.criteriaId)?.name || s.criteriaId,
                score: s.score,
              })),
            }
          : null,
        contributions: mine.map((c) => ({
          id: c.id,
          description: c.description,
          hoursSpent: Number(c.hoursSpent) || 0,
          task: tasks.find((t) => t.id === c.taskId)?.title || "",
        })),
      };
    })
  );

  return {
    name: profile.name || user.anonymousName,
    photo: profile.photo || null,
    education: profile.school
      ? { level: profile.educationLevel, school: profile.school, field: profile.fieldOfStudy, year: profile.graduationYear }
      : null,
    careerField: user.careerField || null,
    projects: projects.filter(Boolean).sort((a, b) => (b.status === "completed") - (a.status === "completed")),
  };
}
