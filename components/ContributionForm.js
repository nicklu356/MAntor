"use client";

import { useState } from "react";
import { addContribution } from "@/lib/db";

export default function ContributionForm({ taskId, teamId, userId, onAdded }) {
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("1");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    await addContribution({ taskId, teamId, userId, description: description.trim(), hoursSpent: hours });
    setDescription("");
    setHours("1");
    setSaving(false);
    onAdded?.();
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 16 }}>
      <label className="field">
        What did you do?
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Ran 2 interviews and wrote the summary"
          style={{ minHeight: 80 }}
        />
      </label>
      <label className="field">
        Hours spent
        <input
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </label>
      <div>
        <button className="btn btn-secondary" disabled={saving || !description.trim()}>
          {saving ? "Saving…" : "Add contribution"}
        </button>
      </div>
    </form>
  );
}
