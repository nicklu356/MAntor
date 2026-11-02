"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import LanguageMenu from "./LanguageMenu";
import NotificationBell from "./NotificationBell";
import { APP_NAME } from "@/lib/config";
import { exitDemo } from "@/lib/session";
import { useUser } from "./UserProvider";
import { useLocale } from "./LocaleProvider";

export default function Header() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { mode, users, currentUser, isMentor, isAdmin, switchUser, userName, loaded, dataError, signedOut } = useUser();
  const learners = users.filter((u) => u.role === "learner");
  const mentors = users.filter((u) => u.role === "mentor");

  // Is real AI switched on (an API key exists on the server) or simulated?
  const [ai, setAi] = useState(null);
  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setAi(Boolean(data.ai)))
      .catch(() => setAi(null)); // unknown: show no badge rather than a wrong one
  }, []);

  const nav = [
    { href: "/", label: t("Home") },
    ...(isMentor ? [] : [{ href: "/assessment", label: t("Assessment") }]),
    { href: "/projects", label: t("Projects") },
    ...(isMentor ? [{ href: "/projects/new", label: t("New project") }] : []),
    ...(!isMentor && currentUser ? [{ href: `/portfolio/${currentUser.id}`, label: t("Portfolio") }] : []),
    ...(isAdmin ? [{ href: "/admin", label: t("Admin") }] : []),
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
            <span className="badge badge-amber" title={t("Sample data in this browser only")}>
              {t("Demo")}
            </span>
          )}
          {isMentor && (
            <span className="badge badge-blue" title={t("Learners appear by anonymous name until they choose to share it")}>
              {t("Mentor view")}
            </span>
          )}
          {/* Only worth showing when AI answers are simulated (no API key on the server). */}
          {ai === false && <span className="badge badge-amber">{t("AI: Simulated")}</span>}
          {mode === "local" && <span className="badge badge-amber">{t("Demo data")}</span>}
          {currentUser && <NotificationBell />}

          {/* Demo: pick which sample person you are. Mentors see anonymous names here too. */}
          {mode !== "auth" && users.length > 0 && (
            <label className="user-switch">
              <span className="muted small viewing-as">{t("Viewing as")}</span>
              <select
                value={currentUser?.id || ""}
                onChange={(e) => switchUser(e.target.value)}
                aria-label={t("Switch demo user")}
              >
                <optgroup label={t("Learners")}>
                  {learners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userName(u.id)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("Mentors")}>
                  {mentors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({t("mentor")})
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}
          {mode === "demo" && (
            <button className="btn btn-ghost btn-small" onClick={exitDemo}>
              {t("Exit demo")}
            </button>
          )}

          <LanguageMenu />

          {/* Real accounts */}
          {mode === "auth" && currentUser && <AccountMenu />}
          {signedOut && (
            <>
              <Link href="/login" className="btn btn-ghost btn-small">
                {t("Log in")}
              </Link>
              <Link href="/signup" className="btn btn-small">
                {t("Sign up")}
              </Link>
            </>
          )}
        </div>
      </div>
      {pathname !== "/setup" && dataError && (
        <div className="data-banner" role="alert">
          <div className="container">
            <strong>{t("Database problem:")}</strong> {dataError} <Link href="/setup">{t("Open setup →")}</Link>
          </div>
        </div>
      )}
      {pathname !== "/setup" && mode !== "auth" && !dataError && loaded && users.length === 0 && (
        <div className="data-banner" role="status">
          <div className="container">
            <strong>{t("The database is empty.")}</strong>{" "}
            <Link href="/setup">{t("Load the demo data on the setup page →")}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
