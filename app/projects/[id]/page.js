"use client";

// Project detail: scenario, the mentor's criteria, the tasks, and a Join button.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { getProject, getTeamsForProject, getTeamsForUser, getUser, joinProject } from "@/lib/db";
import { useT } from "@/components/LocaleProvider";

export default function ProjectDetailPage() {
  const t = useT();
  const { id } = useParams();
  const router = useRouter();
  const { mode, currentUser, isMentor, userName, signedOut } = useUser();
  const [project, setProject] = useState(undefined);
  const [mentor, setMentor] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [projectTeams, setProjectTeams] = useState([]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProject(id).then(async (p) => {
      setProject(p);
      if (p) setMentor(await getUser(p.mentorId).catch(() => null));
    });
  }, [id]);

  useEffect(() => {
    if (!currentUser || isMentor) {
      setMyTeam(null);
      return;
    }
    getTeamsForUser(currentUser.id).then((teams) =>
      setMyTeam(teams.find((item) => item.projectId === id) || null)
    );
  }, [currentUser, isMentor, id]);

  // Teams are only visible to signed-in users.
  useEffect(() => {
    if (!currentUser) return;
    getTeamsForProject(id)
      .then(setProjectTeams)
      .catch(() => setProjectTeams([]));
  }, [id, currentUser]);

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      // With real accounts, the learner's name is shared with their new teammates only.
      const team =
        mode === "auth"
          ? await joinProject(id, currentUser.id, currentUser.name, currentUser.photo)
          : await joinProject(id, currentUser.id);
      router.push(`/teams/${team.id}`);
    } catch (e) {
      setError(e.message || t("Could not join the project"));
      setJoining(false);
    }
  }

  if (project === undefined) return <p className="muted">{t("Loading…")}</p>;
  if (project === null) return <p>{t("Project not found.")}</p>;

  const isProjectMentor = Boolean(isMentor && currentUser && project.mentorId === currentUser.id);
  const openSpots = projectTeams
    .filter((item) => item.status === "active")
    .reduce((sum, team) => sum + Math.max(0, project.teamSize - team.memberIds.length), 0);

  return (
    <div>
      <Link href="/projects" className="back">
        {t("← All projects")}
      </Link>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <div className="row">
              <span className="badge badge-blue">{t(project.field)}</span>
              <span className="badge">{t(project.difficulty)}</span>
            </div>
            <div className="spread" style={{ marginTop: 12 }}>
              <h1>{project.title}</h1>
              {isProjectMentor && (
                <Link href={`/projects/${project.id}/edit`} className="btn btn-secondary btn-small">
                  {t("Edit project")}
                </Link>
              )}
            </div>
            <p>{project.description}</p>
          </section>

          <section className="card">
            <h2>{t("What the mentor looks for")}</h2>
            <p className="muted small">
              {t("These criteria are the industry standard for this project. AI feedback uses them to review your work.")}
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
            <h2>{t("Tasks")}</h2>
            <ol>
              {(project.taskTemplates || []).map((item) => (
                <li key={item.title} style={{ marginBottom: 8 }}>
                  <strong>{item.title}</strong>
                  <div className="muted small">{item.description}</div>
                </li>
              ))}
            </ol>
          </section>

          {isProjectMentor && (
            <section className="card">
              <h2>{t("Teams on your project")}</h2>
              {projectTeams.length === 0 ? (
                <p className="muted small">{t("No team has joined yet.")}</p>
              ) : (
                <ul className="list-plain">
                  {projectTeams.map((item, index) => (
                    <li key={item.id}>
                      <div className="spread">
                        <div>
                          <Link href={`/teams/${item.id}`}>
                            <strong>{t("Team {n}", { n: index + 1 })}</strong>
                          </Link>
                          <span className="muted small"> · {item.status}</span>
                          <div className="muted small">{item.memberIds.map(userName).join(", ")}</div>
                        </div>
                        <Link href={`/teams/${item.id}`} className="btn btn-secondary btn-small">
                          {t("Open team →")}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="card stack">
          <div>
            <div className="eyebrow">{t("Mentor")}</div>
            <strong>{mentor?.name}</strong>
            <div className="muted small">{project.company}</div>
          </div>
          <div>
            <div className="eyebrow">{t("Team size")}</div>
            {t("{n} learners", { n: project.teamSize })}
          </div>
          <div hidden={signedOut}>
            <div className="eyebrow">{t("Teams")}</div>
            {t("{n} active", { n: projectTeams.filter((team) => team.status === "active").length })}
            {openSpots > 0
              ? ` · ${t(openSpots > 1 ? "{n} open spots" : "{n} open spot", { n: openSpots })}`
              : ` · ${t("joining starts a new team")}`}
          </div>
          {isMentor ? (
            <p className="muted small">
              {isProjectMentor
                ? t("This is your project. Open a team to guide it and give final feedback.")
                : t("You are viewing as a mentor. Only learners can join projects.")}
            </p>
          ) : signedOut ? (
            <Link href={`/signup?next=${encodeURIComponent(`/projects/${id}`)}`} className="btn">
              {t("Sign up to join")}
            </Link>
          ) : myTeam ? (
            <Link href={`/teams/${myTeam.id}`} className="btn">
              {t("Go to my team")}
            </Link>
          ) : (
            <button className="btn" onClick={handleJoin} disabled={joining || !currentUser}>
              {joining ? t("Joining…") : t("Join this project")}
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <p className="muted small">
            {t("Mentors only see your anonymous name, so your work is judged on its own merit.")}
          </p>
        </aside>
      </div>
    </div>
  );
}
