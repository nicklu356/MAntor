"use client";

// Basic details, like the first page of a job application. Used right after sign-up
// ("complete your profile") and on the Account page. Only the owner can read them.
import { useState } from "react";
import { useUser } from "./UserProvider";
import { saveProfile } from "@/lib/db";
import { EDUCATION_LEVELS, MIN_AGE, validateProfile } from "@/lib/profile";
import { useT } from "./LocaleProvider";

const fromProfile = (p) => ({
  firstName: p?.firstName || "",
  lastName: p?.lastName || "",
  dateOfBirth: p?.dateOfBirth || "",
  educationLevel: p?.educationLevel || "",
  school: p?.school || "",
  fieldOfStudy: p?.fieldOfStudy || "",
  graduationYear: p?.graduationYear ?? "",
});

export default function ProfileForm({ submitLabel, onSaved }) {
  const t = useT();
  const { currentUser, profile, refreshProfile, authInfo } = useUser();
  const [form, setForm] = useState(() => fromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (changes) => setForm((f) => ({ ...f, ...changes }));
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

  async function submit(e) {
    e.preventDefault();
    const problem = validateProfile(form, new Date(), t);
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    try {
      await saveProfile(currentUser.id, form, authInfo?.email || profile?.email);
      await refreshProfile();
      onSaved?.();
    } catch (err) {
      setError(err.message || t("Could not save your details"));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <div className="form-row">
        <label className="field">
          {t("First name")}
          <input value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" maxLength={40} />
        </label>
        <label className="field">
          {t("Last name")}
          <input value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" maxLength={40} />
        </label>
        <label className="field">
          {t("Date of birth")}
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            autoComplete="bday"
            max={maxBirthDate}
            min="1915-01-01"
          />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          {t("Highest education")}
          <select value={form.educationLevel} onChange={(e) => set({ educationLevel: e.target.value })}>
            <option value="">{t("Choose…")}</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(l)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("Graduation year (optional)")}
          <input
            type="number"
            inputMode="numeric"
            value={form.graduationYear}
            onChange={(e) => set({ graduationYear: e.target.value })}
            placeholder={t("e.g. {year} (or expected)", { year: today.getFullYear() })}
            min="1950"
            max={today.getFullYear() + 8}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          {t("School or university")}
          <input
            value={form.school}
            onChange={(e) => set({ school: e.target.value })}
            maxLength={100}
            placeholder={t("e.g. University of Melbourne")}
          />
        </label>
        <label className="field">
          {t("Field of study")}
          <input
            value={form.fieldOfStudy}
            onChange={(e) => set({ fieldOfStudy: e.target.value })}
            maxLength={100}
            placeholder={t("e.g. Computer Science")}
          />
        </label>
      </div>

      <p className="muted small">
        {t("Only you can see your date of birth and education. Teammates see your name; mentors see {anon}.", {
          anon: currentUser?.anonymousName || t("an anonymous name"),
        })}
      </p>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
