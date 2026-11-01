"use client";

// Setup page (not linked in the menu): open /setup in the browser.
// Checks the database connection (real accounts), or resets the demo data in this browser.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { firebaseProjectId, getProjects, resetDemoData } from "@/lib/db";

export default function SetupPage() {
  const { mode, isAdmin, signedOut } = useUser();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // { ok, text }

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
      <p className="muted">
        Sample projects, mentor approvals and clean-up are on the{" "}
        {isAdmin ? <Link href="/admin">Admin page</Link> : "Admin page (admins only)"}.
        {signedOut && " Log in first."}
      </p>
    </div>
  );
}
