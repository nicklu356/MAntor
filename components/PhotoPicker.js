"use client";

// Upload or remove your profile photo. It is shrunk in the browser before saving (lib/avatar.js).
// Who sees it: you, your teammates, mentors you accepted, and your public portfolio if you publish it.
import { useRef, useState } from "react";
import Avatar from "./Avatar";
import { useToast } from "./Toast";
import { useUser } from "./UserProvider";
import { resizeToAvatar } from "@/lib/avatar";
import { saveAvatar } from "@/lib/db";

export default function PhotoPicker() {
  const toast = useToast();
  const { currentUser, refreshProfile, refreshUsers } = useUser();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(photo) {
    setBusy(true);
    setError("");
    try {
      await saveAvatar(currentUser, photo);
      await refreshProfile();
      if (currentUser.role === "mentor") await refreshUsers();
      toast(photo ? "Photo updated" : "Photo removed");
    } catch (e) {
      setError(e.message || "Could not save the photo");
    }
    setBusy(false);
  }

  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still triggers a change
    if (!file) return;
    try {
      await save(await resizeToAvatar(file));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="photo-picker">
      <Avatar id={currentUser.id} size={88} />
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Saving…" : currentUser.photo ? "Change photo" : "Upload photo"}
          </button>
          {currentUser.photo && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => save(null)} disabled={busy}>
              Remove
            </button>
          )}
        </div>
        <span className="muted small">
          {currentUser.role === "mentor"
            ? "Learners see your photo next to your name."
            : "Only you, your teammates and mentors you accepted see it. Mentors otherwise see your initials."}
        </span>
        {error && <span className="error small">{error}</span>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic" onChange={choose} hidden />
    </div>
  );
}
