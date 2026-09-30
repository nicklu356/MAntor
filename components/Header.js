"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { isFirebaseEnabled } from "@/lib/db";
import { useUser } from "./UserProvider";

export default function Header() {
  const pathname = usePathname();
  const { users, currentUser, isMentor, switchUser } = useUser();
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
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          {APP_NAME}
        </Link>
        <nav className="nav">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-link active" : "nav-link"}>
                {item.label}
              </Link>
            );
          })}
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
          <label className="user-switch">
            <span className="muted small">Viewing as</span>
            <select
              value={currentUser?.id || ""}
              onChange={(e) => switchUser(e.target.value)}
              aria-label="Switch demo user"
            >
              {/* In mentor view even this demo switch shows anonymous names, so no real name is ever on screen. */}
              <optgroup label="Learners">
                {learners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {isMentor ? u.anonymousName : u.name}
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
