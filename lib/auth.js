// Real accounts with Firebase Authentication (email + password, and Google).
// Only used in "auth" mode (see lib/session.js); the demo modes keep the "Viewing as" switch.
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseApp } from "./firebase";

let auth = null;

export function getAuthClient() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    // Optional: the local Auth emulator, e.g. "127.0.0.1:9099" (see README).
    const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulator) connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  }
  return auth;
}

export const watchAuth = (callback) => onAuthStateChanged(getAuthClient(), callback);

export async function signUpWithEmail({ name, email, password }) {
  const { user } = await createUserWithEmailAndPassword(getAuthClient(), email.trim(), password);
  await updateProfile(user, { displayName: name.trim() });
  return user;
}

export const logInWithEmail = (email, password) =>
  signInWithEmailAndPassword(getAuthClient(), email.trim(), password).then((r) => r.user);

export const logInWithGoogle = () => signInWithPopup(getAuthClient(), new GoogleAuthProvider()).then((r) => r.user);

export const resetPassword = (email) => sendPasswordResetEmail(getAuthClient(), email.trim());

export const logOut = () => signOut(getAuthClient());

// Firebase error codes in plain English.
export function explainAuthError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
    "auth/invalid-email": "That email address does not look right.",
    "auth/weak-password": "Use a password of at least 6 characters.",
    "auth/invalid-credential": "The email or password is wrong.",
    "auth/wrong-password": "The email or password is wrong.",
    "auth/user-not-found": "There is no account with this email. Sign up first.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before signing in.",
    "auth/cancelled-popup-request": "The Google window was closed before signing in.",
    "auth/popup-blocked": "The browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain":
      "This website's domain is not allowed to sign in yet. In Firebase open Authentication > Settings > Authorized domains and add it.",
    "auth/operation-not-allowed":
      "This sign-in method is switched off. In Firebase open Authentication > Sign-in method and enable it.",
    "auth/network-request-failed": "Cannot reach Firebase. Check your internet connection.",
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}
