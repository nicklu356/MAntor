"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import { APP_NAME } from "@/lib/config";
import { exitDemo } from "@/lib/session";
import { useUser } from "./UserProvider";

export default function Header() {
  const pathname = usePathname();
  const { mode, users, currentUser, isMentor, isAdmin, switchUser, userName, loaded, dataError, signedOut } = useUser();
  const learners = users.filter((u) => u.role === "learner");
  const mentors = users.filter((u) => u.role === "mentor");

  // Is real AI switched on (an API key exists on the server) or simulated?
  const [ai, setAi] = useState(null);
  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setAi(Boolean(data.ai)))
      .catch(() => setAi(false));
  }, []);

  const nav = [
    { href: "/", label: "Home" },
    ...(isMentor ? [] : [{ href: "/assessment", label: "Assessment" }]),
    { href: "/projects", label: "Projects" },
    ...(isMentor ? [{ href: "/projects/new", label: "New project" }] : []),
    ...(!isMentor && currentUser ? [{ href: `/portfolio/${currentUser.id}`, label: "Portfolio" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  // The most specific matching link is the active one ("/projects/new" beats "/projects").
  const active = nav
    .filter((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="header">
      <div className="container header-inner">
        {/* The home banner already shows the big wordmark, so the small logo is hidden there. */}
        <Link href="/" className={pathname === "/" ? "logo logo-hidden" : "logo"}>
          {APP_NAME}
        </Link>
        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={item.href === active ? "nav-link active" : "nav-link"}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-right">
          {mode === "demo" && (
            <span className="badge badge-amber" title="Sample data in this browser only">
              Demo
            </span>
          )}
          {isMentor && (
            <span className="badge badge-blue" title="Learners appear by anonymous name until they choose to share it">
              Mentor view
            </span>
          )}
          {/* Only worth showing when AI answers are simulated (no API key on the server). */}
          {ai === false && <span className="badge badge-amber">AI: Simulated</span>}
          {mode === "local" && <span className="badge badge-amber">Demo data</span>}
          {currentUser && <NotificationBell />}

          {/* Demo: pick which sample person you are. Mentors see anonymous names here too. */}
          {mode !== "auth" && users.length > 0 && (
            <label className="user-switch">
              <span className="muted small viewing-as">Viewing as</span>
              <select
                value={currentUser?.id || ""}
                onChange={(e) => switchUser(e.target.value)}
                aria-label="Switch demo user"
              >
                <optgroup label="Learners">
                  {learners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userName(u.id)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mentors">
                  {mentors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (mentor)
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}
          {mode === "demo" && (
            <button className="btn btn-ghost btn-small" onClick={exitDemo}>
              Exit demo
            </button>
          )}

          {/* Real accounts */}
          {mode === "auth" && currentUser && (
            <Link href="/account" className="account-chip" title="Your account">
              <span className="account-avatar" aria-hidden="true">
                {(currentUser.name || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span className="account-name">{currentUser.name}</span>
            </Link>
          )}
          {signedOut && (
            <>
              <Link href="/login" className="btn btn-ghost btn-small">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-small">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      {pathname !== "/setup" && dataError && (
        <div className="data-banner" role="alert">
          <div className="container">
            <strong>Database problem:</strong> {dataError} <Link href="/setup">Open setup →</Link>
          </div>
        </div>
      )}
      {pathname !== "/setup" && mode !== "auth" && !dataError && loaded && users.length === 0 && (
        <div className="data-banner" role="status">
          <div className="container">
            <strong>The database is empty.</strong> <Link href="/setup">Load the demo data on the setup page →</Link>
          </div>
        </div>
      )}
    </header>
  );
}
