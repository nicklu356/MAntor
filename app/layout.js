import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
import { UserProvider } from "@/components/UserProvider";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE, TEAM_NAME } from "@/lib/config";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <UserProvider>
          <ToastProvider>
            <Header />
            <main className="container main">
              <AuthGate>{children}</AuthGate>
            </main>
            <footer className="footer container muted small">
              {APP_NAME} by {TEAM_NAME} · FEIT Hackathon 2026 · <Link href="/about">About</Link>
            </footer>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
