// src/setupProxy.js
// Only used by Create React App's dev server, NOT by Next.js or Vercel.
// Keep only if you still run CRA locally. Safe to delete otherwise.

const { createProxyMiddleware } = require("http-proxy-middleware");

// Prefer an env var; fall back to NEXT_PUBLIC_API_URL; then to localhost.
// Trailing slashes trimmed for consistency.
const rawTarget =
  process.env.PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5050";

const target = rawTarget.replace(/\/+$/, ""); // e.g., https://api.example.com

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target, // -> https://... or http://localhost:5050
      changeOrigin: true, // needed for many backends / CORS
      secure: false, // allow self-signed in dev; flip to true if using valid TLS
      // If your backend expects cookies on localhost:
      // cookieDomainRewrite: "localhost",

      // Ensure /api/foo stays /api/foo on the target (default behavior is fine),
      // but you can customize if your server mounts differently:
      // pathRewrite: { "^/api": "/api" },

      logLevel: "warn",
    })
  );
};
