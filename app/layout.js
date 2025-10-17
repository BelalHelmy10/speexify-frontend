// app/layout.js
import "./globals.scss";
import "react-calendar/dist/Calendar.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar.scss";

import { getServerUser } from "./server-auth";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ✅ Server-side metadata
export const metadata = {
  title: "Home — Speexify",
  description:
    "Welcome to Speexify — personalized language and communication coaching for teams and professionals.",
  openGraph: {
    title: "Speexify",
    description:
      "Personalized language and communication coaching for teams and professionals.",
    url: "https://speexify.vercel.app",
    siteName: "Speexify",
    type: "website",
  },
};

export default async function RootLayout({ children }) {
  const user = await getServerUser();

  return (
    <html lang="en">
      {/* hydration guard avoids noisy console warnings if any client theme toggles exist */}
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
