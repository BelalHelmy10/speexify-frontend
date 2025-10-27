// app/layout.js
import "./globals.scss";
import "react-calendar/dist/Calendar.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar.scss";

import { getServerUser } from "./server-auth";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Force dynamic rendering so the first paint always reflects the live auth state
export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Speexify", template: "%s — Speexify" },
  description:
    "Welcome to Speexify — personalized language and communication coaching for teams and professionals.",
  metadataBase: new URL("https://speexify.com"),
  openGraph: {
    title: "Speexify",
    description:
      "Personalized language and communication coaching for teams and professionals.",
    url: "/",
    siteName: "Speexify",
    type: "website",
  },
};

export default async function RootLayout({ children }) {
  // Seed client auth from SSR using the real backend (with cookies)
  const user = await getServerUser();

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers initialUser={user}>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
