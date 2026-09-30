"use client";

// Setup page (not linked in the menu): open /setup in the browser.
// Loads the demo data into Firebase, or resets demo mode.
import { useState } from "react";
import { isFirebaseEnabled, resetDemoData, seedFirebase } from "@/lib/db";

export default function SetupPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSeed() {
    setBusy(true);
    setMessage("");
    try {
      await seedFirebase();
      setMessage("Demo data loaded into Firebase. Reload the app to see it.");
    } catch (e) {
      setMessage(`Failed: ${e.message}. Check your Firestore rules and .env.local values.`);
    }
    setBusy(false);
  }

  function handleReset() {
    resetDemoData();
    setMessage("Demo data reset. Reload the app to start fresh.");
  }

  return (
    <div className="card stack" style={{ maxWidth: 640 }}>
      <h1>Setup</h1>
      <p>
        Current mode: <strong>{isFirebaseEnabled ? "Firebase" : "Demo data (saved in this browser)"}</strong>
      </p>
      {isFirebaseEnabled ? (
        <>
          <p className="muted">
            Copies the projects, users and example team from <code>lib/seed.js</code> into your Firestore
            database. Running it again overwrites those records.
          </p>
          <div>
            <button className="btn" onClick={handleSeed} disabled={busy}>
              {busy ? "Loading…" : "Load demo data into Firebase"}
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
      {message && <p>{message}</p>}
    </div>
  );
}
