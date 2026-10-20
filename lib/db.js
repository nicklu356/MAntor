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
import { cleanProject } from "./projectDraft";
import * as seed from "./seed";

export { isFirebaseEnabled };

const now = () => new Date().toISOString();
const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const byCreatedAt = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt));

// ---------- Firebase errors ----------
// Firestore can fail in two confusing ways: the rules refuse access (an error), or it cannot reach
// the server and keeps retrying (a promise that never settles, so the page says "Loading…" forever).
// guard() turns both into a clear message that says how to fix it.
const TIMEOUT_MS = 15000;

export function explainFirebaseError(error) {
  const code = error?.code || "";
  if (code === "permission-denied") {
    return "Firestore rules are blocking the app. In the Firebase console open Firestore Database > Rules, paste the rules from firestore.rules in this repo, and click Publish.";
  }
  if (code === "timeout" || code === "unavailable" || code === "deadline-exceeded") {
    return "Cannot reach Firestore. Check that a Firestore database exists in this Firebase project, and that the NEXT_PUBLIC_FIREBASE_* values match the project (on Vercel, redeploy after changing them).";
  }
  if (code === "not-found" || code === "failed-precondition") {
    return "No Firestore database was found for this project. In the Firebase console create one under Build > Firestore Database.";
  }
  return error?.message || "Unknown database error";
}

async function guard(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    throw Object.assign(new Error(explainFirebaseError(error)), { code: error?.code || "unknown" });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Generic helpers (Firebase or demo mode) ----------

// filter = { field, op, value } where op is "==" or "array-contains"
async function list(name, filter) {
  if (isFirebaseEnabled) {
    const ref = collection(getDb(), name);
    const q = filter ? query(ref, where(filter.field, filter.op, filter.value)) : ref;
    const snap = await guard(getDocs(q));
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
    const snap = await guard(getDoc(doc(getDb(), name, id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  const row = mock.load()[name].find((r) => r.id === id);
  return row ? clone(row) : null;
}

async function create(name, record) {
  if (isFirebaseEnabled) {
    const { id, ...data } = record;
    await guard(setDoc(doc(getDb(), name, id), data));
    return record;
  }
  mock.load()[name].push(clone(record));
  mock.save();
  return record;
}

async function update(name, id, changes) {
  if (isFirebaseEnabled) {
    await guard(updateDoc(doc(getDb(), name, id), changes));
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

// Mentors write their own projects (the form is cleaned by cleanProject in lib/projectDraft.js). Edits apply to teams created afterwards:
// teams that already exist keep the tasks they were given.
export async function createProject(mentor, data) {
  const project = {
    id: newId("project"),
    ...cleanProject(data),
    mentorId: mentor.id,
    company: mentor.company || "",
    createdAt: now(),
  };
  return create("projects", project);
}

export async function updateProject(id, data) {
  const changes = { ...cleanProject(data), updatedAt: now() };
  await update("projects", id, changes);
  return changes;
}

// ---------- Teams ----------

export const getTeam = (id) => get("teams", id);
export const getTeamsForUser = (userId) =>
  list("teams", { field: "memberIds", op: "array-contains", value: userId });
// Disbanded teams (everyone left) are hidden, so mentors never see empty teams.
export const getTeamsForProject = async (projectId) =>
  (await list("teams", { field: "projectId", op: "==", value: projectId })).filter(
    (t) => t.status !== "disbanded"
  );
export const updateTeam = (id, changes) => update("teams", id, changes);

// Every team on every project of a mentor, with the project attached.
export async function getTeamsForMentor(mentorId) {
  const projects = await getProjectsForMentor(mentorId);
  const groups = await Promise.all(
    projects.map(async (project) =>
      (await getTeamsForProject(project.id)).map((team) => ({ ...team, project }))
    )
  );
  return groups.flat();
}

// Join a project: reuse the user's team if they already have one,
// otherwise fill an open team, otherwise start a new team with its own tasks.
export async function joinProject(projectId, userId) {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const all = await list("teams", { field: "projectId", op: "==", value: projectId });
  const teams = all.filter((t) => t.status !== "disbanded"); // nobody can join a disbanded team
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

// Leave a team. The learner is removed from the team and from every task they were assigned to.
// Their submissions and contribution records stay, so teammates keep the record of the work.
// If nobody is left, the team is marked "disbanded" (hidden from mentors, ignored when joining).
// A completed team (the mentor already gave final feedback) cannot be left.
export async function leaveTeam(teamId, userId) {
  const team = await getTeam(teamId);
  if (!team) throw new Error("Team not found");
  if (!team.memberIds.includes(userId)) return team;
  if (team.status === "completed") throw new Error("This project is completed, so the team cannot be left.");

  const tasks = await getTasks(teamId);
  for (const task of tasks) {
    if (task.assigneeIds.includes(userId)) {
      await updateTask(task.id, { assigneeIds: task.assigneeIds.filter((id) => id !== userId) });
    }
  }

  const memberIds = team.memberIds.filter((id) => id !== userId);
  const changes = memberIds.length ? { memberIds } : { memberIds, status: "disbanded" };
  await updateTeam(teamId, changes);
  return { ...team, ...changes };
}

// ---------- Tasks ----------

export const getTasks = (teamId) => list("tasks", { field: "teamId", op: "==", value: teamId });
export const getTask = (id) => get("tasks", id);
export const updateTask = (id, changes) => update("tasks", id, changes);

// A learner asks the project's mentor for help on a task. Only one open request per task.
export async function requestHelp(taskId, userId, note) {
  const helpRequest = { userId, note: String(note || "").trim(), at: now(), resolvedAt: null, resolvedBy: null };
  await update("tasks", taskId, { helpRequest });
  return helpRequest;
}

// The mentor marks the request as answered (they usually reply in the task discussion first).
export async function resolveHelp(taskId, mentorId) {
  const task = await getTask(taskId);
  if (!task?.helpRequest) return null;
  const helpRequest = { ...task.helpRequest, resolvedAt: now(), resolvedBy: mentorId };
  await update("tasks", taskId, { helpRequest });
  return helpRequest;
}

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
    kudos: [],
    createdAt: now(),
  };
  return create("contributions", record);
}

// A teammate says thanks for a contribution (click again to take it back).
// kudos = [{ userId, at }]. Nobody can thank their own contribution.
export async function toggleKudos(contributionId, userId) {
  const record = await get("contributions", contributionId);
  if (!record || record.userId === userId) return record;
  const kudos = record.kudos || [];
  const next = kudos.some((k) => k.userId === userId)
    ? kudos.filter((k) => k.userId !== userId)
    : [...kudos, { userId, at: now() }];
  await update("contributions", contributionId, { kudos: next });
  return { ...record, kudos: next };
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
  requestedBy = null,
}) {
  const record = {
    id: newId("fb"),
    taskId: taskId || null,
    teamId,
    source,
    kind,
    authorId,
    requestedBy,
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
export const getTeamComments = (teamId) => list("comments", { field: "teamId", op: "==", value: teamId });

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

// ---------- Connections (a mentor asks to learn who did the work) ----------
// Mentors see learners by anonymous name only. When a mentor is impressed by a learner's work,
// they send a request. If the learner accepts, the mentor sees their real name from then on.
// status: "pending", "accepted" or "declined"

export const getConnectionsForMentor = (mentorId) =>
  list("connections", { field: "mentorId", op: "==", value: mentorId });
export const getConnectionsForLearner = (learnerId) =>
  list("connections", { field: "learnerId", op: "==", value: learnerId });

export async function requestConnection({ mentorId, learnerId, teamId, projectId, message }) {
  const existing = (await getConnectionsForMentor(mentorId)).find(
    (c) => c.learnerId === learnerId && c.status !== "declined"
  );
  if (existing) return existing;
  const record = {
    id: newId("conn"),
    mentorId,
    learnerId,
    teamId,
    projectId,
    message: String(message || "").trim(),
    status: "pending",
    createdAt: now(),
    respondedAt: null,
  };
  return create("connections", record);
}

export const respondToConnection = (id, accept) =>
  update("connections", id, { status: accept ? "accepted" : "declined", respondedAt: now() });

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
    connections: seed.connections,
  };
  for (const [name, rows] of Object.entries(groups)) {
    for (const { id, ...data } of rows) {
      batch.set(doc(db, name, id), data);
    }
  }
  await guard(batch.commit());
}

export function resetDemoData() {
  mock.reset();
}
