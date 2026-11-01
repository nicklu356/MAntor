import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="card stack" style={{ maxWidth: 560 }}>
      <h1>{t("Page not found")}</h1>
      <p className="muted">{t("This page does not exist, or it was moved.")}</p>
      <div>
        <Link href="/" className="btn">
          {t("Back to home")}
        </Link>
      </div>
    </div>
  );
}
