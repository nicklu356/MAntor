"use client";

// Shown when a page crashes, so the learner sees a way back instead of a blank screen.
export default function Error({ error, reset }) {
  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>Something went wrong</h1>
      <p className="muted">{error?.message || "An unexpected error happened."}</p>
      <div className="row">
        <button className="btn" onClick={reset}>
          Try again
        </button>
        <a href="/" className="btn btn-ghost">
          Home
        </a>
      </div>
    </div>
  );
}
