"use client";
import Register from "../../src/pages/Register";
import { RequireAnon } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAnon>
      <Register />
    </RequireAnon>
  );
}
