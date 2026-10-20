"use client";

// Browse projects. Projects that match the learner's career field are shown first.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { DIFFICULTIES } from "@/lib/config";
import { getProjects } from "@/lib/db";

export default function ProjectsPage() {
  const { currentUser, isMentor } = useUser();
  const [projects, setProjects] = useState(null);
  const [field, setField] = useState("All");
  const [difficulty, setDifficulty] = useState("Any");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getProjects().then(setProjects);
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
    const match = (p) =>
      isMentor ? (p.mentorId === currentUser?.id ? 0 : 1) : p.field === currentUser?.careerField ? 0 : 1;
    return [...list].sort((a, b) => match(a) - match(b));
  }, [projects, field, difficulty, search, currentUser, isMentor]);

  return (
    <div>
      <div className="spread">
        <div>
          <h1>Projects</h1>
          <p className="muted">
            Realistic workplace scenarios from industry mentors. Pick one and work on it with a team.
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
          Not sure which project fits you? <Link href="/assessment">Take the career assessment</Link> to see matches first.
        </p>
      )}

      <div className="filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects, companies or skills"
          aria-label="Search projects"
          className="search"
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
          <option value="Any">Any level</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="chips">
        {fields.map((f) => (
          <button key={f} className={f === field ? "chip active" : "chip"} onClick={() => setField(f)}>
            {f}
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
          No projects match. Try another field or clear the search.
        </p>
      )}

      <div className="grid">
        {visible.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card project-card">
            <div className="row">
              <span className="badge badge-blue">{p.field}</span>
              {!isMentor && p.field === currentUser?.careerField && (
                <span className="badge badge-green">Matches your result</span>
              )}
              {isMentor && p.mentorId === currentUser?.id && <span className="badge badge-green">Your project</span>}
            </div>
            <h3>{p.title}</h3>
            <p className="desc">{p.description}</p>
            <span className="muted small">
              {p.company} · {p.difficulty} · teams of {p.teamSize} · {(p.taskTemplates || []).length} tasks
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
