"use client";

import Calendar from "../../src/pages/Calendar";
import { RequireAuth } from "../../src/components/RouteGuard";

export default function Page() {
  return (
    <RequireAuth>
      <Calendar />
    </RequireAuth>
  );
}
