"use client";
import Settings from "@/legacy/pages/Settings";
import { RequireAuth } from "@/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}
