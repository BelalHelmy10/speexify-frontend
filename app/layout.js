// app/layout.js
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
import "../styles/calendar.scss";
import "./globals.scss";

import { getServerUser } from "./server-auth";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
