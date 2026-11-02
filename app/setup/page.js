"use client";

// Setup page (not linked in the menu): open /setup in the browser.
// Checks the database connection (real accounts), or resets the demo data in this browser.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { firebaseProjectId, getProjects, resetDemoData } from "@/lib/db";
import { firebaseSettings } from "@/lib/firebase";
import { useT } from "@/components/LocaleProvider";

export default function SetupPage() {
  const t = useT();
  const { mode, isAdmin, signedOut } = useUser();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // { ok, text }
  const [host, setHost] = useState("");
  const [server, setServer] = useState(null); // /api/status: missing settings, running version

  useEffect(() => {
    setHost(window.location.hostname);
    fetch("/api/status")
      .then((res) => res.json())
      .then(setServer)
      .catch(() => {});
  }, []);

  async function checkConnection() {
    setStatus({ ok: null, text: t("Checking the connection…") });
    try {
      const projects = await getProjects();
      setStatus({
        ok: true,
        text: projects.length
          ? t("Connected. The database has {n} projects.", { n: projects.length })
          : t("Connected. There are no projects yet: an admin can load the sample projects."),
      });
    } catch (e) {
      setStatus({ ok: false, text: e.message });
    }
  }

  useEffect(() => {
    if (mode === "auth") checkConnection();
  }, [mode]);

  if (!mode) return <p className="muted">{t("Loading…")}</p>;

  if (mode !== "auth") {
    return (
      <div className="card stack" style={{ maxWidth: 680 }}>
        <h1>{t("Setup")}</h1>
        <p>
          {t("Current mode:")}{" "}
          <strong>{mode === "demo" ? t("Demo (sample data in this browser)") : t("Demo data (saved in this browser)")}</strong>
        </p>
        <p className="muted">
          {t("The demo keeps its data in this browser only. Reset it before a pitch so the demo starts clean.")}
        </p>
        <div>
          <button
            className="btn"
            onClick={() => {
              resetDemoData();
              setMessage(t("Demo data reset. Reload the app to start fresh."));
            }}
          >
            {t("Reset demo data")}
          </button>
        </div>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div className="card stack" style={{ maxWidth: 680 }}>
      <h1>{t("Setup")}</h1>
      <p>
        {t("Current mode:")} <strong>{t("Firebase with accounts")}</strong> · {t("project")} <code>{firebaseProjectId}</code>
      </p>
      <div className={status?.ok === false ? "status status-error" : status?.ok ? "status status-ok" : "status"}>
        <strong>{t("Connection:")} </strong>
        {status?.text || t("Not checked yet")}
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-ghost btn-small" onClick={checkConnection}>
            {t("Check again")}
          </button>
        </div>
      </div>
      {server && (
        <section className="stack">
          <h2>{t("Server settings")}</h2>
          <p className="small">
            {t("Running version: {version}", { version: server.version })} ·{" "}
            {server.missing?.length ? (
              <>
                {t("The server cannot see:")}{" "}
                {server.missing.map((name) => (
                  <code key={name} style={{ marginRight: 6 }}>
                    {name}
                  </code>
                ))}
              </>
            ) : (
              t("All optional server settings are set.")
            )}
          </p>
        </section>
      )}
      <section className="stack">
        <h2>{t("Firebase settings in this deployment")}</h2>
        <ul className="list-plain small">
          {firebaseSettings.map((s) => (
            <li key={s.name}>
              <span className={s.ok ? "badge badge-green" : "badge badge-amber"}>{s.ok ? t("Set") : t("Missing")}</span>{" "}
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
          <strong>{t("Google sign-in checklist")}</strong>
          <ol className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li>
              <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>{" "}
              {t("above is set (normally {domain})", { domain: `${firebaseProjectId}.firebaseapp.com` })}
            </li>
            <li>{t("Firebase > Authentication > Sign-in method: Google is enabled (with a support email)")}</li>
            <li>
              {t("Firebase > Authentication > Settings > Authorized domains includes")} <code>{host || t("this site's domain")}</code>
            </li>
            <li>{t("The page is open in Safari, Chrome, Edge or Firefox, not inside LINE, Instagram or Facebook")}</li>
          </ol>
        </div>
      </section>
      <p className="muted">
        {t("Sample projects, mentor approvals and clean-up are on the")}{" "}
        {isAdmin ? <Link href="/admin">{t("Admin page")}</Link> : t("Admin page (admins only)")}
        {t(".")}
        {signedOut && ` ${t("Log in first.")}`}
      </p>
    </div>
  );
}
