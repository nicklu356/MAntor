import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>Page not found</h1>
      <p className="muted">This page does not exist, or it was moved.</p>
      <div>
        <Link href="/" className="btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}
