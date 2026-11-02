// Firestore security rules (firestore.rules), tested against the emulators: npm run test:rules
// Each check signs in as a real user and tries something; the rules must allow or refuse it.
// Test data is written with the Admin SDK, which skips the rules.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as F from "firebase/firestore";

const PROJECT = "demo-mantor";
const [firestoreHost, firestorePort] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const run = Date.now().toString(36);

const admin = initializeAdminApp({ projectId: PROJECT }, `rules-admin-${run}`);
const adminDb = getAdminFirestore(admin);
const apps = [];
const people = {};

async function signIn(name) {
  const app = initializeApp({ apiKey: "demo-key", projectId: PROJECT }, `${name}-${run}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = F.getFirestore(app);
  F.connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  if (name === "visitor") return { db, uid: null };
  const user = await signInWithEmailAndPassword(auth, `${name}-${run}@example.com`, "secret123");
  return { db, uid: user.user.uid };
}

const outcome = async (action) => {
  try {
    await action();
    return "allowed";
  } catch (error) {
    if (error.code === "permission-denied") return "denied";
    throw error;
  }
};
const allows = async (action) => assert.equal(await outcome(action), "allowed");
const denies = async (action) => assert.equal(await outcome(action), "denied");

const doc = (who, ...path) => F.doc(people[who].db, ...path);
const T = `team-${run}`, TASK = `task-${run}`, P = `project-${run}`, OTHER_P = `other-project-${run}`;

before(async () => {
  const auth = getAdminAuth(admin);
  for (const name of ["alice", "bob", "maya", "carol"]) {
    const user = await auth.createUser({ email: `${name}-${run}@example.com`, password: "secret123" });
    people[name] = { uid: user.uid };
  }
  const { alice, bob, maya } = people;
  const set = (path, data) => adminDb.doc(path).set(data);
  await Promise.all([
    set(`users/${alice.uid}`, { role: "learner", anonymousName: "Learner #ALI", createdAt: "t" }),
    set(`users/${bob.uid}`, { role: "learner", anonymousName: "Learner #BOB", createdAt: "t" }),
    set(`users/${maya.uid}`, { role: "mentor", name: "Maya Lin", company: "Acme", anonymousName: "Mentor #M", createdAt: "t" }),
    set(`profiles/${alice.uid}`, { name: "Alice Wong", email: "alice@example.com" }),
    set(`profiles/${bob.uid}`, { name: "Bob Smith", email: "bob@example.com" }),
    set(`projects/${P}`, { title: "P", mentorId: maya.uid, teamSize: 3, criteria: [{ id: "c1" }], createdAt: "t" }),
    set(`projects/${OTHER_P}`, { title: "Other", mentorId: "someone-else", teamSize: 3, criteria: [], createdAt: "t" }),
    set(`teams/${T}`, { projectId: P, memberIds: [alice.uid, bob.uid], status: "active", createdAt: "t" }),
    set(`tasks/${TASK}`, { teamId: T, projectId: P, title: "Task", description: "d", criteriaIds: ["c1"], status: "todo", assigneeIds: [] }),
    set(`contributions/alice-${run}`, { teamId: T, taskId: TASK, userId: alice.uid, description: "d", hoursSpent: 1, kudos: [] }),
    set(`connections/conn-${run}`, { mentorId: maya.uid, learnerId: alice.uid, teamId: T, projectId: P, status: "pending" }),
    set(`analyses/alice-${run}`, { userId: alice.uid, teamId: T, summary: "s" }),
    set(`teamNames/${T}`, { [alice.uid]: "Alice Wong", [bob.uid]: "Bob Smith" }),
    set(`teamPhotos/${T}`, { [alice.uid]: "data:image/jpeg;base64,AAAA" }),
  ]);
  for (const name of ["alice", "bob", "maya", "carol", "visitor"]) Object.assign((people[name] ||= {}), await signIn(name));
});

after(async () => {
  for (const app of apps) {
    await F.terminate(F.getFirestore(app));
    await deleteApp(app);
  }
  await deleteAdminApp(admin);
});

// ---------- Private names and photos ----------

test("learners read their own private profile only", async () => {
  await allows(() => F.getDoc(doc("bob", "profiles", people.bob.uid)));
  await denies(() => F.getDoc(doc("bob", "profiles", people.alice.uid)));
  await denies(() => F.getDoc(doc("maya", "profiles", people.alice.uid)));
});

test("team names and photos: members only, and only their own entry", async () => {
  await allows(() => F.getDoc(doc("bob", "teamNames", T)));
  await denies(() => F.getDoc(doc("maya", "teamNames", T)));
  await denies(() => F.getDoc(doc("carol", "teamNames", T)));
  await denies(() => F.setDoc(doc("bob", "teamNames", T), { [people.alice.uid]: "Hacked" }, { merge: true }));
  await allows(() => F.getDoc(doc("bob", "teamPhotos", T)));
  await denies(() => F.getDoc(doc("maya", "teamPhotos", T)));
  await denies(() => F.setDoc(doc("bob", "teamPhotos", T), { [people.alice.uid]: "data:image/jpeg;base64,x" }, { merge: true }));
  await denies(() =>
    F.setDoc(doc("bob", "teamPhotos", T), { [people.bob.uid]: "data:image/jpeg;base64," + "A".repeat(160000) }, { merge: true })
  );
  await allows(() => F.setDoc(doc("bob", "teamPhotos", T), { [people.bob.uid]: "data:image/jpeg;base64,BBBB" }, { merge: true }));
});

test("learners cannot give themselves a public name or photo", async () => {
  await denies(() => F.updateDoc(doc("bob", "users", people.bob.uid), { name: "Bob Public" }));
  await denies(() => F.updateDoc(doc("bob", "users", people.bob.uid), { photo: "data:image/jpeg;base64,x" }));
});

// ---------- Roles ----------

test("nobody can make themselves a mentor or an admin", async () => {
  await denies(() => F.updateDoc(doc("bob", "users", people.bob.uid), { role: "mentor" }));
  await denies(() => F.updateDoc(doc("bob", "users", people.bob.uid), { admin: true }));
  await denies(() => F.setDoc(doc("carol", "users", people.carol.uid), { role: "mentor", anonymousName: "x", createdAt: "t" }));
  await allows(() => F.setDoc(doc("carol", "users", people.carol.uid), { role: "learner", anonymousName: "Learner #CAR", createdAt: "t" }));
});

test("learners update their own record (assessment, public portfolio) but no one else's", async () => {
  await allows(() => F.updateDoc(doc("bob", "users", people.bob.uid), { careerField: "UX Design", portfolioPublic: true }));
  await denies(() => F.updateDoc(doc("bob", "users", people.alice.uid), { careerField: "UX Design" }));
});

test("projects: only their mentor edits them", async () => {
  await denies(() => F.setDoc(doc("bob", "projects", `hack-${run}`), { title: "x", mentorId: people.bob.uid }));
  await denies(() => F.updateDoc(doc("bob", "projects", P), { title: "Hacked" }));
  await allows(() => F.updateDoc(doc("maya", "projects", P), { title: "P2" }));
  await denies(() => F.updateDoc(doc("maya", "projects", OTHER_P), { title: "Hacked" }));
});

// ---------- Teams and their work ----------

test("teams: no adding or removing other people, no self-completion", async () => {
  await denies(() => F.updateDoc(doc("carol", "teams", T), { memberIds: [people.alice.uid, people.bob.uid, "x"] }));
  await denies(() => F.updateDoc(doc("bob", "teams", T), { memberIds: [people.bob.uid] }));
  await denies(() => F.updateDoc(doc("bob", "teams", T), { status: "completed" }));
});

test("tasks: members edit work, not the task definition; outsiders nothing", async () => {
  await allows(() => F.updateDoc(doc("bob", "tasks", TASK), { status: "in_progress" }));
  await denies(() => F.updateDoc(doc("bob", "tasks", TASK), { criteriaIds: [] }));
  await denies(() => F.updateDoc(doc("carol", "tasks", TASK), { submission: { content: "x" } }));
});

test("comments and contributions are written by members as themselves", async () => {
  const comment = (who, id, userId) => F.setDoc(doc(who, "comments", `${id}-${run}`), { teamId: T, taskId: TASK, userId, text: "x" });
  await denies(() => comment("carol", "c1", people.carol.uid));
  await denies(() => comment("bob", "c2", people.alice.uid));
  await allows(() => comment("bob", "c3", people.bob.uid));
  await denies(() =>
    F.setDoc(doc("bob", "contributions", `fake-${run}`), { teamId: T, taskId: TASK, userId: people.alice.uid, description: "x", hoursSpent: 9 })
  );
  await denies(() => F.updateDoc(doc("alice", "contributions", `alice-${run}`), { kudos: [{ userId: people.alice.uid }] }));
  await allows(() => F.updateDoc(doc("bob", "contributions", `alice-${run}`), { kudos: [{ userId: people.bob.uid }] }));
});

test("feedback: browsers can never save verified scores or mentor final feedback as a learner", async () => {
  const feedback = (id, data) =>
    F.setDoc(doc("alice", "feedback", `${id}-${run}`), { teamId: T, taskId: TASK, kind: "task", source: "ai", requestedBy: people.alice.uid, scores: [], ...data });
  await denies(() => feedback("verified", { verified: true }));
  await allows(() => feedback("unverified", { verified: false }));
  await denies(() =>
    F.setDoc(doc("bob", "feedback", `final-${run}`), { teamId: T, taskId: null, kind: "final", source: "mentor", authorId: people.bob.uid, scores: [] })
  );
  await allows(() =>
    F.setDoc(doc("maya", "feedback", `final2-${run}`), { teamId: T, taskId: null, kind: "final", source: "mentor", authorId: people.maya.uid, scores: [] })
  );
});

test("analyses and connections stay with the people they belong to", async () => {
  await denies(() => F.getDocs(F.query(F.collection(people.bob.db, "analyses"), F.where("userId", "==", people.alice.uid))));
  await allows(() => F.getDocs(F.query(F.collection(people.alice.db, "analyses"), F.where("userId", "==", people.alice.uid))));
  await denies(() => F.getDocs(F.query(F.collection(people.bob.db, "connections"), F.where("learnerId", "==", people.alice.uid))));
  await denies(() => F.updateDoc(doc("bob", "connections", `conn-${run}`), { status: "declined" }));
  await allows(() => F.updateDoc(doc("alice", "connections", `conn-${run}`), { status: "accepted", learnerName: "Alice Wong" }));
});

test("the email log is for the server only", async () => {
  await denies(() => F.setDoc(doc("alice", "mailLog", `comment_x-${run}`), { event: "comment", at: "now" }));
  await denies(() => F.getDocs(F.collection(people.alice.db, "mailLog")));
  await allows(() => F.setDoc(doc("alice", "profiles", people.alice.uid), { emailNotifications: false, language: "zh-TW" }, { merge: true }));
});

// ---------- Signed-out visitors ----------

test("signed-out visitors see the project catalogue and mentors only", async () => {
  await allows(() => F.getDocs(F.collection(people.visitor.db, "projects")));
  await allows(() => F.getDoc(doc("visitor", "users", people.maya.uid)));
  await denies(() => F.getDocs(F.collection(people.visitor.db, "teams")));
  await denies(() => F.getDoc(doc("visitor", "users", people.alice.uid)));
});
