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
        <div className="p-8">Loading...</div>
      </div>
    );

  if (user?.role !== "admin")
    return (
      <div className="admin-availability-page">
        <div className="p-8">Access denied</div>
      </div>
    );

  return (
    <div className="admin-availability-page">
      {/* IMPORTANT: this must be a direct child for your SCSS selectors */}
      <div className="space-y-6">
        <Link
          href="/admin"
          className="text-violet-600 hover:underline inline-block"
        >
          ← Back to Admin
        </Link>

        <AdminAvailabilityView />
      </div>
    </div>
  );
}
