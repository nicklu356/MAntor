// Real accounts with Firebase Authentication (email + password, and Google).
// Only used in "auth" mode (see lib/session.js); the demo modes keep the "Viewing as" switch.
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  unlink,
} from "firebase/auth";
import { detectAdBlocker } from "./adblock";
import { firebaseAuthDomain, getFirebaseApp } from "./firebase";

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

// Name, date of birth and education are asked right after, on the "complete your profile" step.
export async function signUpWithEmail({ email, password }) {
  const { user } = await createUserWithEmailAndPassword(getAuthClient(), email.trim(), password);
  sendEmailVerification(user).catch(() => {}); // nice to have: never block sign-up on it
  return user;
}

export const logInWithEmail = (email, password) =>
  signInWithEmailAndPassword(getAuthClient(), email.trim(), password).then((r) => r.user);

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

// Google sign-in opens a Google window. It cannot work without the auth domain, and Google blocks
// it inside the in-app browsers of LINE, Instagram, Facebook and WeChat.
export function googleSignInProblem() {
  if (!firebaseAuthDomain) {
    return "Google sign-in is not set up: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing (Vercel > Settings > Environment Variables, then redeploy).";
  }
  if (typeof navigator !== "undefined" && /FBAN|FBAV|Instagram|\bLine\/|MicroMessenger|; wv\)/i.test(navigator.userAgent)) {
    return "Google does not allow sign-in inside this app's built-in browser. Open this page in Safari or Chrome, or use email and password.";
  }
  return "";
}

// Browsers only allow a pop-up window right after a click. On desktop Chrome, Edge and Firefox,
// Firebase first loads its sign-in frame from Google *after* the click, and if that takes a moment
// the browser blocks the window ("auth/popup-blocked"). Loading the frame as soon as a page with a
// Google button opens (Firebase already does this on phones and Safari) lets the click open the
// window straight away. Uses Firebase's own resolver; if that ever changes, this simply does nothing.
export function prepareGoogleSignIn() {
  try {
    const authClient = getAuthClient();
    authClient._popupRedirectResolver?._initialize?.(authClient)?.catch?.(() => {});
  } catch {
    // Not critical: the click still works, it may just be slower.
  }
}

export const logInWithGoogle = () => signInWithPopup(getAuthClient(), googleProvider()).then((r) => r.user);

// ---------- Sign-in methods on the Account page ----------

export const currentAuthUser = () => getAuthClient().currentUser;
export const signInMethods = () => (currentAuthUser()?.providerData || []).map((p) => p.providerId);

// An email account adds Google, so the same account can log in either way.
export const connectGoogle = () => linkWithPopup(currentAuthUser(), googleProvider());
export const disconnectGoogle = () => unlink(currentAuthUser(), "google.com");

// A Google account adds a password for its email.
export function addPassword(password) {
  const user = currentAuthUser();
  return linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

export const resendVerification = () => sendEmailVerification(currentAuthUser());
// Picks up "email verified" after the user clicked the link in another tab.
export const refreshAuthUser = () => reload(currentAuthUser()).then(() => currentAuthUser());

export const resetPassword = (email) => sendPasswordResetEmail(getAuthClient(), email.trim());

export const logOut = () => signOut(getAuthClient());

export const AD_BLOCKER_MESSAGE = () =>
  `Your ad blocker stopped the Google window. Pause it for ${
    typeof window === "undefined" ? "this site" : window.location.hostname
  } (or allow pop-ups in it), reload the page, and click “Continue with Google” again. Or use email and password.`;

// Errors from the Google window. Ad blockers either block the window (popup-blocked), close it
// straight away (popup-closed-by-user within a moment) or block Google's sign-in scripts.
// startedAt: when the button was clicked.
export async function explainGoogleError(error, startedAt = 0) {
  const code = error?.code || "";
  const closedInstantly = code === "auth/popup-closed-by-user" && Date.now() - startedAt < 2500;
  const suspicious =
    ["auth/popup-blocked", "auth/network-request-failed", "auth/internal-error", "auth/web-storage-unsupported"].includes(
      code
    ) || closedInstantly;
  if (suspicious && (await detectAdBlocker())) return AD_BLOCKER_MESSAGE();
  return explainAuthError(error);
}

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
    "auth/popup-blocked":
      "The browser blocked the Google window. Click “Continue with Google” once more (the second try usually works). If it is still blocked, turn off pop-up or ad blockers for this site, or use email and password.",
    "auth/unauthorized-domain": `This website's domain is not allowed to sign in yet. In Firebase open Authentication > Settings > Authorized domains and add ${
      typeof window === "undefined" ? "it" : window.location.hostname
    }.`,
    "auth/operation-not-allowed":
      "This sign-in method is switched off. In Firebase open Authentication > Sign-in method and enable it.",
    "auth/network-request-failed": "Cannot reach Firebase. Check your internet connection.",
    "auth/account-exists-with-different-credential":
      "This email already has a MAntor account with a password. Log in with your password, then connect Google on your Account page.",
    "auth/credential-already-in-use": "This Google account already belongs to another MAntor account.",
    "auth/email-already-exists": "An account with this email already exists.",
    "auth/provider-already-linked": "Google is already connected to this account.",
    "auth/no-such-provider": "Google is not connected to this account.",
    "auth/requires-recent-login": "For your security, log out, log in again, and then try once more.",
    "auth/auth-domain-config-required":
      "Google sign-in is not set up: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing (set it on Vercel, then redeploy).",
    "auth/invalid-api-key": "The Firebase API key is wrong. Check NEXT_PUBLIC_FIREBASE_API_KEY on Vercel, then redeploy.",
  };
  if (messages[code]) return messages[code];
  // Unknown problems: keep the code, so it can be looked up.
  return `${error?.message || "Something went wrong. Please try again."}${code && !String(error?.message).includes(code) ? ` (${code})` : ""}`;
}
