// app/api/pdf-proxy/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      cache: "no-store",
    });

    // console.log("UPSTREAM", upstream);

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream fetch failed", {
        status: upstream.status || 502,
      });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/pdf";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF proxy error:", err);
    return new NextResponse("PDF proxy error", { status: 500 });
  }
}
