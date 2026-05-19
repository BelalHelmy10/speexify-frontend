// app/layout.js
import "./globals.scss";
import "@/lib/sentry";
import "react-calendar/dist/Calendar.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar.scss";
import { Inter, Outfit, Cairo } from "next/font/google";
import { cookies, headers } from "next/headers";

import Providers from "@/components/Providers";
import ClientProviders from "./ClientProviders";
import LocaleShell from "./LocaleShell";
import AppChrome from "@/components/AppChrome";
import { organizationJsonLd, websiteJsonLd } from "./seo";

const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.GOOGLE_SITE_VERIFICATION;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://speexify.com"),

  // Basic SEO
  title: {
    default: "Speexify — Where Ambition Meets Fluency",
    template: "%s — Speexify",
  },
  description:
    "1-on-1 English coaching that turns what you already know into real confidence. For interviews, meetings, and every moment that matters.",
  keywords: [
    "English coaching Egypt",
    "1-on-1 English coaching",
    "English speaking confidence",
    "interview English coaching",
    "professional English training",
    "business English Egypt",
    "English fluency coaching",
    "Speexify",
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
    title: "Speexify — Where Ambition Meets Fluency",
    description:
      "1-on-1 English coaching that turns what you already know into real confidence.",
    siteName: "Speexify",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Speexify — Where Ambition Meets Fluency",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Speexify — Where Ambition Meets Fluency",
    description:
      "1-on-1 English coaching that turns what you already know into real confidence.",
    creator: "@speexify",
    images: ["/twitter-image"],
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

  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
};

export default async function RootLayout({ children }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const locale = requestHeaders.get("x-speexify-locale") || "en";
  const isArabic = locale === "ar";
  const hasSessionCookie = Boolean(cookieStore.get("speexify.sid")?.value);

  return (
    <html
      lang={isArabic ? "ar" : "en"}
      dir={isArabic ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#f25c2e" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${cairo.variable}`}>
        <LocaleShell>
          <ClientProviders>
            <Providers hasSessionCookie={hasSessionCookie}>
              <AppChrome>{children}</AppChrome>
            </Providers>
          </ClientProviders>
        </LocaleShell>
      </body>
    </html>
  );
}
