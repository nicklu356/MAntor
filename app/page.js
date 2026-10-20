"use client";

// Home. Learners see their career assessment result and their teams.
// Mentors see their projects and the teams working on them (learners shown by anonymous name).
import Link from "next/link";
import { useEffect, useState } from "react";
import ConnectionRequests from "@/components/ConnectionRequests";
import Hero from "@/components/Hero";
import { useUser } from "@/components/UserProvider";
import {
  getProject,
  getProjectsForMentor,
  getTasks,
  getTeamFeedback,
  getTeamsForProject,
  getTeamsForUser,
} from "@/lib/db";
import { APP_TAGLINE } from "@/lib/config";

function LearnerHome({ currentUser }) {
  const [teams, setTeams] = useState(null);

  useEffect(() => {
    getTeamsForUser(currentUser.id).then(async (list) => {
      const withProjects = await Promise.all(
        list.map(async (team) => {
          const [project, tasks] = await Promise.all([getProject(team.projectId), getTasks(team.id)]);
          // "Up next": my task in progress first, then any open task nobody took yet.
          const next =
            tasks.find((t) => t.status === "in_progress" && t.assigneeIds.includes(currentUser.id)) ||
            tasks.find((t) => t.status !== "done" && t.assigneeIds.includes(currentUser.id)) ||
            tasks.find((t) => t.status === "todo" && t.assigneeIds.length === 0);
          return { ...team, project, done: tasks.filter((t) => t.status === "done").length, total: tasks.length, next };
        })
      );
      setTeams(withProjects);
    });
  }, [currentUser.id]);

  return (
    <div className="stack">
      <div>
        <h1>Hi {currentUser.name.split(" ")[0]}</h1>
        <p className="muted">{APP_TAGLINE}</p>
      </div>

      <ConnectionRequests />

      <section className="card hero">
        <div className="spread">
          <div className="eyebrow">Your career assessment result</div>
          <Link href="/assessment" className="btn btn-secondary btn-small">
            {currentUser.careerField ? "Retake assessment" : "Take the assessment"}
          </Link>
        </div>
        {currentUser.careerField ? (
          <>
            <div className="muted">You are a good fit for</div>
            <div className="career-field">{currentUser.careerField}</div>
            <p>
              <strong>Why: </strong>
              {currentUser.careerExplanation}
            </p>
            <Link href="/projects" className="btn">
              See projects that match
            </Link>
          </>
        ) : (
          <>
            <p>Answer 6 short questions and we will suggest the projects that fit you best.</p>
            <Link href="/assessment" className="btn">
              Start the assessment
            </Link>
          </>
        )}
      </section>

      <section>
        <h2 className="section-title">My teams</h2>
        {teams === null && <p className="muted">Loading…</p>}
        {teams?.length === 0 && (
          <div className="card">
            <p className="muted">You have not joined a project yet.</p>
            <Link href="/projects" className="btn btn-secondary">
              Browse projects
            </Link>
          </div>
        )}
        <div className="grid">
          {teams?.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="card project-card">
              <div className="row">
                <span className="badge badge-blue">{team.project?.field}</span>
                {team.status === "completed" && <span className="badge badge-green">Completed</span>}
              </div>
              <h3>{team.project?.title}</h3>
              <div className="bar" aria-label={`${team.done} of ${team.total} tasks done`}>
                <div className="bar-fill" style={{ width: `${team.total ? (team.done / team.total) * 100 : 0}%` }} />
              </div>
              <span className="muted small">
                {team.done} of {team.total} tasks done · {team.memberIds.length} of {team.project?.teamSize} members
              </span>
              {team.next && team.status === "active" && (
                <span className="small">
                  <strong>Up next:</strong> {team.next.title}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function MentorHome({ currentUser, userName }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    getProjectsForMentor(currentUser.id).then(async (projects) => {
      const withTeams = await Promise.all(
        projects.map(async (project) => {
          const teams = await getTeamsForProject(project.id);
          const detailed = await Promise.all(
            teams.map(async (team) => {
              const [tasks, feedback] = await Promise.all([getTasks(team.id), getTeamFeedback(team.id)]);
              return {
                ...team,
                done: tasks.filter((t) => t.status === "done").length,
                total: tasks.length,
                hasFinal: feedback.some((f) => f.kind === "final"),
              };
            })
          );
          return { project, teams: detailed };
        })
      );
      setRows(withTeams);
    });
  }, [currentUser.id]);

  const allTeams = (rows || []).flatMap((r) => r.teams);
  const stats = [
    { label: "Projects", value: rows?.length ?? "–" },
    { label: "Active teams", value: allTeams.filter((t) => t.status === "active").length },
    { label: "Ready for final feedback", value: allTeams.filter((t) => t.total && t.done === t.total && !t.hasFinal).length },
    { label: "Completed", value: allTeams.filter((t) => t.status === "completed").length },
  ];

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>Hi {currentUser.name.split(" ")[0]}</h1>
          <p className="muted">
            You are viewing as a mentor at {currentUser.company}. Learners appear by anonymous name only, so you
            judge the work, not the person.
          </p>
        </div>
        <Link href="/projects/new" className="btn">
          + New project
        </Link>
      </div>

      {rows && (
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-value">{s.value}</div>
              <div className="muted small">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {rows === null && <p className="muted">Loading…</p>}
      {rows?.length === 0 && (
        <div className="card">
          <p className="muted">You have no projects yet. Turn a situation from your work into one in a few minutes.</p>
          <Link href="/projects/new" className="btn">
            Create your first project
          </Link>
        </div>
      )}

      {rows?.map(({ project, teams }) => (
        <section key={project.id} className="card">
          <div className="spread">
            <div>
              <span className="badge badge-blue">{project.field}</span>
              <h2 style={{ marginTop: 8 }}>
                <Link href={`/projects/${project.id}`} className="title-link">
                  {project.title}
                </Link>
              </h2>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="muted small">No team has joined yet.</p>
          ) : (
            <ul className="list-plain">
              {teams.map((team, index) => (
                <li key={team.id}>
                  <div className="spread">
                    <div>
                      <Link href={`/teams/${team.id}`}>
                        <strong>Team {index + 1}</strong>
                      </Link>
                      <div className="muted small">{team.memberIds.map(userName).join(", ")}</div>
                    </div>
                    <span className="row">
                      <span className="badge">
                        {team.done} of {team.total} tasks done
                      </span>
                      <span className={team.hasFinal ? "badge badge-green" : "badge badge-amber"}>
                        {team.hasFinal ? "Final feedback given" : "Final feedback pending"}
                      </span>
                      <Link href={`/teams/${team.id}`} className="btn btn-secondary btn-small">
                        Open team →
                      </Link>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { currentUser, isMentor, userName } = useUser();
  return (
    <>
      <Hero />
      {!currentUser ? (
        <p className="muted">Loading…</p>
      ) : isMentor ? (
        <MentorHome currentUser={currentUser} userName={userName} />
      ) : (
        <LearnerHome currentUser={currentUser} />
      )}
    </>
  );
}
