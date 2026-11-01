"use client";

// A person's profile photo, or their initials. Goes through userPhoto()/userName(),
// so it shows exactly what this viewer is allowed to see.
import { useUser } from "./UserProvider";

// "Mia Chen" -> "MC", "Learner #A3F" -> "A3F"
export const initials = (name = "?") =>
  name.startsWith("Learner #")
    ? name.slice(9)
    : name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

export default function Avatar({ id, size = 38, photo, name }) {
  const { userName, userPhoto } = useUser();
  const src = photo !== undefined ? photo : userPhoto(id);
  const label = name || userName(id);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" /> : initials(label)}
    </span>
  );
}
