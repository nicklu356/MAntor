"use client";

// "Ask the AI coach" on a task: hints and guiding questions, never the finished work.
// The chat is private to the learner and kept in this browser.
import { useEffect, useRef, useState } from "react";
import { MAX_COACH_MESSAGE_CHARS } from "@/lib/config";

const storageKey = (userId, taskId) => `mantor-coach-${userId}-${taskId}`;

export default function CoachPanel({ project, task, criteria, draft, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey(userId, task.id)) || "[]");
      setMessages(Array.isArray(saved) ? saved : []);
    } catch {
      setMessages([]);
    }
  }, [userId, task.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function save(list) {
    setMessages(list);
    try {
      window.localStorage.setItem(storageKey(userId, task.id), JSON.stringify(list.slice(-30)));
    } catch {}
  }

  async function ask(question) {
    const content = question.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    save(next);
    setText("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: { title: project.title, description: project.description },
          task: { title: task.title, description: task.description },
          criteria: criteria.map((c) => ({ name: c.name, description: c.description })),
          draft,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The coach could not answer");
      save([...next, { role: "assistant", content: data.reply, simulated: data.simulated }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const suggestions = [
    "Where should I start?",
    draft ? "Is my draft good enough yet?" : "What would a strong answer include?",
    criteria[0] && `What does "${criteria[0].name}" mean in practice?`,
  ].filter(Boolean);

  return (
    <section className="card">
      <div className="spread">
        <div>
          <h2>Ask the AI coach</h2>
          <p className="muted small">
            Stuck? The coach gives hints and asks questions, but won&apos;t do the task for you. Only you see this chat.
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost btn-small" onClick={() => save([])} disabled={loading}>
            Clear chat
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="chat" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "bubble bubble-me" : "bubble"}>
              {m.simulated && <span className="badge badge-amber">Simulated</span>}
              <div className="pre">{m.content}</div>
            </div>
          ))}
          {loading && <div className="bubble muted">Thinking…</div>}
        </div>
      )}

      <div className="chips" style={{ marginTop: 12, marginBottom: 8 }}>
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip chip-small" onClick={() => ask(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_COACH_MESSAGE_CHARS}
          placeholder="Ask about this task…"
          aria-label="Question for the AI coach"
          disabled={loading}
        />
        <button className="btn btn-secondary" disabled={loading || !text.trim()}>
          Ask
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
