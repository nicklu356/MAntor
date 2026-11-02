import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ToastProvider } from "@/components/Toast";
import { UserProvider } from "@/components/UserProvider";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE, TEAM_NAME } from "@/lib/config";
import { getLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

// Fonts are exposed as CSS variables; app/globals.css builds --font and --font-display from them.
const body = Inter({ subsets: ["latin"], variable: "--nf-body", display: "swap" });
const display = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--nf-display",
  display: "swap",
});

export const metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  openGraph: { title: APP_NAME, description: APP_TAGLINE, type: "website" },
};

export const viewport = { themeColor: "#1c2640" };

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <html lang={locale} className={`${body.variable} ${display.variable}`}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <UserProvider>
            <ToastProvider>
              <Header />
              <main className="container main">
                <AuthGate>{children}</AuthGate>
              </main>
              <footer className="footer container muted small">
                {t("{app} by {team}", { app: APP_NAME, team: TEAM_NAME })} · FEIT Hackathon 2026 ·{" "}
                <Link href="/about">{t("About")}</Link> · <Link href="/privacy">{t("Privacy and terms")}</Link>
              </footer>
            </ToastProvider>
          </UserProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
