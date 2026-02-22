// app/layout.js
import "./globals.scss";
import Script from "next/script";
import "@/lib/sentry";
import "react-calendar/dist/Calendar.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { Suspense } from "react";

import { getServerUser } from "./server-auth";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportWidget from "@/components/SupportWidget";
import ScrollToTop from "@/components/ScrollToTop";
import ClientProviders from "./ClientProviders";
import LocaleShell from "./LocaleShell";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";

// Force dynamic rendering so the first paint always reflects the live auth state
export const dynamic = "force-dynamic";

export const metadata = {
  metadataBase: new URL("https://speexify.com"),

  // Basic SEO
  title: {
    default: "Speexify — Personalized Language & Communication Coaching",
    template: "%s — Speexify",
  },
  description:
    "Personalized language and communication coaching for teams and professionals. Improve your speaking skills, communication confidence, and professional presence with expert guidance.",
  keywords: [
    "language coaching",
    "communication coaching",
    "speech training",
    "professional communication",
    "team communication",
    "public speaking",
    "language learning",
    "business communication",
  ],

  // Authors and creators
  authors: [{ name: "Speexify" }],
  creator: "Speexify",
  publisher: "Speexify",

  // Open Graph (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://speexify.com",
    title: "Speexify — Personalized Language & Communication Coaching",
    description:
      "Personalized language and communication coaching for teams and professionals.",
    siteName: "Speexify",
    images: [
      {
        url: "/og-image.png", // Create this: 1200x630px
        width: 1200,
        height: 630,
        alt: "Speexify - Language and Communication Coaching",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Speexify — Personalized Language & Communication Coaching",
    description:
      "Personalized language and communication coaching for teams and professionals.",
    creator: "@speexify",
    images: ["/twitter-image.png"],
  },

  // Robots directives
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Canonical URL
  alternates: {
    canonical: "https://speexify.com",
  },

  // Uncomment after you verify with each service:
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
};

export default async function RootLayout({ children }) {
  // Seed client auth from SSR using the real backend (with cookies)
  const user = await getServerUser();

  return (
    <html lang="en">
      <head>
        {/* Brand fonts for consistent headings/body across all pages */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Jitsi external API for embedded meetings */}
        <Script
          src="https://meet.speexify.com/external_api.js"
          strategy="beforeInteractive"
        />

        {/* Favicons */}
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#F25C2E" />
      </head>
      <body>
        <SmoothScroll />
        <CustomCursor />
        <LocaleShell>
          <ClientProviders>
            <Providers initialUser={user}>
              <Header />
              <Suspense fallback={null}>
                <main>{children}</main>
              </Suspense>
              <Footer />
              <SupportWidget />
              <ScrollToTop />
            </Providers>
          </ClientProviders>
        </LocaleShell>
      </body>
    </html>
  );
}
