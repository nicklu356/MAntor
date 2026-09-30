"use client";

// Home. Learners see their career assessment result and their teams.
// Mentors see their projects and the teams working on them (learners shown by anonymous name).
import Link from "next/link";
import { useEffect, useState } from "react";
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
        list.map(async (team) => ({ ...team, project: await getProject(team.projectId) }))
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
              <span className="badge badge-blue">{team.project?.field}</span>
              <h3>{team.project?.title}</h3>
              <span className="muted small">
                {team.memberIds.length} of {team.project?.teamSize} members · {team.status}
              </span>
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

  return (
    <div className="stack">
      <div>
        <h1>Hi {currentUser.name.split(" ")[0]}</h1>
        <p className="muted">
          You are viewing as a mentor at {currentUser.company}. Learners appear by anonymous name only, so you
          judge the work, not the person.
        </p>
      </div>

      {rows === null && <p className="muted">Loading…</p>}
      {rows?.length === 0 && <div className="card muted">You have no projects yet.</div>}

      {rows?.map(({ project, teams }) => (
        <section key={project.id} className="card">
          <div className="spread">
            <div>
              <span className="badge badge-blue">{project.field}</span>
              <h2 style={{ marginTop: 8 }}>{project.title}</h2>
            </div>
            <Link href={`/projects/${project.id}`} className="btn btn-ghost btn-small">
              Project brief
            </Link>
          </div>
          {teams.length === 0 ? (
            <p className="muted small">No team has joined yet.</p>
          ) : (
            <ul className="list-plain">
              {teams.map((team) => (
                <li key={team.id}>
                  <div className="spread">
                    <Link href={`/teams/${team.id}`}>{team.memberIds.map(userName).join(", ")}</Link>
                    <span className="row">
                      <span className="badge">
                        {team.done} of {team.total} tasks done
                      </span>
                      <span className={team.hasFinal ? "badge badge-green" : "badge badge-amber"}>
                        {team.hasFinal ? "Final feedback given" : "Final feedback pending"}
                      </span>
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
  if (!currentUser) return <p className="muted">Loading…</p>;
  return isMentor ? (
    <MentorHome currentUser={currentUser} userName={userName} />
  ) : (
    <LearnerHome currentUser={currentUser} />
  );
}
