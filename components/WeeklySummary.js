"use client";

// Mentor home: "Your week" summary across every team, written by AI from the week's facts.
// The last summary is kept in this browser, so it is there when the mentor comes back.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useUser } from "@/components/UserProvider";
import { timeAgo } from "@/lib/format";
import { weekStats } from "@/lib/weeklySummary";

const TONE = { on_track: "badge badge-green", needs_attention: "badge badge-amber", stuck: "badge badge-late" };
const LABEL = { on_track: "On track", needs_attention: "Needs attention", stuck: "Stuck" };

const storageKey = (mentorId) => `mantor-week-summary-${mentorId}`;
function readSaved(mentorId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(mentorId)) || "null");
  } catch {
    return null;
  }
}

export default function WeeklySummary({ teams }) {
  const { t, locale } = useLocale();
  const { currentUser, users } = useUser();
  const [saved, setSaved] = useState(null); // { at, locale, stats, result }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSaved(readSaved(currentUser.id)), [currentUser.id]);

  const active = teams.filter((team) => team.status === "active");
  if (!active.length) return null;

  async function summarise() {
    setBusy(true);
    setError("");
    try {
      const anonymousName = (id) => users.find((u) => u.id === id)?.anonymousName || t("A learner");
      const stats = weekStats(active, { anonymousName });
      const res = await fetch("/api/mentor-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, locale }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t("Something went wrong"));
      const next = { at: new Date().toISOString(), locale, stats, result };
      setSaved(next);
      try {
        localStorage.setItem(storageKey(currentUser.id), JSON.stringify(next));
      } catch {}
    } catch (e) {
      setError(e.message || t("Something went wrong"));
    }
    setBusy(false);
  }

  const result = saved?.result;
  const factsOf = (teamId) => saved?.stats?.teams.find((s) => s.teamId === teamId);

  return (
    <section className="card stack">
      <div className="spread">
        <div>
          <h2>{t("Your week")}</h2>
          <p className="muted small">
            {result
              ? t("Summary from {when}.", { when: timeAgo(saved.at, Date.now(), t) })
              : t("A short summary of every team's week, and one thing you could do for each.")}
          </p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={summarise} disabled={busy}>
          {busy ? t("Summarising…") : result ? t("Refresh") : t("Summarise my week")}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <p>
            {result.simulated && <span className="badge">{t("Simulated")}</span>} {result.overview}
          </p>
          {result.priorities?.length > 0 && (
            <div>
              <div className="eyebrow">{t("Do first")}</div>
              <ol className="small" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {result.priorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </div>
          )}
          <ul className="list-plain">
            {result.teams.map((team) => {
              const facts = factsOf(team.teamId);
              return (
                <li key={team.teamId}>
                  <div className="spread">
                    <Link href={`/teams/${team.teamId}`}>
                      <strong>{facts?.project || t("Team")}</strong>
                    </Link>
                    <span className={TONE[team.status]}>{t(LABEL[team.status])}</span>
                  </div>
                  {facts?.members?.length > 0 && <div className="muted small">{facts.members.join(", ")}</div>}
                  <div className="small">{team.headline}</div>
                  <div className="small">
                    <strong>{t("Try:")}</strong> {team.suggestion}
                  </div>
                </li>
              );
            })}
          </ul>
          {saved.locale !== locale && <p className="muted small">{t("Refresh to get it in this language.")}</p>}
        </>
      )}
    </section>
  );
}
