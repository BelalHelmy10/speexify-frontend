import { NextResponse } from "next/server";

const GEO_TIMEOUT_MS = 2500;

async function fetchGeo(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) return null;

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req) {
  const xf = req.headers.get("x-forwarded-for");
  const ip = xf ? xf.split(",")[0].trim() : "";

  const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`;
  const j = await fetchGeo(url);

  return NextResponse.json({
    country: j?.country || null,
    country_code: j?.country_code || j?.country || null,
    currency: j?.currency || null,
  });
}
