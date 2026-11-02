"use client";

// The account button in the header (real accounts): photo, name and ▾. It opens a small menu with
// who you are, your portfolio, account settings and Log out.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useLocale } from "@/components/LocaleProvider";
import { useUser } from "@/components/UserProvider";
import { useDropdown } from "@/components/useDropdown";

export default function AccountMenu() {
  const { t } = useLocale();
  const { currentUser, authInfo, isAdmin, isMentor, signOut } = useUser();
  const { open, setOpen, box, button } = useDropdown();
  if (!currentUser) return null;

  return (
    <div className="header-menu" ref={box}>
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
              {isMentor ? t("Mentor") : t("Learner")}
              {isAdmin ? ` · ${t("Admin")}` : ""}
            </div>
            {!isMentor && currentUser.anonymousName && (
              <div className="muted small" title={t("Mentors see you by this name")}>
                {currentUser.anonymousName}
              </div>
            )}
          </div>
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
          <Link href="/account" role="menuitem" className="account-dropdown-item">
            {t("Account settings")}
          </Link>
          <div className="account-dropdown-sep" />
          <button
            type="button"
            role="menuitem"
            className="account-dropdown-item danger"
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
