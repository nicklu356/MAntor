"use client";

// Setup page (not linked in the menu): open /setup in the browser.
// Checks the database connection, loads the demo data into Firebase, or resets demo mode.
import { useEffect, useState } from "react";
import { firebaseProjectId, getUsers, isFirebaseEnabled, resetDemoData, seedFirebase } from "@/lib/db";

export default function SetupPage() {
  const [message, setMessage] = useState(null); // { tone: "ok" | "error", text }
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { ok, text }

  async function checkConnection() {
    setStatus({ ok: null, text: "Checking the connection…" });
    try {
      const users = await getUsers();
      setStatus({
        ok: true,
        text: users.length
          ? `Connected. The database has ${users.length} users.`
          : "Connected. The database is empty: load the demo data below.",
      });
    } catch (e) {
      setStatus({ ok: false, text: e.message });
    }
  }

  useEffect(() => {
    if (isFirebaseEnabled) checkConnection();
  }, []);

  async function handleSeed() {
    setBusy(true);
    setMessage(null);
    try {
      await seedFirebase();
      setMessage({ tone: "ok", text: "Demo data loaded into Firebase. Reload the app to see it." });
      checkConnection();
    } catch (e) {
      setMessage({ tone: "error", text: e.message });
    }
    setBusy(false);
  }

  function handleReset() {
    resetDemoData();
    setMessage({ tone: "ok", text: "Demo data reset. Reload the app to start fresh." });
  }

  return (
    <div className="card stack" style={{ maxWidth: 680 }}>
      <h1>Setup</h1>
      <p>
        Current mode: <strong>{isFirebaseEnabled ? "Firebase" : "Demo data (saved in this browser)"}</strong>
        {isFirebaseEnabled && (
          <>
            {" "}
            · project <code>{firebaseProjectId}</code>
          </>
        )}
      </p>
      {isFirebaseEnabled ? (
        <>
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
            Copies the users, projects and example teams from <code>lib/seed.js</code> into your Firestore database.
            Running it again resets those records (anything else you created stays).
          </p>
          <div>
            <button className="btn" onClick={handleSeed} disabled={busy}>
              {busy ? "Loading… (up to 15 seconds)" : "Load demo data into Firebase"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">
            Demo mode keeps data in this browser only. Reset it before a pitch so the demo starts clean.
          </p>
          <div>
            <button className="btn" onClick={handleReset}>
              Reset demo data
            </button>
          </div>
        </>
      )}
      {message && <p className={message.tone === "error" ? "error" : ""}>{message.text}</p>}
    </div>
  );
}
