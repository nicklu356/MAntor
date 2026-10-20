"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import { APP_NAME } from "@/lib/config";
import { isFirebaseEnabled } from "@/lib/db";
import { useUser } from "./UserProvider";

export default function Header() {
  const pathname = usePathname();
  const { users, currentUser, isMentor, switchUser, userName } = useUser();
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
          {isMentor && <span className="badge badge-blue">Mentor view · learner names hidden</span>}
          {ai !== null && (
            <span className={ai ? "badge badge-green" : "badge badge-amber"}>
              {ai ? "AI: Live" : "AI: Simulated"}
            </span>
          )}
          <span className={isFirebaseEnabled ? "badge badge-green" : "badge badge-amber"}>
            {isFirebaseEnabled ? "Firebase" : "Demo data"}
          </span>
          <NotificationBell />
          <label className="user-switch">
            <span className="muted small">Viewing as</span>
            <select
              value={currentUser?.id || ""}
              onChange={(e) => switchUser(e.target.value)}
              aria-label="Switch demo user"
            >
              {/* In mentor view even this demo switch goes through userName(), so no hidden name is on screen. */}
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
        </div>
      </div>
    </header>
  );
}
