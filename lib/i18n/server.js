// The visitor's language on the server (cookie, else browser languages).
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, translator } from "./index";

export async function getLocale() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language") || "");
}

export async function getT() {
  return translator(await getLocale());
}
