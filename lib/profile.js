// A learner's basic details, like the first page of a job application: name, date of birth and
// education. Stored in profiles/{uid}, which only the owner can read (see firestore.rules).

export const EDUCATION_LEVELS = [
  "High school",
  "Vocational / diploma",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Other",
];

export const MIN_AGE = 13;

export const fullName = (p) => [p?.firstName, p?.lastName].map((s) => (s || "").trim()).filter(Boolean).join(" ");

// "Ada Lovelace King" -> { firstName: "Ada Lovelace", lastName: "King" } (used to prefill from Google).
export function splitName(displayName) {
  const parts = String(displayName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function ageOn(dateOfBirth, today = new Date()) {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  return beforeBirthday ? age - 1 : age;
}

// Returns an error message, or "" when the details are fine.
export function validateProfile(details, today = new Date()) {
  if (!details.firstName?.trim()) return "Enter your first name.";
  if (!details.lastName?.trim()) return "Enter your last name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.dateOfBirth || "")) return "Enter your date of birth.";
  const age = ageOn(details.dateOfBirth, today);
  if (age === null || age < 0) return "That date of birth is in the future.";
  if (age < MIN_AGE) return `You need to be at least ${MIN_AGE} to use MAntor.`;
  if (age > 110) return "Check the year of your date of birth.";
  if (!EDUCATION_LEVELS.includes(details.educationLevel)) return "Choose your highest level of education.";
  if (!details.school?.trim()) return "Enter your school or university.";
  if (!details.fieldOfStudy?.trim()) return "Enter your field of study (or “General” for high school).";
  const year = details.graduationYear;
  if (year !== "" && year != null) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1950 || y > today.getFullYear() + 8) return "Check the graduation year.";
  }
  return "";
}

export const isProfileComplete = (p) => Boolean(p && !validateProfile(p));

// Only the fields we store, trimmed.
export function cleanProfile(details) {
  return {
    firstName: details.firstName.trim(),
    lastName: details.lastName.trim(),
    name: fullName(details),
    dateOfBirth: details.dateOfBirth,
    educationLevel: details.educationLevel,
    school: details.school.trim(),
    fieldOfStudy: details.fieldOfStudy.trim(),
    graduationYear: details.graduationYear === "" || details.graduationYear == null ? null : Number(details.graduationYear),
  };
}
