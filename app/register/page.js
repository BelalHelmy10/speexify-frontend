"use client";
import Register from "@/legacy/pages/Register";
import { RequireAnon } from "@/components/RouteGuard";

export default function Page() {
  return (
    <RequireAnon>
      <Register />
    </RequireAnon>
  );
}
