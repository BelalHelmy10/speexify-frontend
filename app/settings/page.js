"use client";
import Settings from "../../src/pages/Settings";
import { RequireAuth } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}
