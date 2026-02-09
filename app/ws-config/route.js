// app/ws-config/route.js
import { NextResponse } from "next/server";

function buildClassroomWsUrl(rawBase) {
  if (!rawBase || typeof rawBase !== "string") return null;

  try {
    const url = new URL(rawBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/classroom";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const rawBase =
    process.env.BACKEND_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const classroomWsUrl = buildClassroomWsUrl(rawBase);

  return NextResponse.json(
    { classroomWsUrl: classroomWsUrl || null },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      },
    }
  );
}
