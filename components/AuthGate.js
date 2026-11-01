"use client";

// With real accounts, most pages need a signed-in user. Signed-out visitors can still see the
// home page, About, and the project catalogue; everything else asks them to log in or try the demo.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "./UserProvider";
import { startDemo } from "@/lib/session";

const isPublic = (path) =>
  path === "/" ||
  path === "/about" ||
  path === "/login" ||
  path === "/signup" ||
  path === "/projects" ||
  (/^\/projects\/[^/]+$/.test(path) && path !== "/projects/new");

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const { signedOut } = useUser();
  if (!signedOut || isPublic(pathname)) return children;

  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>Log in to continue</h1>
      <p className="muted">You need an account to see this page. Or look around with the sample learners and mentors first.</p>
      <div className="row">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-secondary">
          Sign up
        </Link>
        <button className="btn btn-ghost" onClick={startDemo}>
          Try the demo
        </button>
      </div>
    </div>
  );
}
