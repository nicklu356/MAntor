"use client";

// Browse projects. Projects that match the learner's career field are shown first.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { matchPercent } from "@/lib/assessment";
import { DIFFICULTIES } from "@/lib/config";
import { getProjects } from "@/lib/db";
import { useT } from "@/components/LocaleProvider";

export default function ProjectsPage() {
  const t = useT();
  const { currentUser, isMentor } = useUser();
  const [projects, setProjects] = useState(null);
  const [field, setField] = useState("All");
  const [difficulty, setDifficulty] = useState("Any");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getProjects().then(setProjects);
    // /projects?field=UX%20Design (links from the assessment result) opens that field.
    const wanted = new URLSearchParams(window.location.search).get("field");
    if (wanted) setField(wanted);
  }, []);

  const fields = useMemo(
    () => ["All", ...new Set((projects || []).map((p) => p.field))],
    [projects]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (projects || []).filter(
      (p) =>
        (field === "All" || p.field === field) &&
        (difficulty === "Any" || p.difficulty === difficulty) &&
        (!q || [p.title, p.description, p.company, ...(p.criteria || []).map((c) => c.name)].join(" ").toLowerCase().includes(q))
    );
    // Mentors: their own projects first. Learners: best fit first (from the assessment).
    const rank = (p) =>
      isMentor
        ? p.mentorId === currentUser?.id ? 0 : 1
        : -(matchPercent(currentUser, p.field) ?? (p.field === currentUser?.careerField ? 100 : 0));
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [projects, field, difficulty, search, currentUser, isMentor]);

  return (
    <div>
      <div className="spread">
        <div>
          <h1>{t("Projects")}</h1>
          <p className="muted">
            {t("Realistic workplace scenarios from industry mentors. Pick one and work on it with a team.")}
          </p>
        </div>
        {isMentor && (
          <Link href="/projects/new" className="btn">
            + New project
          </Link>
        )}
      </div>

      {!isMentor && currentUser && !currentUser.careerField && (
        <p className="card">
          {t("Not sure which project fits you?")} <Link href="/assessment">{t("Take the career assessment")}</Link>{" "}
          {t("to see matches first.")}
        </p>
      )}

      <div className="filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search projects, companies or skills")}
          aria-label={t("Search projects")}
          className="search"
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
          <option value="Any">{t("Any level")}</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {t(d[0].toUpperCase() + d.slice(1))}
            </option>
          ))}
        </select>
      </div>

      <div className="chips">
        {fields.map((f) => (
          <button key={f} className={f === field ? "chip active" : "chip"} onClick={() => setField(f)}>
            {f === "All" ? t("All") : t(f)}
          </button>
        ))}
      </div>

      {projects === null && (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card skeleton" />
          ))}
        </div>
      )}
      {projects && visible.length === 0 && (
        <p className="card muted">
          {t("No projects match. Try another field or clear the search.")}
        </p>
      )}

      <div className="grid">
        {visible.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card project-card">
            <div className="row">
              <span className="badge badge-blue">{t(p.field)}</span>
              {!isMentor && p.field === currentUser?.careerField && (
                <span className="badge badge-green">{t("Best match")}</span>
              )}
              {!isMentor && matchPercent(currentUser, p.field) != null && (
                <span className="badge">{t("{percent}% fit", { percent: matchPercent(currentUser, p.field) })}</span>
              )}
              {isMentor && p.mentorId === currentUser?.id && <span className="badge badge-green">{t("Your project")}</span>}
            </div>
            <h3>{p.title}</h3>
            <p className="desc">{p.description}</p>
            <span className="muted small">
              {p.company} · {t(p.difficulty)} ·{" "}
              {t("teams of {n} · {tasks} tasks", { n: p.teamSize, tasks: (p.taskTemplates || []).length })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
