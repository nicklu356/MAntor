// One place for every read and write.
// Pages call these functions and never need to know whether the data
// lives in Firebase or in the browser (demo mode).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb, isFirebaseEnabled } from "./firebase";
import * as mock from "./mockStore";
import * as seed from "./seed";

export { isFirebaseEnabled };

const now = () => new Date().toISOString();
const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const byCreatedAt = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt));

// ---------- Generic helpers (Firebase or demo mode) ----------

// filter = { field, op, value } where op is "==" or "array-contains"
async function list(name, filter) {
  if (isFirebaseEnabled) {
    const ref = collection(getDb(), name);
    const q = filter ? query(ref, where(filter.field, filter.op, filter.value)) : ref;
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byCreatedAt);
  }
  const rows = mock.load()[name].filter((row) => {
    if (!filter) return true;
    if (filter.op === "array-contains") return (row[filter.field] || []).includes(filter.value);
    return row[filter.field] === filter.value;
  });
  return clone(rows).sort(byCreatedAt);
}

async function get(name, id) {
  if (isFirebaseEnabled) {
    const snap = await getDoc(doc(getDb(), name, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  const row = mock.load()[name].find((r) => r.id === id);
  return row ? clone(row) : null;
}

async function create(name, record) {
  if (isFirebaseEnabled) {
    const { id, ...data } = record;
    await setDoc(doc(getDb(), name, id), data);
    return record;
  }
  mock.load()[name].push(clone(record));
  mock.save();
  return record;
}

async function update(name, id, changes) {
  if (isFirebaseEnabled) {
    await updateDoc(doc(getDb(), name, id), changes);
    return;
  }
  const row = mock.load()[name].find((r) => r.id === id);
  if (row) Object.assign(row, clone(changes));
  mock.save();
}

// ---------- Users ----------

export const getUsers = () => list("users");
export const getUser = (id) => get("users", id);
export const updateUser = (id, changes) => update("users", id, changes);

// ---------- Projects ----------

export const getProjects = () => list("projects");
export const getProject = (id) => get("projects", id);
export const getProjectsForMentor = (mentorId) =>
  list("projects", { field: "mentorId", op: "==", value: mentorId });

// ---------- Teams ----------

export const getTeam = (id) => get("teams", id);
export const getTeamsForUser = (userId) =>
  list("teams", { field: "memberIds", op: "array-contains", value: userId });
export const getTeamsForProject = (projectId) =>
  list("teams", { field: "projectId", op: "==", value: projectId });
export const updateTeam = (id, changes) => update("teams", id, changes);

// Join a project: reuse the user's team if they already have one,
// otherwise fill an open team, otherwise start a new team with its own tasks.
export async function joinProject(projectId, userId) {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const teams = await list("teams", { field: "projectId", op: "==", value: projectId });
  const mine = teams.find((t) => t.memberIds.includes(userId));
  if (mine) return mine;

  const open = teams.find((t) => t.status === "active" && t.memberIds.length < project.teamSize);
  if (open) {
    const memberIds = [...open.memberIds, userId];
    await update("teams", open.id, { memberIds });
    return { ...open, memberIds };
  }

  const team = {
    id: newId("team"),
    projectId,
    memberIds: [userId],
    status: "active",
    createdAt: now(),
  };
  await create("teams", team);

  for (const template of project.taskTemplates || []) {
    await create("tasks", {
      id: newId("task"),
      projectId,
      teamId: team.id,
      title: template.title,
      description: template.description,
      criteriaIds: template.criteriaIds,
      status: "todo",
      assigneeIds: [],
      submission: null,
      createdAt: now(),
    });
  }
  return team;
}

// ---------- Tasks ----------

export const getTasks = (teamId) => list("tasks", { field: "teamId", op: "==", value: teamId });
export const getTask = (id) => get("tasks", id);
export const updateTask = (id, changes) => update("tasks", id, changes);

export async function submitTask(taskId, userId, content) {
  const submission = { content, submittedBy: userId, submittedAt: now() };
  await update("tasks", taskId, { submission });
  return submission;
}

// ---------- Contributions ----------

export const getContributions = (taskId) =>
  list("contributions", { field: "taskId", op: "==", value: taskId });
export const getContributionsForTeam = (teamId) =>
  list("contributions", { field: "teamId", op: "==", value: teamId });

export async function addContribution({ taskId, teamId, userId, description, hoursSpent }) {
  const record = {
    id: newId("contrib"),
    taskId,
    teamId,
    userId,
    description,
    hoursSpent: Number(hoursSpent) || 0,
    createdAt: now(),
  };
  return create("contributions", record);
}

// ---------- Feedback ----------
// kind "task"  = feedback on one task (AI or mentor)
// kind "final" = the mentor's final feedback for a whole team (taskId is null)

export const getFeedback = (taskId) => list("feedback", { field: "taskId", op: "==", value: taskId });
export const getTeamFeedback = (teamId) =>
  list("feedback", { field: "teamId", op: "==", value: teamId });

export async function addFeedback({
  taskId,
  teamId,
  source,
  scores,
  summary,
  simulated,
  kind = "task",
  authorId = null,
  sample = false,
}) {
  const record = {
    id: newId("fb"),
    taskId: taskId || null,
    teamId,
    source,
    kind,
    authorId,
    scores,
    summary,
    simulated: Boolean(simulated),
    sample: Boolean(sample),
    createdAt: now(),
  };
  return create("feedback", record);
}

// The mentor's final feedback. If every task is done, the team is marked as completed.
export async function addFinalFeedback({ teamId, authorId, scores, summary, allTasksDone }) {
  const record = await addFeedback({
    taskId: null,
    teamId,
    source: "mentor",
    kind: "final",
    authorId,
    scores,
    summary,
  });
  if (allTasksDone) await updateTeam(teamId, { status: "completed" });
  return record;
}

// ---------- Comments (team discussion under a task) ----------

export const getComments = (taskId) => list("comments", { field: "taskId", op: "==", value: taskId });

export async function addComment({ taskId, teamId, userId, text }) {
  const record = { id: newId("comment"), taskId, teamId, userId, text, createdAt: now() };
  return create("comments", record);
}

// ---------- AI personal analyses ----------

// Newest first.
export async function getAnalyses(teamId, userId) {
  const rows = await list("analyses", { field: "teamId", op: "==", value: teamId });
  return rows.filter((a) => a.userId === userId).reverse();
}

export async function addAnalysis({ teamId, projectId, userId, summary, strengths, improvements, nextSteps, courses, simulated }) {
  const record = {
    id: newId("analysis"),
    teamId,
    projectId,
    userId,
    summary,
    strengths,
    improvements,
    nextSteps,
    courses,
    simulated: Boolean(simulated),
    createdAt: now(),
  };
  return create("analyses", record);
}

// ---------- Setup ----------

// Copies the demo data from lib/seed.js into Firebase.
export async function seedFirebase() {
  if (!isFirebaseEnabled) throw new Error("Firebase is not configured");
  const db = getDb();
  const batch = writeBatch(db);
  const groups = {
    users: seed.users,
    projects: seed.projects,
    teams: seed.teams,
    tasks: seed.tasks,
    contributions: seed.contributions,
    feedback: seed.feedback,
    comments: seed.comments,
    analyses: seed.analyses,
  };
  for (const [name, rows] of Object.entries(groups)) {
    for (const { id, ...data } of rows) {
      batch.set(doc(db, name, id), data);
    }
  }
  await batch.commit();
}

export function resetDemoData() {
  mock.reset();
}
