"use client";

// Project detail: scenario, the mentor's criteria, the tasks, and a Join button.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { getProject, getTeamsForProject, getTeamsForUser, getUser, joinProject } from "@/lib/db";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentUser, isMentor, userName } = useUser();
  const [project, setProject] = useState(undefined);
  const [mentor, setMentor] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [projectTeams, setProjectTeams] = useState([]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProject(id).then(async (p) => {
      setProject(p);
      if (p) setMentor(await getUser(p.mentorId));
    });
  }, [id]);

  useEffect(() => {
    if (!currentUser || isMentor) {
      setMyTeam(null);
      return;
    }
    getTeamsForUser(currentUser.id).then((teams) =>
      setMyTeam(teams.find((t) => t.projectId === id) || null)
    );
  }, [currentUser, isMentor, id]);

  useEffect(() => {
    getTeamsForProject(id).then(setProjectTeams);
  }, [id]);

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      const team = await joinProject(id, currentUser.id);
      router.push(`/teams/${team.id}`);
    } catch (e) {
      setError(e.message || "Could not join the project");
      setJoining(false);
    }
  }

  if (project === undefined) return <p className="muted">Loading…</p>;
  if (project === null) return <p>Project not found.</p>;

  const isProjectMentor = Boolean(isMentor && currentUser && project.mentorId === currentUser.id);

  return (
    <div>
      <Link href="/projects" className="back">
        ← All projects
      </Link>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <div className="row">
              <span className="badge badge-blue">{project.field}</span>
              <span className="badge">{project.difficulty}</span>
            </div>
            <h1 style={{ marginTop: 12 }}>{project.title}</h1>
            <p>{project.description}</p>
          </section>

          <section className="card">
            <h2>What the mentor looks for</h2>
            <p className="muted small">
              These criteria are the industry standard for this project. AI feedback uses them to review your work.
            </p>
            <ul className="criteria-list">
              {project.criteria.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.description}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Tasks</h2>
            <ol>
              {(project.taskTemplates || []).map((t) => (
                <li key={t.title} style={{ marginBottom: 8 }}>
                  <strong>{t.title}</strong>
                  <div className="muted small">{t.description}</div>
                </li>
              ))}
            </ol>
          </section>

          {isProjectMentor && (
            <section className="card">
              <h2>Teams on your project</h2>
              {projectTeams.length === 0 ? (
                <p className="muted small">No team has joined yet.</p>
              ) : (
                <ul className="list-plain">
                  {projectTeams.map((t) => (
                    <li key={t.id}>
                      <Link href={`/teams/${t.id}`}>
                        {t.memberIds.map(userName).join(", ")}
                      </Link>
                      <span className="muted small"> · {t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="card stack">
          <div>
            <div className="eyebrow">Mentor</div>
            <strong>{mentor?.name}</strong>
            <div className="muted small">{project.company}</div>
          </div>
          <div>
            <div className="eyebrow">Team size</div>
            {project.teamSize} learners
          </div>
          {isMentor ? (
            <p className="muted small">
              {isProjectMentor
                ? "This is your project. Open a team to guide it and give final feedback."
                : "You are viewing as a mentor. Only learners can join projects."}
            </p>
          ) : myTeam ? (
            <Link href={`/teams/${myTeam.id}`} className="btn">
              Go to my team
            </Link>
          ) : (
            <button className="btn" onClick={handleJoin} disabled={joining || !currentUser}>
              {joining ? "Joining…" : "Join this project"}
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <p className="muted small">
            Mentors only see your anonymous name, so your work is judged on its own merit.
          </p>
        </aside>
      </div>
    </div>
  );
}
