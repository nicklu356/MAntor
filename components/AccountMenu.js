"use client";

// The account button in the header (real accounts): photo, name and ▾. It opens a small menu with
// who you are, links to your account settings and portfolio, the language, and Log out.
// Closes on a click outside, on Escape, and when you go to another page.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { useLocale } from "@/components/LocaleProvider";
import { useUser } from "@/components/UserProvider";

export default function AccountMenu() {
  const { t, locale, setLocale } = useLocale();
  const { currentUser, authInfo, isAdmin, isMentor, signOut } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const button = useRef(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!currentUser) return null;

  const role = isMentor ? t("Mentor") : t("Learner");
  return (
    <div className="account-menu" ref={box}>
      <button
        ref={button}
        type="button"
        className="account-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("Your account")}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar id={currentUser.id} size={32} />
        <span className="account-name">{currentUser.name}</span>
        <span className={open ? "chevron chevron-up" : "chevron"} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-head">
            <strong>{currentUser.name}</strong>
            {authInfo?.email && <div className="muted small">{authInfo.email}</div>}
            <div className="muted small">
              {role}
              {isAdmin ? ` · ${t("Admin")}` : ""}
              {!isMentor && currentUser.anonymousName ? ` · ${t("mentors see you as {anon}", { anon: currentUser.anonymousName })}` : ""}
            </div>
          </div>
          <Link href="/account" role="menuitem" className="account-dropdown-item">
            {t("Account settings")}
          </Link>
          {!isMentor && (
            <Link href={`/portfolio/${currentUser.id}`} role="menuitem" className="account-dropdown-item">
              {t("My portfolio")}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" role="menuitem" className="account-dropdown-item">
              {t("Admin")}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="account-dropdown-item"
            onClick={() => {
              setOpen(false);
              setLocale(locale === "en" ? "zh-TW" : "en");
            }}
          >
            {locale === "en" ? "中文" : "English"}
          </button>
          <div className="account-dropdown-sep" />
          <button
            type="button"
            role="menuitem"
            className="account-dropdown-item"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            {t("Log out")}
          </button>
        </div>
      )}
    </div>
  );
}
