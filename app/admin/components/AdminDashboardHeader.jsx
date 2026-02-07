"use client";

import Link from "next/link";

export default function AdminDashboardHeader() {
  return (
    <div className="adm-admin-header">
      <div className="adm-admin-header__content">
        <h1 className="adm-admin-title">
          Admin Dashboard
          <span className="adm-admin-subtitle">
            Manage users, sessions, and monitor teacher workload
          </span>
        </h1>
      </div>

      <div className="adm-admin-header__actions" style={{ gap: 12 }}>
        <Link href="/admin/support" className="adm-btn-primary">
          🛟 Support Inbox
        </Link>
        <Link href="/admin/packages" className="adm-btn-secondary">
          📦 Packages
        </Link>
      </div>
    </div>
  );
}
