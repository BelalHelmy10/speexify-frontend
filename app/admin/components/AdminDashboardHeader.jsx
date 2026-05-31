"use client";

import Link from "next/link";
import { ClipboardCheck, MessageCircle, Package } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AdminDashboardHeader() {
  const pathname = usePathname();
  const prefix = pathname?.startsWith("/ar") ? "/ar" : "";

  return (
    <div className="adm-admin-header">
      <div className="adm-admin-header__content">
        <h1 className="adm-admin-title">
          Admin Dashboard
          <span className="adm-admin-subtitle">
            Manage users, sessions, intake, and teacher workload
          </span>
        </h1>
      </div>

      <div className="adm-admin-header__actions">
        <Link href={`${prefix}/admin/intake`} className="adm-btn-primary">
          <ClipboardCheck size={16} aria-hidden="true" />
          Intake
        </Link>
        <Link href={`${prefix}/admin/support`} className="adm-btn-secondary">
          <MessageCircle size={16} aria-hidden="true" />
          Support Inbox
        </Link>
        <Link href={`${prefix}/admin/packages`} className="adm-btn-secondary">
          <Package size={16} aria-hidden="true" />
          Packages
        </Link>
      </div>
    </div>
  );
}
