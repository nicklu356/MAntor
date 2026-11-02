"use client";

// Shown when a page crashes, so the learner sees a way back instead of a blank screen.
import { useT } from "@/components/LocaleProvider";

export default function Error({ error, reset }) {
  const t = useT();
  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>{t("Something went wrong")}</h1>
      <p className="muted">{error?.message || t("An unexpected error happened.")}</p>
      <div className="row">
        <button className="btn" onClick={reset}>
          {t("Try again")}
        </button>
        <a href="/" className="btn btn-ghost">
          {t("Home")}
        </a>
      </div>
    </div>
  );
}
