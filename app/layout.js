// app/layout.js
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
import "../styles/calendar.scss";
import "./globals.scss";

import { getServerUser } from "./server-auth";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ✅ Add metadata here (server only — allowed)
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
      <body>
        <Providers initialUser={user}>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
