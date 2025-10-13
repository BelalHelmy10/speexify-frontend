"use client";
import Dashboard from "../../src/pages/Dashboard";
import { RequireAuth } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
