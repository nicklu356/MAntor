"use client";

// Task board for one team: To do, In progress, Done.
// Below the board: progress chart, AI personal analysis (learners) and the mentor's final feedback.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FinalFeedback from "@/components/FinalFeedback";
import PersonalAnalysis from "@/components/PersonalAnalysis";
import ProgressPanel from "@/components/ProgressPanel";
import { useUser } from "@/components/UserProvider";
import { getProject, getTasks, getTeam, updateTask } from "@/lib/db";

const COLUMNS = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];
const ORDER = COLUMNS.map((c) => c.status);

export default function TeamPage() {
  const { id } = useParams();
  const { currentUser, isMentor, userName } = useUser();
  const [team, setTeam] = useState(undefined);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const loadTasks = useCallback(() => getTasks(id).then(setTasks), [id]);

  useEffect(() => {
    getTeam(id).then(async (t) => {
      setTeam(t);
      if (t) {
        setProject(await getProject(t.projectId));
        loadTasks();
      }
    });
  }, [id, loadTasks]);

  async function move(task, step) {
    const next = ORDER[ORDER.indexOf(task.status) + step];
    if (!next) return;
    await updateTask(task.id, { status: next });
    loadTasks();
  }

  async function toggleAssign(task) {
    const mine = task.assigneeIds.includes(currentUser.id);
    const assigneeIds = mine
      ? task.assigneeIds.filter((u) => u !== currentUser.id)
      : [...task.assigneeIds, currentUser.id];
    await updateTask(task.id, { assigneeIds });
    loadTasks();
  }

  if (team === undefined) return <p className="muted">Loading…</p>;
  if (team === null) return <p>Team not found.</p>;

  const isMember = Boolean(currentUser && !isMentor && team.memberIds.includes(currentUser.id));
  const isProjectMentor = Boolean(isMentor && project && project.mentorId === currentUser.id);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <Link href="/" className="back">
        ← Home
      </Link>

      <div className="spread" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">{project?.field}</div>
          <h1>{project?.title}</h1>
          <p className="muted small">
            Team: {team.memberIds.map(userName).join(", ")} · {doneCount} of {tasks.length} tasks done ·{" "}
            {team.status}
          </p>
        </div>
        <Link href={`/projects/${team.projectId}`} className="btn btn-ghost">
          Project brief
        </Link>
      </div>

      {isProjectMentor && (
        <p className="card muted">
          You are this project&apos;s mentor. Learners appear by anonymous name, so you judge the work, not the person.
        </p>
      )}
      {isMentor && !isProjectMentor && (
        <p className="card muted">You are viewing another mentor&apos;s project (read only).</p>
      )}
      {!isMentor && !isMember && (
        <p className="card muted">
          You are not in this team. Switch learner in the header or join the project to take part.
        </p>
      )}

      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <section key={col.status} className="column">
              <div className="column-head">
                <span>{col.label}</span>
                <span className="badge">{colTasks.length}</span>
              </div>
              {colTasks.map((task) => (
                <article key={task.id} className="task-card">
                  <Link href={`/teams/${team.id}/tasks/${task.id}`}>{task.title}</Link>
                  <span className="muted small">
                    {task.assigneeIds.length ? task.assigneeIds.map(userName).join(", ") : "Nobody assigned"}
                  </span>
                  <div className="row">
                    {task.submission && <span className="badge badge-green">Submitted</span>}
                  </div>
                  {isMember && (
                    <div className="row">
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => move(task, -1)}
                        disabled={task.status === ORDER[0]}
                        aria-label="Move left"
                      >
                        ←
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => move(task, 1)}
                        disabled={task.status === ORDER[ORDER.length - 1]}
                        aria-label="Move right"
                      >
                        →
                      </button>
                      <button className="btn btn-secondary btn-small" onClick={() => toggleAssign(task)}>
                        {task.assigneeIds.includes(currentUser.id) ? "Unassign me" : "Assign me"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>

      <ProgressPanel project={project} tasks={tasks} teamId={team.id} />

      {isMember && <PersonalAnalysis team={team} project={project} tasks={tasks} currentUser={currentUser} />}

      <FinalFeedback
        team={team}
        project={project}
        tasks={tasks}
        canGive={isProjectMentor}
        onSaved={() => getTeam(id).then(setTeam)}
      />
    </div>
  );
}
