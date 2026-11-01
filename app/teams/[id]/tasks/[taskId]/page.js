"use client";

// One task: instructions, submission, contribution form, and AI feedback.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CoachPanel from "@/components/CoachPanel";
import CommentThread from "@/components/CommentThread";
import ContributionForm from "@/components/ContributionForm";
import FeedbackPanel from "@/components/FeedbackPanel";
import HelpRequest from "@/components/HelpRequest";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { MAX_SUBMISSION_CHARS } from "@/lib/config";
import { getProject, getTeam, submitTask, toggleKudos } from "@/lib/db";
import { useLiveDoc, useLiveList } from "@/lib/live";

const STATUS_LABEL = { todo: "To do", in_progress: "In progress", done: "Done" };

// Teammates thank each other for a contribution.
function Kudos({ contribution, canGive, mine, onToggle }) {
  const count = (contribution.kudos || []).length;
  if (!canGive && !count) return null;
  if (!canGive) return <span className="muted small">♥ {count} thanks</span>;
  return (
    <button
      className={mine ? "kudos kudos-on" : "kudos"}
      onClick={onToggle}
      aria-pressed={mine}
      aria-label={mine ? "Take back your thanks" : "Thank your teammate"}
    >
      ♥ {mine ? "Thanked" : "Thanks"}
      {count > 0 && ` · ${count}`}
    </button>
  );
}

export default function TaskPage() {
  const { id: teamId, taskId } = useParams();
  const { currentUser, isMentor, userName } = useUser();
  const toast = useToast();
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  // Live: the task (submission, status, help request) and its contributions update by themselves
  // when a teammate or the mentor changes them.
  const task = useLiveDoc("tasks", taskId);
  const contributions = useLiveList("contributions", "taskId", taskId) || [];
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [teammateSaved, setTeammateSaved] = useState(false);
  const savedVersion = useRef(null); // the saved submission the draft was based on

  useEffect(() => {
    getTeam(teamId).then(async (t) => {
      setTeam(t);
      if (t) setProject(await getProject(t.projectId));
    });
  }, [teamId]);

  // When the saved submission changes, follow it, unless you are in the middle of editing:
  // then keep your text and say a teammate saved a newer version.
  const saved = task?.submission?.content || "";
  useEffect(() => {
    if (task === undefined) return;
    setDraft((current) => {
      const untouched = savedVersion.current === null || current === savedVersion.current;
      if (!untouched && current !== saved) setTeammateSaved(true);
      return untouched ? saved : current;
    });
    savedVersion.current = saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, task === undefined]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const updating = Boolean(task.submission);
      await submitTask(taskId, currentUser.id, draft.trim());
      setTeammateSaved(false);
      toast(updating ? "Submission updated. Ask for new feedback to see your progress." : "Work submitted");
    } catch (err) {
      toast(err.message || "Could not save your submission", "error");
    }
    setSaving(false);
  }

  if (task === undefined) return <p className="muted">Loading…</p>;
  if (task === null || task.teamId !== teamId) return <p>Task not found.</p>;

  const isMember = Boolean(currentUser && !isMentor && team?.memberIds.includes(currentUser.id));
  const isProjectMentor = Boolean(isMentor && project && project.mentorId === currentUser.id);
  const criteria = (project?.criteria || []).filter((c) => task.criteriaIds.includes(c.id));
  const unsaved = isMember && draft.trim() !== (task.submission?.content || "").trim() && draft.trim().length > 0;

  return (
    <div>
      <Link href={`/teams/${teamId}`} className="back">
        ← Task board
      </Link>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <div className="eyebrow">{project?.title}</div>
            <h1>{task.title}</h1>
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="badge">{STATUS_LABEL[task.status]}</span>
              <span className="muted small">
                {task.assigneeIds.length ? `Assigned to ${task.assigneeIds.map(userName).join(", ")}` : "Nobody assigned yet"}
              </span>
            </div>
            <p>{task.description}</p>
            <div className="eyebrow" style={{ marginTop: 16 }}>
              Mentor criteria for this task
            </div>
            <ul className="criteria-list">
              {criteria.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.description}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Submission</h2>
            {task.submission && (
              <p className="muted small">
                Last submitted by {userName(task.submission.submittedBy)} on{" "}
                {new Date(task.submission.submittedAt).toLocaleString()}
              </p>
            )}
            <form onSubmit={handleSubmit} className="stack">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write your team's work here, or paste a link (Figma, Google Doc, GitHub)."
                maxLength={MAX_SUBMISSION_CHARS}
                disabled={!isMember}
                aria-label="Submission"
              />
              {isMember && (
                <div className="row">
                  <button className="btn" disabled={saving || !draft.trim()}>
                    {saving ? "Saving…" : task.submission ? "Update submission" : "Submit work"}
                  </button>
                  <span className="muted small">
                    {draft.length} / {MAX_SUBMISSION_CHARS}
                  </span>
                  {unsaved && <span className="badge badge-amber">Unsaved changes</span>}
                  {teammateSaved && (
                    <span className="row small">
                      <span className="badge badge-amber">A teammate saved a newer version</span>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setDraft(saved);
                          setTeammateSaved(false);
                        }}
                      >
                        Load it
                      </button>
                    </span>
                  )}
                </div>
              )}
            </form>
          </section>

          <FeedbackPanel
            project={project}
            task={task}
            teamId={teamId}
            contributions={contributions}
            canRequest={isMember}
            userId={currentUser?.id}
          />

          {isMember && project && (
            <CoachPanel project={project} task={task} criteria={criteria} draft={draft} userId={currentUser.id} />
          )}

          <HelpRequest
            task={task}
            isMember={isMember}
            isProjectMentor={isProjectMentor}
          />

          <CommentThread taskId={taskId} teamId={teamId} canPost={isMember || isProjectMentor} />
        </div>

        <aside className="card">
          <div className="spread">
            <h2>Contributions</h2>
            {contributions.length > 0 && (
              <span className="badge">{contributions.reduce((sum, c) => sum + (Number(c.hoursSpent) || 0), 0)}h total</span>
            )}
          </div>
          <p className="muted small">Record what you did, so the team and mentor can see who did what.</p>
          {contributions.length === 0 ? (
            <p className="muted small">No contributions yet.</p>
          ) : (
            <ul className="list-plain">
              {contributions.map((c) => (
                <li key={c.id}>
                  <div className="spread">
                    <strong>{userName(c.userId)}</strong>
                    <span className="badge">{c.hoursSpent}h</span>
                  </div>
                  <div className="small">{c.description}</div>
                  <Kudos
                    contribution={c}
                    canGive={isMember && c.userId !== currentUser?.id}
                    mine={(c.kudos || []).some((k) => k.userId === currentUser?.id)}
                    onToggle={() => toggleKudos(c.id, currentUser.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {isMember && (
            <ContributionForm
              taskId={taskId}
              teamId={teamId}
              userId={currentUser.id}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
