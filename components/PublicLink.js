"use client";

// On your own portfolio: switch the public link on or off, and copy it for a CV or LinkedIn.
// The public page (/p/<id>) is built by the server and needs FIREBASE_SERVICE_ACCOUNT.
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { useUser } from "./UserProvider";
import { updateUser } from "@/lib/db";

export default function PublicLink() {
  const toast = useToast();
  const { currentUser, refreshUsers } = useUser();
  const [serverReady, setServerReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const isPublic = Boolean(currentUser.portfolioPublic);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/p/${currentUser.id}`;

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setServerReady(Boolean(d.admin)))
      .catch(() => setServerReady(false));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      await updateUser(currentUser.id, { portfolioPublic: !isPublic });
      await refreshUsers();
      toast(isPublic ? "Your portfolio is private again" : "Your portfolio is public");
    } catch (e) {
      toast(e.message || "Could not change it", "error");
    }
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Could not copy the link", "error");
    }
  }

  return (
    <section className="card stack no-print">
      <div className="spread">
        <div>
          <h2>Public link</h2>
          <p className="muted small">
            Share your experience on a CV or LinkedIn. Anyone with the link sees your name, photo, education (not your
            date of birth), projects, verified scores and mentors&apos; feedback. No login needed.
          </p>
        </div>
        <span className={isPublic ? "badge badge-green" : "badge"}>{isPublic ? "Public" : "Private"}</span>
      </div>
      {serverReady === false && (
        <p className="notice small">
          Public portfolios need the server key (FIREBASE_SERVICE_ACCOUNT, see README). Until it is set, the link shows
          “unavailable”.
        </p>
      )}
      <div className="row">
        <button className={isPublic ? "btn btn-ghost btn-small" : "btn btn-small"} onClick={toggle} disabled={busy}>
          {isPublic ? "Make private" : "Make public"}
        </button>
        {isPublic && (
          <>
            <code className="small public-url">{url}</code>
            <button className="btn btn-secondary btn-small" onClick={copy}>
              Copy link
            </button>
            <a className="small" href={url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </>
        )}
      </div>
    </section>
  );
}
