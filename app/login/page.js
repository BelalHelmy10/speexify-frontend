"use client";
import Login from "@/legacy/pages/Login";
import { RequireAnon } from "@/components/RouteGuard";

export default function Page() {
  return (
    <RequireAnon>
      <Login />
    </RequireAnon>
  );
}
