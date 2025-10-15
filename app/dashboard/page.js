"use client";
import Dashboard from "@/legacy/pages/Dashboard";
import { RequireAuth } from "@/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
