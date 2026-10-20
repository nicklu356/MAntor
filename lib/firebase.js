import { initializeApp, getApps } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, initializeFirestore } from "firebase/firestore";

// Values pasted straight from Firebase's `firebaseConfig` snippet often keep its JavaScript
// formatting: spaces, quotes and a trailing comma (projectId: "my-app",). Strip all of that.
const clean = (value) =>
  String(value ?? "")
    .trim()
    .replace(/,$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

// These values come from .env.local (see .env.example), or from Vercel's Environment Variables.
// Each one must be written out in full (process.env.NEXT_PUBLIC_...) so Next.js can build it in.
const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// If the keys are missing, the app uses demo mode (data saved in the browser).
export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// A project id is lowercase letters, digits and dashes. Anything else means the value was pasted wrongly,
// and Firestore would only report that it "cannot reach" the server.
export const firebaseConfigProblem =
  isFirebaseEnabled && !/^[a-z0-9-]+$/.test(firebaseConfig.projectId)
    ? "NEXT_PUBLIC_FIREBASE_PROJECT_ID does not look like a Firebase project id (only lowercase letters, numbers and dashes). Copy just the value, for example my-project-123."
    : "";
export const firebaseProjectId = firebaseConfig.projectId;

let db = null;

export function getDb() {
  if (!isFirebaseEnabled) return null;
  if (!db) {
    if (getApps().length) {
      db = getFirestore(getApps()[0]);
    } else {
      // Firestore refuses writes that contain `undefined`; skipping those fields is safer than failing.
      db = initializeFirestore(initializeApp(firebaseConfig), { ignoreUndefinedProperties: true });
      // Optional: test against the local Firestore emulator (see README), e.g. "127.0.0.1:8085".
      const emulator = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
      if (emulator) {
        const [host, port] = emulator.split(":");
        connectFirestoreEmulator(db, host, Number(port) || 8080);
      }
    }
  }
  return db;
}
