// Delete my account (real accounts, needs FIREBASE_SERVICE_ACCOUNT).
// Removes the person's own data and their login. Team work they submitted stays with the team,
// with their identity removed, because it belongs to the whole team.
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, hasAdmin, readDoc, readWhere, requestUser } from "@/lib/server/firebaseAdmin";
import { readJson } from "@/lib/server/ai";

export async function POST(request) {
  if (!hasAdmin()) {
    return Response.json(
      { error: "Account deletion is not switched on for this site yet (it needs FIREBASE_SERVICE_ACCOUNT)." },
      { status: 503 }
    );
  }
  const parsed = await readJson(request, 2000);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });
  if (parsed.body?.confirm !== "DELETE") {
    return Response.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Please log in again, then try once more." }, { status: 401 });

  try {
    const summary = await deleteAccountData(user.uid);
    await adminAuth().deleteUser(user.uid);
    return Response.json({ deleted: true, ...summary });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return Response.json({ error: "Your account could not be deleted. Please try again." }, { status: 500 });
  }
}

async function deleteAccountData(uid) {
  const db = adminDb();
  const writer = db.bulkWriter();
  const ref = (name, id) => db.collection(name).doc(id);

  // Teams: leave every team (the last one out of an active team disbands it), and take your
  // name and photo out of the team's private lists.
  const teams = await readWhere("teams", "memberIds", "array-contains", uid);
  for (const team of teams) {
    const memberIds = team.memberIds.filter((id) => id !== uid);
    const disband = team.status === "active" && memberIds.length === 0;
    writer.update(ref("teams", team.id), { memberIds, ...(disband ? { status: "disbanded" } : {}) });
    writer.set(ref("teamNames", team.id), { [uid]: FieldValue.delete() }, { merge: true });
    writer.set(ref("teamPhotos", team.id), { [uid]: FieldValue.delete() }, { merge: true });
    for (const task of await readWhere("tasks", "teamId", "==", team.id)) {
      const changes = {};
      if ((task.assigneeIds || []).includes(uid)) changes.assigneeIds = task.assigneeIds.filter((id) => id !== uid);
      if (task.submission?.submittedBy === uid) changes["submission.submittedBy"] = "deleted-user";
      if (task.helpRequest?.userId === uid) changes.helpRequest = null;
      if (Object.keys(changes).length) writer.update(ref("tasks", task.id), changes);
    }
  }

  // Things you wrote or that are about you.
  const mine = await Promise.all([
    readWhere("contributions", "userId", "==", uid),
    readWhere("comments", "userId", "==", uid),
    readWhere("analyses", "userId", "==", uid),
    readWhere("connections", "learnerId", "==", uid),
    readWhere("connections", "mentorId", "==", uid),
  ]);
  const [contributions, comments, analyses, asLearner, asMentor] = mine;
  for (const [name, rows] of [
    ["contributions", contributions],
    ["comments", comments],
    ["analyses", analyses],
    ["connections", [...asLearner, ...asMentor]],
  ]) {
    for (const row of rows) writer.delete(ref(name, row.id));
  }

  writer.delete(ref("profiles", uid));
  writer.delete(ref("users", uid));
  await writer.close();

  const user = await readDoc("users", uid);
  if (user) throw new Error("User record still exists after deletion");
  return { teams: teams.length, removed: contributions.length + comments.length + analyses.length };
}
