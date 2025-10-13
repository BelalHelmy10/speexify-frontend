"use client";
import Login from "../../src/pages/Login";
import { RequireAnon } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAnon>
      <Login />
    </RequireAnon>
  );
}
