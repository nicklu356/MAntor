"use client";

// Task board for one team: To do, In progress, Done.
// Below the board: progress chart, AI personal analysis (learners) and the mentor's final feedback.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FinalFeedback from "@/components/FinalFeedback";
import PersonalAnalysis from "@/components/PersonalAnalysis";
import ProgressPanel from "@/components/ProgressPanel";
import TeamMembers from "@/components/TeamMembers";
import { useUser } from "@/components/UserProvider";
import { getProject, leaveTeam, updateTask } from "@/lib/db";
import { useLiveDoc, useLiveList } from "@/lib/live";
import { useT } from "@/components/LocaleProvider";

const COLUMNS = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];
const ORDER = COLUMNS.map((c) => c.status);

export default function TeamPage() {
  const t = useT();
  const { id } = useParams();
  const router = useRouter();
  const { currentUser, isMentor, userName } = useUser();
  // Live: the board and the team update by themselves when a teammate moves a card, takes a task,
  // submits work, joins or leaves.
  const team = useLiveDoc("teams", id);
  const tasks = useLiveList("tasks", "teamId", id) || [];
  const [project, setProject] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const projectId = team?.projectId;
  useEffect(() => {
    if (projectId) getProject(projectId).then(setProject);
  }, [projectId]);

  async function move(task, step) {
    const next = ORDER[ORDER.indexOf(task.status) + step];
    if (!next) return;
    await updateTask(task.id, { status: next });
  }

  // Drag a card to another column (the arrow buttons do the same for keyboard users).
  async function drop(status) {
    const task = tasks.find((item) => item.id === dragging);
    setDragging(null);
    setDropTarget(null);
    if (!task || task.status === status) return;
    await updateTask(task.id, { status });
  }

  async function toggleAssign(task) {
    const mine = task.assigneeIds.includes(currentUser.id);
    const assigneeIds = mine
      ? task.assigneeIds.filter((u) => u !== currentUser.id)
      : [...task.assigneeIds, currentUser.id];
    await updateTask(task.id, { assigneeIds });
  }

  async function handleLeave() {
    setLeaving(true);
    setLeaveError("");
    try {
      await leaveTeam(team.id, currentUser.id);
      router.push("/");
    } catch (e) {
      setLeaveError(e.message || t("Could not leave the team"));
      setLeaving(false);
    }
  }

  if (team === undefined) return <p className="muted">{t("Loading…")}</p>;
  if (team === null) return <p>{t("Team not found.")}</p>;
  if (team.status === "disbanded") {
    return (
      <div>
        <Link href="/" className="back">
          {t("← Home")}
        </Link>
        <p className="card muted">{t("This team was disbanded because everyone left.")}</p>
      </div>
    );
  }

  const isMember = Boolean(currentUser && !isMentor && team.memberIds.includes(currentUser.id));
  const isProjectMentor = Boolean(isMentor && project && project.mentorId === currentUser.id);
  const doneCount = tasks.filter((item) => item.status === "done").length;
  const canLeave = isMember && team.status === "active";

  return (
    <div>
      <Link href="/" className="back">
        {t("← Home")}
      </Link>

      <div className="spread" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">{project && t(project.field)}</div>
          <h1>{project?.title}</h1>
          <p className="muted small">
            {t("Team:")} {team.memberIds.map(userName).join(", ")} ·{" "}
            {t("{done} of {total} tasks done", { done: doneCount, total: tasks.length })} · {t(team.status)}
          </p>
        </div>
        <div className="row">
          {canLeave && !confirmLeave && (
            <button className="btn btn-danger" onClick={() => setConfirmLeave(true)}>
              {t("Leave team")}
            </button>
          )}
          <Link href={`/projects/${team.projectId}`} className="btn btn-ghost">
            {t("Project brief")}
          </Link>
        </div>
      </div>

      {canLeave && confirmLeave && (
        <div className="card stack" style={{ marginBottom: 20 }}>
          <strong>{t("Leave this team?")}</strong>
          <p className="muted small">
            {t(
              "You will lose access to this team's board and your personal analysis. Work you already submitted and your recorded contributions stay with the team. You can join the project again later, but you may be placed in a different team."
            )}
          </p>
          {leaveError && <p className="error">{leaveError}</p>}
          <div className="row">
            <button className="btn btn-danger-solid" onClick={handleLeave} disabled={leaving}>
              {leaving ? t("Leaving…") : t("Yes, leave team")}
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}

      {isProjectMentor && (
        <p className="card muted">
          {t("You are this project's mentor. Learners appear by anonymous name, so you judge the work, not the person.")}
        </p>
      )}
      {isMentor && !isProjectMentor && (
        <p className="card muted">{t("You are viewing another mentor's project (read only).")}</p>
      )}
      {!isMentor && !isMember && (
        <p className="card muted">
          {t("You are not in this team. Switch learner in the header or join the project to take part.")}
        </p>
      )}

      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((item) => item.status === col.status);
          return (
            <section
              key={col.status}
              className={dropTarget === col.status ? "column drop-target" : "column"}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                setDropTarget(col.status);
              }}
              onDragLeave={() => setDropTarget((s) => (s === col.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                drop(col.status);
              }}
            >
              <div className="column-head">
                <span>{t(col.label)}</span>
                <span className="badge">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 && <p className="muted small column-empty">{isMember ? t("Drop a task here") : t("No tasks")}</p>}
              {colTasks.map((task) => (
                <article
                  key={task.id}
                  className={dragging === task.id ? "task-card dragging" : "task-card"}
                  draggable={isMember}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(task.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setDropTarget(null);
                  }}
                >
                  <Link href={`/teams/${team.id}/tasks/${task.id}`}>{task.title}</Link>
                  <span className="muted small">
                    {task.assigneeIds.length ? task.assigneeIds.map(userName).join(", ") : t("Nobody assigned")}
                  </span>
                  <div className="row">
                    {task.submission && <span className="badge badge-green">{t("Submitted")}</span>}
                  </div>
                  {isMember && (
                    <div className="row">
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => move(task, -1)}
                        disabled={task.status === ORDER[0]}
                        aria-label={t("Move left")}
                      >
                        ←
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => move(task, 1)}
                        disabled={task.status === ORDER[ORDER.length - 1]}
                        aria-label={t("Move right")}
                      >
                        →
                      </button>
                      <button className="btn btn-secondary btn-small" onClick={() => toggleAssign(task)}>
                        {task.assigneeIds.includes(currentUser.id) ? t("Unassign me") : t("Assign me")}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {isMember && (
        <p className="muted small" style={{ marginTop: 8 }}>
          {t("Tip: drag cards between columns, or use the arrows.")}
        </p>
      )}

      {project && <TeamMembers team={team} project={project} canConnect={isProjectMentor} />}

      <ProgressPanel project={project} tasks={tasks} teamId={team.id} />

      {isMember && <PersonalAnalysis team={team} project={project} tasks={tasks} currentUser={currentUser} />}

      <FinalFeedback
        team={team}
        project={project}
        tasks={tasks}
        canGive={isProjectMentor}
      />
    </div>
  );
}
