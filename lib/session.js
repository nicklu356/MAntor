// Which kind of session this browser is in:
//   "local" - no Firebase configured: everything lives in this browser (the original demo mode)
//   "demo"  - Firebase is configured, but the visitor chose "Try the demo": a private sandbox in
//             this browser with the sample learners and mentors, so real data is never touched
//   "auth"  - Firebase with real accounts (sign up / log in)
import { isFirebaseEnabled } from "./firebase";

const DEMO_KEY = "mantor-demo-session";

export function isDemoSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

export function getMode() {
  if (!isFirebaseEnabled) return "local";
  return isDemoSession() ? "demo" : "auth";
}

// Entering or leaving the demo reloads the app, so no state from the other mode is kept around.
export function startDemo() {
  try {
    window.localStorage.setItem(DEMO_KEY, "1");
  } catch {}
  window.location.href = "/";
}

export function exitDemo() {
  try {
    window.localStorage.removeItem(DEMO_KEY);
  } catch {}
  window.location.href = "/";
}
