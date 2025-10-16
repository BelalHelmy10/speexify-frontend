// Server-only helper to read the current user
import { cookies } from "next/headers";

const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:5050";

export async function getServerUser() {
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}
