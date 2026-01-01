// app/admin/availability/page.js
"use client";

import AdminAvailabilityView from "@/components/admin/AdminAvailabilityView";
import useAuth from "@/hooks/useAuth";
import Link from "next/link";

export default function AdminAvailabilityPage() {
  const { user, checking } = useAuth();

  if (checking)
    return (
      <div className="admin-availability-page">
        <div className="admin-shell">
          <div className="admin-state">
            <div className="admin-state__card">Loading…</div>
          </div>
        </div>
      </div>
    );

  if (user?.role !== "admin")
    return (
      <div className="admin-availability-page">
        <div className="admin-shell">
          <div className="admin-state">
            <div className="admin-state__card">Access denied</div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="admin-availability-page">
      <div className="admin-shell">
        <header className="admin-topbar">
          <Link href="/admin" className="admin-backlink">
            <span className="admin-backlink__icon" aria-hidden="true">
              ←
            </span>
            Back to Admin
          </Link>

          <div className="admin-topbar__meta">
            <span className="admin-pill">Admin</span>
            <span className="admin-pill admin-pill--soft">Availability</span>
          </div>
        </header>

        <AdminAvailabilityView />
      </div>
    </div>
  );
}
