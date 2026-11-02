"use client";

// Short team discussion under a task. Learners of the team and the project's mentor can post.
// Names go through userName(), so a mentor only sees anonymous learner names.
import { useState } from "react";
import { useUser } from "@/components/UserProvider";
import { MAX_COMMENT_CHARS } from "@/lib/config";
import { addComment } from "@/lib/db";
import { useLiveList } from "@/lib/live";
import { useT } from "@/components/LocaleProvider";

export default function CommentThread({ taskId, teamId, canPost }) {
  const t = useT();
  const { currentUser, users, userName } = useUser();
  // Live: new messages from teammates appear without reloading.
  const comments = useLiveList("comments", "taskId", taskId) || [];
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    setSaving(true);
    await addComment({ taskId, teamId, userId: currentUser.id, text: text.trim() });
    setText("");
    setSaving(false);
  }

  const roleOf = (id) => users.find((u) => u.id === id)?.role;

  return (
    <section className="card">
      <h2>{t("Team discussion")}</h2>
      {comments.length === 0 ? (
        <p className="muted small">{t("No messages yet.")}</p>
      ) : (
        <ul className="list-plain">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="row">
                <strong>{userName(c.userId)}</strong>
                {roleOf(c.userId) === "mentor" && <span className="badge badge-blue">{t("Mentor")}</span>}
                <span className="muted small">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="pre">{c.text}</div>
            </li>
          ))}
        </ul>
      )}
      {canPost && (
        <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 12 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_COMMENT_CHARS}
            placeholder={t("Write a message to the team…")}
            style={{ minHeight: 70 }}
            aria-label={t("Message")}
          />
          <div>
            <button className="btn btn-secondary" disabled={saving || !text.trim()}>
              {saving ? t("Sending…") : t("Send")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
