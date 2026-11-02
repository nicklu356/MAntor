"use client";

// "Ask the mentor": when the AI coach and the team are not enough, a learner flags the task.
// The project's mentor sees it in "Needs your attention", replies in the discussion,
// and marks it as answered. One open request per task keeps it lightweight for mentors.
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { requestHelp, resolveHelp } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { useT } from "@/components/LocaleProvider";

export default function HelpRequest({ task, isMember, isProjectMentor, onChange }) {
  const t = useT();
  const toast = useToast();
  const { currentUser, userName } = useUser();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const help = task.helpRequest;
  const waiting = help && !help.resolvedAt;

  async function send() {
    setBusy(true);
    try {
      await requestHelp(task.id, currentUser.id, note);
      toast(t("Your mentor has been asked. Watch the discussion for their reply."));
      setOpen(false);
      setNote("");
      onChange?.();
    } catch (e) {
      toast(e.message || t("Could not send the request"), "error");
    }
    setBusy(false);
  }

  async function resolve() {
    setBusy(true);
    try {
      await resolveHelp(task.id, currentUser.id);
      toast(t("Marked as answered"));
      onChange?.();
    } catch (e) {
      toast(e.message || t("Could not update the request"), "error");
    }
    setBusy(false);
  }

  if (waiting) {
    return (
      <section className="card help-card">
        <div className="spread">
          <div>
            <strong>
              {isProjectMentor ? t("{name} asked for your help", { name: userName(help.userId) }) : t("Waiting for the mentor")}
            </strong>
            <div className="muted small">
              {isProjectMentor ? "" : `${t("Asked by {name}", { name: userName(help.userId) })} · `}
              {timeAgo(help.at, Date.now(), t)}
            </div>
          </div>
          {isProjectMentor && (
            <button className="btn btn-small" onClick={resolve} disabled={busy}>
              {t("Mark as answered")}
            </button>
          )}
        </div>
        {help.note && <blockquote className="quote">{help.note}</blockquote>}
        {isProjectMentor && <p className="muted small">{t("Reply in the team discussion below, then mark it as answered.")}</p>}
      </section>
    );
  }

  if (!isMember) return null;

  return (
    <section className="card help-card">
      <div className="spread">
        <div>
          <strong>{t("Still stuck?")}</strong>
          <div className="muted small">
            {help?.resolvedAt
              ? t("Your mentor answered the last request {when}. You can ask again.", {
                  when: timeAgo(help.resolvedAt, Date.now(), t),
                })
              : t("Try the AI coach first. If the team is still stuck, ask your mentor.")}
          </div>
        </div>
        {!open && (
          <button className="btn btn-secondary btn-small" onClick={() => setOpen(true)}>
            {t("Ask the mentor")}
          </button>
        )}
      </div>
      {open && (
        <div className="stack" style={{ marginTop: 12 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            style={{ minHeight: 70 }}
            placeholder={t("What have you tried, and where exactly are you stuck?")}
            aria-label={t("What you need help with")}
          />
          <div className="row">
            <button className="btn btn-small" onClick={send} disabled={busy || !note.trim()}>
              {busy ? t("Sending…") : t("Send to mentor")}
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => setOpen(false)} disabled={busy}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
