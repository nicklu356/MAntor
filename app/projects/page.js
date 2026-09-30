"use client";

// Browse projects. Projects that match the learner's career field are shown first.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { getProjects } from "@/lib/db";

export default function ProjectsPage() {
  const { currentUser, isMentor } = useUser();
  const [projects, setProjects] = useState(null);
  const [field, setField] = useState("All");

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const fields = useMemo(
    () => ["All", ...new Set((projects || []).map((p) => p.field))],
    [projects]
  );

  const visible = useMemo(() => {
    const list = (projects || []).filter((p) => field === "All" || p.field === field);
    const match = (p) =>
      isMentor ? (p.mentorId === currentUser?.id ? 0 : 1) : p.field === currentUser?.careerField ? 0 : 1;
    return [...list].sort((a, b) => match(a) - match(b));
  }, [projects, field, currentUser, isMentor]);

  return (
    <div>
      <h1>Projects</h1>
      <p className="muted">
        Realistic workplace scenarios from industry mentors. Pick one and work on it with a team.
      </p>

      {!isMentor && currentUser && !currentUser.careerField && (
        <p className="card">
          Not sure which project fits you? <Link href="/assessment">Take the career assessment</Link> to see matches first.
        </p>
      )}

      <div className="chips">
        {fields.map((f) => (
          <button key={f} className={f === field ? "chip active" : "chip"} onClick={() => setField(f)}>
            {f}
          </button>
        ))}
      </div>

      {projects === null && <p className="muted">Loading…</p>}

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
              {p.company} · {p.difficulty} · teams of {p.teamSize}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
