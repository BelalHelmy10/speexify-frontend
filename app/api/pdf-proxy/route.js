// app/api/pdf-proxy/route.js
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const DEFAULT_ALLOWED_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "cdn.sanity.io",
];
const MAX_REDIRECTS = 5;
const MAX_PDF_BYTES = Number(
  process.env.PDF_PROXY_MAX_BYTES || 25 * 1024 * 1024
);
const FETCH_TIMEOUT_MS = Number(process.env.PDF_PROXY_TIMEOUT_MS || 15000);

function parseAllowedHosts(rawHosts) {
  const list = String(rawHosts || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_HOSTS;
}

function isIpLiteral(hostname) {
  const lower = String(hostname || "").toLowerCase();
  if (!lower) return false;

  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(lower);
  const isBracketedIpv6 = lower.startsWith("[") && lower.endsWith("]");
  const isIpv6 = !isBracketedIpv6 && lower.includes(":");
  return isIpv4 || isBracketedIpv6 || isIpv6;
}

function isLocalHostname(hostname) {
  const lower = String(hostname || "").toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  );
}

function matchesAllowedHost(hostname, pattern) {
  if (!hostname || !pattern) return false;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  return hostname === pattern;
}

function validateTargetUrl(rawTargetUrl, allowedHosts) {
  let parsed;
  try {
    parsed = new URL(rawTargetUrl);
  } catch {
    return { valid: false, reason: "Invalid url parameter" };
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only HTTP(S) URLs are allowed" };
  }

  if (isProd && parsed.protocol !== "https:") {
    return { valid: false, reason: "Only HTTPS is allowed in production" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, reason: "URL hostname is required" };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "URL credentials are not allowed" };
  }

  const port = parsed.port || "";
  const allowedPort =
    (parsed.protocol === "https:" && (port === "" || port === "443")) ||
    (parsed.protocol === "http:" && (port === "" || port === "80"));
  if (!allowedPort) {
    return { valid: false, reason: "Custom ports are not allowed" };
  }

  if (isIpLiteral(hostname) || isLocalHostname(hostname)) {
    return { valid: false, reason: "Direct IP/local hosts are blocked" };
  }

  const isAllowed = allowedHosts.some((pattern) =>
    matchesAllowedHost(hostname, pattern)
  );
  if (!isAllowed) {
    return { valid: false, reason: "Host is not allowlisted" };
  }

  return { valid: true, url: parsed.toString() };
}

function isPdfContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();
  return normalized.includes("application/pdf");
}

function isRedirectStatus(code) {
  return [301, 302, 303, 307, 308].includes(Number(code));
}

async function fetchWithValidatedRedirects(startUrl, options, allowedHosts) {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const upstream = await fetch(currentUrl, {
      ...options,
      redirect: "manual",
    });

    if (!isRedirectStatus(upstream.status)) {
      return upstream;
    }

    const location = upstream.headers.get("location");
    if (!location) {
      return upstream;
    }

    const nextUrl = new URL(location, currentUrl).toString();
    const nextValidation = validateTargetUrl(nextUrl, allowedHosts);
    if (!nextValidation.valid) {
      throw new Error(`Blocked redirect target: ${nextValidation.reason}`);
    }

    currentUrl = nextValidation.url;
  }

  throw new Error("Too many upstream redirects");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrlRaw = searchParams.get("url");

  if (!targetUrlRaw) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const allowedHosts = parseAllowedHosts(process.env.PDF_PROXY_ALLOWED_HOSTS);
  const targetValidation = validateTargetUrl(targetUrlRaw, allowedHosts);
  if (!targetValidation.valid) {
    return new NextResponse(targetValidation.reason, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetchWithValidatedRedirects(
      targetValidation.url,
      {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,application/octet-stream;q=0.9",
      },
      },
      allowedHosts
    );

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream fetch failed", {
        status: upstream.status || 502,
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!isPdfContentType(contentType)) {
      return new NextResponse("Upstream did not return a PDF", { status: 415 });
    }

    const upstreamContentLength = Number(upstream.headers.get("content-length"));
    if (
      Number.isFinite(upstreamContentLength) &&
      upstreamContentLength > MAX_PDF_BYTES
    ) {
      return new NextResponse("PDF is too large", { status: 413 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      return new NextResponse("Upstream request timed out", { status: 504 });
    }

    if (
      typeof err?.message === "string" &&
      err.message.startsWith("Blocked redirect target:")
    ) {
      return new NextResponse(err.message, { status: 400 });
    }

    if (typeof err?.message === "string" && err.message.includes("redirect")) {
      return new NextResponse(err.message, { status: 502 });
    }

    console.error("PDF proxy error:", err);
    return new NextResponse("PDF proxy error", { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
