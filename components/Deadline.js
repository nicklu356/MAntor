"use client";

// Deadlines on the board and task page, and the team's milestones (one per week).
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { dueLabel, dueState, formatDay, isDate, localDate, milestones, teamProgress } from "@/lib/schedule";

const TONE = { overdue: "badge badge-late", today: "badge badge-amber", soon: "badge badge-amber", later: "badge" };

export function DueBadge({ task }) {
  const { t, locale } = useLocale();
  const state = dueState(task, localDate());
  if (!state) return null;
  return (
    <span className={TONE[state.kind]} title={formatDay(task.dueDate, locale)}>
      {dueLabel(task, t, localDate(), locale)}
    </span>
  );
}

// "Week 2 of 4 · ends 28 Nov" for the team header ("" without dates).
export function useTeamWeek(team) {
  const { t, locale } = useLocale();
  const progress = teamProgress(team, localDate());
  if (!progress || team.status !== "active") return "";
  if (progress.finished) return t("Planned end was {date}", { date: formatDay(team.endDate, locale) });
  return t("Week {week} of {weeks} · ends {date}", { ...progress, date: formatDay(team.endDate, locale) });
}

export function Milestones({ team, tasks }) {
  const { t, locale } = useLocale();
  const today = localDate();
  const steps = milestones(team, tasks, today);
  const progress = teamProgress(team, today);
  if (!steps.length) return null;
  const done = tasks.filter((task) => task.status === "done").length;
  const workShare = tasks.length ? done / tasks.length : 0;
  const behind = team.status === "active" && progress.timeShare - workShare > 0.25;

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <div className="spread">
        <h2>{t("Milestones")}</h2>
        {behind ? (
          <span className="badge badge-late">{t("Behind plan")}</span>
        ) : (
          team.status === "active" && <span className="badge badge-green">{t("On track")}</span>
        )}
      </div>
      <p className="muted small">
        {t("{time}% of the time used · {work}% of the tasks done", {
          time: Math.round(progress.timeShare * 100),
          work: Math.round(workShare * 100),
        })}
      </p>
      <ol className="timeline">
        {steps.map((step) => (
          <li key={step.week} className={step.done ? "done" : step.late ? "late" : step.current ? "current" : ""}>
            <span className="dot">{step.done ? "✓" : step.week}</span>
            <div>
              <strong>{t("Week {n}", { n: step.week })}</strong>{" "}
              <span className="muted small">
                · {t("ends {date}", { date: formatDay(step.end, locale) })}
                {step.current && ` · ${t("this week")}`}
              </span>
              <div className="small">
                {step.tasks.length === 0 ? (
                  <span className="muted">{t("No tasks this week")}</span>
                ) : (
                  step.tasks.map((task, i) => (
                    <span key={task.id}>
                      {i > 0 && " · "}
                      <Link href={`/teams/${team.id}/tasks/${task.id}`}>
                        {task.status === "done" ? "✓ " : ""}
                        {task.title}
                      </Link>
                    </span>
                  ))
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Task page: the due date, which team members can move (for example when the team agrees on more time).
export function DueDate({ task, canEdit, onSave }) {
  const { t, locale } = useLocale();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.dueDate || "");
  const [saving, setSaving] = useState(false);
  if (!task.dueDate && !canEdit) return null;

  async function save(e) {
    e.preventDefault();
    if (!isDate(value)) return;
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="row small" onSubmit={save}>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t("Due date")}
          style={{ width: "auto" }}
          required
        />
        <button className="btn btn-small" disabled={saving || !isDate(value)}>
          {t("Save")}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(false)}>
          {t("Cancel")}
        </button>
      </form>
    );
  }
  return (
    <span className="row small">
      {task.dueDate ? (
        <>
          <span className="muted">{t("Due {date}", { date: formatDay(task.dueDate, locale) })}</span>
          {dueState(task, localDate())?.kind !== "later" && <DueBadge task={task} />}
        </>
      ) : (
        <span className="muted">{t("No due date")}</span>
      )}
      {canEdit && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setValue(task.dueDate || localDate());
            setEditing(true);
          }}
        >
          {t("Change")}
        </button>
      )}
    </span>
  );
}
