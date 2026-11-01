"use client";

// Setup page (not linked in the menu): open /setup in the browser.
// Checks the database connection (real accounts), or resets the demo data in this browser.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { firebaseProjectId, getProjects, resetDemoData } from "@/lib/db";
import { firebaseSettings } from "@/lib/firebase";

export default function SetupPage() {
  const { mode, isAdmin, signedOut } = useUser();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // { ok, text }
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  async function checkConnection() {
    setStatus({ ok: null, text: "Checking the connection…" });
    try {
      const projects = await getProjects();
      setStatus({
        ok: true,
        text: projects.length
          ? `Connected. The database has ${projects.length} projects.`
          : "Connected. There are no projects yet: an admin can load the sample projects.",
      });
    } catch (e) {
      setStatus({ ok: false, text: e.message });
    }
  }

  useEffect(() => {
    if (mode === "auth") checkConnection();
  }, [mode]);

  if (!mode) return <p className="muted">Loading…</p>;

  if (mode !== "auth") {
    return (
      <div className="card stack" style={{ maxWidth: 680 }}>
        <h1>Setup</h1>
        <p>
          Current mode: <strong>{mode === "demo" ? "Demo (sample data in this browser)" : "Demo data (saved in this browser)"}</strong>
        </p>
        <p className="muted">The demo keeps its data in this browser only. Reset it before a pitch so the demo starts clean.</p>
        <div>
          <button
            className="btn"
            onClick={() => {
              resetDemoData();
              setMessage("Demo data reset. Reload the app to start fresh.");
            }}
          >
            Reset demo data
          </button>
        </div>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div className="card stack" style={{ maxWidth: 680 }}>
      <h1>Setup</h1>
      <p>
        Current mode: <strong>Firebase with accounts</strong> · project <code>{firebaseProjectId}</code>
      </p>
      <div className={status?.ok === false ? "status status-error" : status?.ok ? "status status-ok" : "status"}>
        <strong>Connection: </strong>
        {status?.text || "Not checked yet"}
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-ghost btn-small" onClick={checkConnection}>
            Check again
          </button>
        </div>
      </div>
      <section className="stack">
        <h2>Firebase settings in this deployment</h2>
        <ul className="list-plain small">
          {firebaseSettings.map((s) => (
            <li key={s.name}>
              <span className={s.ok ? "badge badge-green" : "badge badge-amber"}>{s.ok ? "Set" : "Missing"}</span>{" "}
              <code>{s.name}</code>
              {s.value && (
                <>
                  {" "}
                  = <code>{s.value}</code>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="status">
          <strong>Google sign-in checklist</strong>
          <ol className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li>
              <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code> above is set (normally <code>{firebaseProjectId}.firebaseapp.com</code>)
            </li>
            <li>Firebase &gt; Authentication &gt; Sign-in method: Google is enabled (with a support email)</li>
            <li>
              Firebase &gt; Authentication &gt; Settings &gt; Authorized domains includes <code>{host || "this site's domain"}</code>
            </li>
            <li>The page is open in Safari, Chrome, Edge or Firefox, not inside LINE, Instagram or Facebook</li>
          </ol>
        </div>
      </section>
      <p className="muted">
        Sample projects, mentor approvals and clean-up are on the{" "}
        {isAdmin ? <Link href="/admin">Admin page</Link> : "Admin page (admins only)"}.
        {signedOut && " Log in first."}
      </p>
    </div>
  );
}
