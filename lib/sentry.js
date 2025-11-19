// web/src/lib/sentry.js
import * as Sentry from "@sentry/browser";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

if (dsn && typeof window !== "undefined") {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
  });
}

export default Sentry;
