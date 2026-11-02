// Asks the server to email the people an action concerns (real accounts only; see app/api/notify).
// Fire and forget: the action already succeeded, so a failed email never shows an error.
import { currentAuthUser } from "./auth";
import { getMode } from "./session";

export function notify(event, id) {
  if (getMode() !== "auth" || !id) return;
  const user = currentAuthUser();
  if (!user) return;
  user
    .getIdToken()
    .then((token) =>
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event, id }),
        keepalive: true, // still sent if the page changes right after
      })
    )
    .catch(() => {});
}
