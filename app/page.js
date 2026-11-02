"use client";

// Home. Learners see their career assessment result and their teams.
// Mentors see their projects and the teams working on them (learners shown by anonymous name).
import Link from "next/link";
import { useEffect, useState } from "react";
import ConnectionRequests from "@/components/ConnectionRequests";
import { startDemo } from "@/lib/session";
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
import { buildAttention } from "@/lib/attention";
import { DueBadge } from "@/components/Deadline";
import { APP_TAGLINE } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { useT } from "@/components/LocaleProvider";
import { FIELD_INFO } from "@/lib/assessment";

function LearnerHome({ currentUser }) {
  const t = useT();
  const [teams, setTeams] = useState(null);

  useEffect(() => {
    getTeamsForUser(currentUser.id).then(async (list) => {
      const withProjects = await Promise.all(
        list.map(async (team) => {
          const [project, tasks] = await Promise.all([getProject(team.projectId), getTasks(team.id)]);
          // "Up next": my task in progress first, then my other open tasks, then any open task nobody
          // took yet; the earliest deadline first within each.
          const byDue = [...tasks].sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
          const next =
            byDue.find((item) => item.status === "in_progress" && item.assigneeIds.includes(currentUser.id)) ||
            byDue.find((item) => item.status !== "done" && item.assigneeIds.includes(currentUser.id)) ||
            byDue.find((item) => item.status === "todo" && item.assigneeIds.length === 0);
          return { ...team, project, done: tasks.filter((item) => item.status === "done").length, total: tasks.length, next };
        })
      );
      setTeams(withProjects);
    });
  }, [currentUser.id]);

  return (
    <div className="stack">
      <div>
        <h1>{t("Hi {name}", { name: currentUser.name.split(" ")[0] })}</h1>
        <p className="muted">{t(APP_TAGLINE)}</p>
      </div>

      <ConnectionRequests />

      <section className="card hero">
        <div className="spread">
          <div className="eyebrow">{t("Your career assessment result")}</div>
          <Link href="/assessment" className="btn btn-secondary btn-small">
            {currentUser.careerField ? t("Retake assessment") : t("Take the assessment")}
          </Link>
        </div>
        {currentUser.careerField ? (
          <>
            <div className="muted">{t("You are a good fit for")}</div>
            <div className="career-field">
              {t(currentUser.careerField)}
              {currentUser.careerMatches?.[0] && (
                <span className="career-percent">{t("{percent}% fit", { percent: currentUser.careerMatches[0].percent })}</span>
              )}
            </div>
            {currentUser.careerMatches?.length > 1 && (
              <p className="small">
                {t("Also a good fit:")} {currentUser.careerMatches
                  .slice(1, 3)
                  .map((m) => `${t(m.field)} (${m.percent}%)`)
                  .join(", ")}
              </p>
            )}
            <p>
              <strong>{t("Why:")} </strong>
              {/* The fixed explanation (no AI key) is translatable; AI text is in the language it was written in. */}
              {currentUser.careerExplanation === FIELD_INFO[currentUser.careerField]?.blurb
                ? t(currentUser.careerExplanation)
                : currentUser.careerExplanation}
            </p>
            <Link href="/projects" className="btn">
              {t("See projects that match")}
            </Link>
          </>
        ) : (
          <>
            <p>{t("Rate 32 short work activities (about 5 minutes) and we will suggest the projects that fit you best.")}</p>
            <Link href="/assessment" className="btn">
              {t("Start the assessment")}
            </Link>
          </>
        )}
      </section>

      <section>
        <h2 className="section-title">{t("My teams")}</h2>
        {teams === null && <p className="muted">{t("Loading…")}</p>}
        {teams?.length === 0 && (
          <div className="card">
            <p className="muted">{t("You have not joined a project yet.")}</p>
            <Link href="/projects" className="btn btn-secondary">
              {t("Browse projects")}
            </Link>
          </div>
        )}
        <div className="grid">
          {teams?.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="card project-card">
              <div className="row">
                <span className="badge badge-blue">{team.project && t(team.project.field)}</span>
                {team.status === "completed" && <span className="badge badge-green">{t("Completed")}</span>}
              </div>
              <h3>{team.project?.title}</h3>
              <div className="bar" aria-label={t("{done} of {total} tasks done", { done: team.done, total: team.total })}>
                <div className="bar-fill" style={{ width: `${team.total ? (team.done / team.total) * 100 : 0}%` }} />
              </div>
              <span className="muted small">
                {t("{done} of {total} tasks done", { done: team.done, total: team.total })} ·{" "}
                {t("{n} of {size} members", { n: team.memberIds.length, size: team.project?.teamSize })}
              </span>
              {team.next && team.status === "active" && (
                <span className="small">
                  <strong>{t("Up next:")}</strong> {team.next.title} <DueBadge task={team.next} />
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
  const t = useT();
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
                project,
                tasks,
                feedback,
                done: tasks.filter((item) => item.status === "done").length,
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
  const attention = buildAttention(allTeams);
  const stats = [
    { label: t("Projects"), value: rows?.length ?? "–" },
    { label: t("Active teams"), value: allTeams.filter((team) => team.status === "active").length },
    { label: t("Ready for final feedback"), value: allTeams.filter((team) => team.status === "active" && team.total && team.done === team.total && !team.hasFinal).length },
    { label: t("Completed"), value: allTeams.filter((team) => team.status === "completed").length },
  ];

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>{t("Hi {name}", { name: currentUser.name.split(" ")[0] })}</h1>
          <p className="muted">
            {t(
              "You are viewing as a mentor at {company}. Learners appear by anonymous name only, so you judge the work, not the person.",
              { company: currentUser.company }
            )}
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

      {rows === null && <p className="muted">{t("Loading…")}</p>}
      {rows && (
        <section className="card">
          <div className="spread">
            <h2>{t("Needs your attention")}</h2>
            <span className={attention.length ? "badge badge-amber" : "badge badge-green"}>
              {attention.length
                ? t(attention.length > 1 ? "{n} items" : "{n} item", { n: attention.length })
                : t("All clear")}
            </span>
          </div>
          {attention.length === 0 ? (
            <p className="muted small">
              {t(
                "No help requests, no struggling tasks, no teams waiting for final feedback. AI feedback is covering the rest."
              )}
            </p>
          ) : (
            <ul className="list-plain">
              {attention.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <div className="spread">
                    <div>
                      <span className={item.kind === "help" ? "badge badge-amber" : item.kind === "late" ? "badge badge-late" : "badge"}>
                        {item.kind === "help"
                          ? t("Help request")
                          : item.kind === "struggling"
                            ? t("Low AI score")
                            : item.kind === "late"
                              ? t("Behind schedule")
                              : t("Ready for final feedback")}
                      </span>{" "}
                      <Link href={item.href}>
                        <strong>
                          {item.kind === "final"
                            ? t("{project}: every task is done", { project: item.project?.title })
                            : item.kind === "late"
                              ? t(item.late.length > 1 ? "{project}: {n} tasks are late" : "{project}: {n} task is late", {
                                  project: item.project?.title,
                                  n: item.late.length,
                                })
                            : item.kind === "help"
                              ? t("{name} on “{task}”", { name: userName(item.userId), task: item.task.title })
                              : t("“{task}” scored {score}/5 in its latest review", { task: item.task.title, score: item.lowest })}
                        </strong>
                      </Link>
                      {item.note && <div className="muted small clamp-2">{item.note}</div>}
                    </div>
                    <span className="muted small">{timeAgo(item.at, Date.now(), t)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {rows?.length === 0 && (
        <div className="card">
          <p className="muted">
            {t("You have no projects yet. Turn a situation from your work into one in a few minutes.")}
          </p>
          <Link href="/projects/new" className="btn">
            {t("Create your first project")}
          </Link>
        </div>
      )}

      {rows?.map(({ project, teams }) => (
        <section key={project.id} className="card">
          <div className="spread">
            <div>
              <span className="badge badge-blue">{t(project.field)}</span>
              <h2 style={{ marginTop: 8 }}>
                <Link href={`/projects/${project.id}`} className="title-link">
                  {project.title}
                </Link>
              </h2>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="muted small">{t("No team has joined yet.")}</p>
          ) : (
            <ul className="list-plain">
              {teams.map((team, index) => (
                <li key={team.id}>
                  <div className="spread">
                    <div>
                      <Link href={`/teams/${team.id}`}>
                        <strong>{t("Team {n}", { n: index + 1 })}</strong>
                      </Link>
                      <div className="muted small">{team.memberIds.map(userName).join(", ")}</div>
                    </div>
                    <span className="row">
                      <span className="badge">
                        {team.done} of {team.total} tasks done
                      </span>
                      <span className={team.hasFinal ? "badge badge-green" : "badge badge-amber"}>
                        {team.hasFinal ? t("Final feedback given") : t("Final feedback pending")}
                      </span>
                      <Link href={`/teams/${team.id}`} className="btn btn-secondary btn-small">
                        {t("Open team →")}
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

// Signed-out visitors (real accounts): what MAntor is, and three ways in.
function Landing() {
  const t = useT();
  const steps = [
    [t("Find your field"), t("A 5-minute interest assessment matches you to 8 career fields.")],
    [t("Join a team project"), t("Realistic workplace scenarios written by industry mentors.")],
    [t("Get feedback that counts"), t("AI reviews your work against the mentor's own standard, within minutes.")],
  ];
  return (
    <div className="stack">
      <section className="card stack landing">
        <h2>{t("Build real experience before your first job")}</h2>
        <div className="analysis-grid">
          {steps.map(([title, text], i) => (
            <div key={title}>
              <div className="eyebrow">
                {i + 1}. {title}
              </div>
              <p className="small">{text}</p>
            </div>
          ))}
        </div>
        <div className="row">
          <Link href="/signup" className="btn">
            {t("Create a free account")}
          </Link>
          <Link href="/login" className="btn btn-secondary">
            {t("Log in")}
          </Link>
          <button className="btn btn-ghost" onClick={startDemo}>
            {t("Try the demo")}
          </button>
        </div>
        <p className="muted small">
          {t(
            "The demo opens a private sandbox with sample learners and mentors. You can switch between them to see both sides."
          )}
        </p>
      </section>
      <div className="row">
        <Link href="/projects">{t("Browse the projects →")}</Link>
        <Link href="/about">{t("About MAntor →")}</Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useT();
  const { currentUser, isMentor, userName, loaded, dataError, users, signedOut } = useUser();
  return (
    <>
      <Hero />
      {signedOut ? (
        <Landing />
      ) : !currentUser ? (
        loaded && (dataError || users.length === 0) ? (
          <div className="card stack">
            <h2>{dataError ? t("The app cannot read the database") : t("No data yet")}</h2>
            <p>{dataError || t("Load the demo users, mentors and projects to get started.")}</p>
            <div>
              <Link href="/setup" className="btn">
                {t("Go to setup")}
              </Link>
            </div>
          </div>
        ) : (
          <p className="muted">{t("Loading…")}</p>
        )
      ) : isMentor ? (
        <MentorHome currentUser={currentUser} userName={userName} />
      ) : (
        <LearnerHome currentUser={currentUser} />
      )}
    </>
  );
}
