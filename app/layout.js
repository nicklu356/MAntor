import "./globals.css";
import Header from "@/components/Header";
import { UserProvider } from "@/components/UserProvider";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export const metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <Header />
          <main className="container main">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
