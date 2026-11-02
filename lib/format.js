// Small display helpers shared by many screens.

// "just now", "5 min ago", "3 h ago", "2 days ago", then the date. Pass `t` to translate.
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
export function timeAgo(iso, nowMs = Date.now(), t = (text, vars) => (vars ? fill(text, vars) : text)) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((nowMs - then) / 1000);
  if (seconds < 45) return t("just now");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("{n} min ago", { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("{n} h ago", { n: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t(days > 1 ? "{n} days ago" : "{n} day ago", { n: days });
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const average = (values) => {
  const nums = values.filter((v) => typeof v === "number");
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
};
