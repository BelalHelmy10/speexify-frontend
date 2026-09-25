/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// BACKEND_API_BASE is preferred (server-only on Vercel)
// NEXT_PUBLIC_API_URL is a fallback (client-exposed; avoid if possible)
const rawBase =
  process.env.BACKEND_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5050";

// Normalize:
// - remove trailing slashes
// - if someone set ".../api", strip that so we don't end up with "/api/api"
const apiBase = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");

const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
const googleAuthDisabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_DISABLED === "true";
const localGoogleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST === "true";
const isVercelProductionBuild =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
const looksLikePlaceholderGoogleClient =
  !googleClientId || /your-|localhost|example\.com/i.test(googleClientId);

if (process.env.NODE_ENV === "production") {
  if (looksLikePlaceholderGoogleClient || googleAuthDisabled) {
    throw new Error(
      "Production builds require a real NEXT_PUBLIC_GOOGLE_CLIENT_ID and enabled Google OAuth configuration"
    );
  }
  if (isVercelProductionBuild && localGoogleAuthEnabled) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST must be false in Vercel production"
    );
  }
}

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      'camera=(self "https://meet.speexify.com"), microphone=(self "https://meet.speexify.com"), fullscreen=(self "https://meet.speexify.com"), display-capture=(self "https://meet.speexify.com"), geolocation=(), payment=(self)',
  },
];

const nextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
  images: {
    qualities: [75, 82],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async rewrites() {
    // /api/* (Next) → <backend>/api/* (Express)
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
