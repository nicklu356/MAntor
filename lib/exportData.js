// "Download my data": everything MAntor stores about you, as one JSON file.
import {
  getAnalyses,
  getConnectionsForLearner,
  getConnectionsForMentor,
  getTasks,
  getTeamComments,
  getTeamFeedback,
  getContributionsForTeam,
  getTeamsForUser,
  getProject,
  getProfile,
  getUser,
} from "./db";

export async function collectMyData(uid) {
  const [account, profile, teams, connectionsAsLearner, connectionsAsMentor] = await Promise.all([
    getUser(uid),
    getProfile(uid),
    getTeamsForUser(uid),
    getConnectionsForLearner(uid),
    getConnectionsForMentor(uid),
  ]);
  const projects = await Promise.all(
    teams.map(async (team) => {
      const [project, tasks, feedback, contributions, comments, analyses] = await Promise.all([
        getProject(team.projectId),
        getTasks(team.id),
        getTeamFeedback(team.id),
        getContributionsForTeam(team.id),
        getTeamComments(team.id),
        getAnalyses(team.id, uid),
      ]);
      return {
        team: { id: team.id, status: team.status, joined: team.createdAt },
        project: project ? { id: project.id, title: project.title, field: project.field, company: project.company } : null,
        mySubmissions: tasks
          .filter((t) => t.submission?.submittedBy === uid)
          .map((t) => ({ task: t.title, ...t.submission })),
        myContributions: contributions.filter((c) => c.userId === uid),
        myComments: comments.filter((c) => c.userId === uid),
        feedbackForMyTeam: feedback,
        myPersonalAnalyses: analyses,
      };
    })
  );
  return {
    exportedAt: new Date().toISOString(),
    about: "Everything MAntor stores about you. Team members' names are not included.",
    account,
    profile,
    projects,
    connections: [...connectionsAsLearner, ...connectionsAsMentor],
  };
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
