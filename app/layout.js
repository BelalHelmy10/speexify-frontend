// app/layout.js
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
import "../styles/calendar.scss";
import "./globals.scss";

import { cookies } from "next/headers";
import Header from "../components/Header";
import Header from "../components/Footer";
import Header from "../components/Providers";

const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:5050";

async function getServerUser() {
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const user = await getServerUser();

  return (
    <html lang="en">
      <body>
        <Providers initialUser={user}>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
