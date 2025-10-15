"use client";

import Calendar from "@/legacy/pages/Calendar";
import { RequireAuth } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Calendar />
    </RequireAuth>
  );
}
