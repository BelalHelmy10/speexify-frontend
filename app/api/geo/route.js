import { NextResponse } from "next/server";

export async function GET(req) {
  const xf = req.headers.get("x-forwarded-for");
  const ip = xf ? xf.split(",")[0].trim() : "";

  const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`;
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();

  return NextResponse.json({
    country: j?.country || null,
    currency: j?.currency || null,
  });
}
