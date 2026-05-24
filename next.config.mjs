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

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://meet.speexify.com",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "frame-src 'self' https://accounts.google.com https://meet.jit.si https://*.jit.si https://meet.speexify.com https://accept.paymob.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://docs.google.com https://drive.google.com",
      `connect-src 'self' ${apiBase} ${apiBase.replace(/^http:/, "ws:").replace(/^https:/, "wss:")} ws://localhost:5050 wss://localhost:5050 https://ipapi.co https://accounts.google.com https://*.sentry.io https://cdn.sanity.io https://*.sanity.io https://meet.speexify.com https://*.jit.si`,
      "worker-src 'self' blob:",
    ].join("; "),
  },
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
