"use client";

// With real accounts, most pages need a signed-in user. Signed-out visitors can still see the
// home page, About, and the project catalogue; everything else asks them to log in or try the demo.
// Signed-in users who have not filled in their basic details are asked for them first.
import Link from "next/link";
import { usePathname } from "next/navigation";
import PhotoPicker from "./PhotoPicker";
import ProfileForm from "./ProfileForm";
import { useUser } from "./UserProvider";
import { startDemo } from "@/lib/session";
import { useT } from "./LocaleProvider";

const isPublic = (path) =>
  path === "/" ||
  path === "/about" ||
  path === "/privacy" ||
  path === "/login" ||
  path === "/signup" ||
  path === "/projects" ||
  path.startsWith("/p/") ||
  (/^\/projects\/[^/]+$/.test(path) && path !== "/projects/new");

export default function AuthGate({ children }) {
  const t = useT();
  const pathname = usePathname();
  const { signedOut, currentUser, profileComplete } = useUser();

  // New accounts (and older ones missing details) complete their profile before anything else.
  if (currentUser && !profileComplete && !["/about", "/privacy"].includes(pathname) && !pathname.startsWith("/p/")) {
    return (
      <div className="card stack" style={{ maxWidth: 760 }}>
        <div>
          <div className="eyebrow">{t("One last step")}</div>
          <h1>{t("Complete your profile")}</h1>
          <p className="muted">
            {t(
              "The basics, like the first page of a job application. It takes a minute, and you can change it later on your Account page."
            )}
          </p>
        </div>
        <PhotoPicker />
        <ProfileForm submitLabel={t("Save and continue")} />
      </div>
    );
  }

  if (!signedOut || isPublic(pathname)) return children;

  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>{t("Log in to continue")}</h1>
      <p className="muted">
        {t("You need an account to see this page. Or look around with the sample learners and mentors first.")}
      </p>
      <div className="row">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn">
          {t("Log in")}
        </Link>
        <Link href="/signup" className="btn btn-secondary">
          {t("Sign up")}
        </Link>
        <button className="btn btn-ghost" onClick={startDemo}>
          {t("Try the demo")}
        </button>
      </div>
    </div>
  );
}
