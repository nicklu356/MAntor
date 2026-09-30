// Turns tasks + feedback into one row per criterion, with the score history.
// Used by the progress panel and by the AI personal analysis.
// `feedback` must be sorted from oldest to newest (lib/db.js already does this).
export function buildCriteriaResults(project, tasks, feedback) {
  const rows = [];
  for (const task of tasks) {
    for (const criteriaId of task.criteriaIds || []) {
      const criterion = (project?.criteria || []).find((c) => c.id === criteriaId);
      if (!criterion) continue;
      const history = feedback
        .filter((f) => f.kind !== "final" && f.taskId === task.id)
        .map((f) => (f.scores || []).find((s) => s.criteriaId === criteriaId))
        .filter(Boolean);
      rows.push({
        key: `${task.id}:${criteriaId}`,
        id: criteriaId,
        name: criterion.name,
        description: criterion.description,
        taskId: task.id,
        taskTitle: task.title,
        history: history.map((h) => h.score),
        firstScore: history.length ? history[0].score : null,
        latestScore: history.length ? history[history.length - 1].score : null,
        latestComment: history.length ? history[history.length - 1].comment : "",
        reviews: history.length,
      });
    }
  }
  return rows;
}
