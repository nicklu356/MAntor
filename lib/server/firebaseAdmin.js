// Firebase Admin SDK (server only). It lets the server read and write Firestore with full access,
// for things learners must not be able to fake: AI feedback scores and public portfolios.
//
// Set FIREBASE_SERVICE_ACCOUNT on the server (Vercel > Settings > Environment Variables) to the
// service account JSON from Firebase console > Project settings > Service accounts > Generate new
// private key. Paste the JSON as is, or base64-encoded. Never give it a NEXT_PUBLIC_ name.
// Without it, these features fall back to the browser (feedback) or stay off (public portfolios).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseProjectId } from "@/lib/firebase";

function readServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return null;
  const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const account = JSON.parse(text);
  // Some dashboards turn the key's line breaks into "\n" text.
  if (account.private_key) account.private_key = account.private_key.replace(/\\n/g, "\n");
  return account;
}

// The local emulators need no key (see README).
export const hasAdmin = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIRESTORE_EMULATOR_HOST);

function adminApp() {
  if (getApps().length) return getApps()[0];
  const account = readServiceAccount();
  if (account && firebaseProjectId && account.project_id !== firebaseProjectId) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is for project "${account.project_id}" but the app uses "${firebaseProjectId}".`
    );
  }
  return initializeApp(
    account ? { credential: cert(account), projectId: account.project_id } : { projectId: firebaseProjectId }
  );
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());

// The signed-in user who sent this request ("Authorization: Bearer <Firebase ID token>"), or null.
export async function requestUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

const withId = (snap) => (snap.exists ? { id: snap.id, ...snap.data() } : null);
export const readDoc = async (name, id) => withId(await adminDb().collection(name).doc(id).get());
export async function readWhere(name, field, op, value) {
  const snap = await adminDb().collection(name).where(field, op, value).get();
  return snap.docs.map(withId).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}
