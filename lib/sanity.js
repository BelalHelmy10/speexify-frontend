// src/lib/sanity.js
import { createClient } from "@sanity/client";
import {
  DEFAULT_SANITY_QUERY_TIMEOUT_MS,
  fetchSanityQuery,
} from "./sanity-query.mjs";
import Sentry from "./sentry";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2024-01-01"; // any recent date, matches your schema

if (!projectId) {
  throw new Error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID – set it in .env.local"
  );
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Keep resource/classroom reads fresh after Sanity imports.
});

function logSanityMetric({ level, ...metric }) {
  const message = `[sanity] ${JSON.stringify({
    event: "sanity_query",
    ...metric,
  })}`;

  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(message);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(message);
  } else {
    // eslint-disable-next-line no-console
    console.info(message);
  }

  if (typeof window !== "undefined" && (level === "error" || level === "warn")) {
    Sentry.withScope?.((scope) => {
      scope.setTag("sanity.query", metric.queryName || "sanity.query");
      scope.setTag("sanity.outcome", level === "error" ? "failure" : "slow");
      scope.setExtra("durationMs", metric.durationMs ?? null);
      scope.setExtra("errorCode", metric.errorCode ?? null);
      Sentry.captureMessage?.(
        level === "error" ? "Sanity query failed" : "Sanity query is slow",
        level === "error" ? "error" : "warning"
      );
    });
  }
}

export function fetchSanity(query, params = {}, options = {}) {
  return fetchSanityQuery(sanityClient, query, params, {
    timeoutMs: DEFAULT_SANITY_QUERY_TIMEOUT_MS,
    ...options,
    logger: options.logger || logSanityMetric,
  });
}
