// Translations. The English text is the key: t("Log in") shows "登入" in Traditional Chinese,
// and anything without a translation simply stays in English. Placeholders use {name}:
// t("{done} of {total} tasks done", { done: 2, total: 4 }).
import zhTW from "./zh-TW.js";

export const LOCALES = ["en", "zh-TW"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "mantor-lang";
export const LOCALE_NAMES = { en: "English", "zh-TW": "繁體中文" };

const dictionaries = { "zh-TW": zhTW };

export function translate(locale, text, vars) {
  const template = dictionaries[locale]?.[text] ?? text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export const translator = (locale) => (text, vars) => translate(locale, text, vars);

// From the cookie, or the browser's languages ("zh-TW,zh;q=0.9,en;q=0.8") on the first visit.
export function pickLocale(cookieValue, acceptLanguage = "") {
  if (LOCALES.includes(cookieValue)) return cookieValue;
  return /\bzh\b|zh-/i.test(acceptLanguage) ? "zh-TW" : DEFAULT_LOCALE;
}

// For prompts: the language Claude should write in.
export const aiLanguage = (locale) =>
  locale === "zh-TW" ? "Write every sentence in Traditional Chinese as used in Taiwan (繁體中文)." : "";
