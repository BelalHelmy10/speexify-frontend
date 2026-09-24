// app/admin/availability/page.js
"use client";

import AdminAvailabilityView from "@/components/admin/AdminAvailabilityView";
import useAuth from "@/hooks/useAuth";
import Link from "next/link";
import { getDictionary, t } from "@/app/i18n";

export default function AdminAvailabilityPage() {
  const { user, checking } = useAuth();
  const copy = getDictionary(user?.language === "ar" ? "ar" : "en", "admin");

  if (checking)
    return (
      <div className="admin-availability-page">
        <div className="admin-shell">
          <div className="admin-state">
            <div className="admin-state__card" role="status" aria-live="polite">{t(copy, "loading")}</div>
          </div>
        </div>
      </div>
    );

  if (user?.role !== "admin")
    return (
      <div className="admin-availability-page">
        <div className="admin-shell">
          <div className="admin-state">
            <div className="admin-state__card">{t(copy, "accessDenied")}</div>
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
            {t(copy, "backToAdmin")}
          </Link>

          <div className="admin-topbar__meta">
            <span className="admin-pill">{t(copy, "admin")}</span>
            <span className="admin-pill admin-pill--soft">{t(copy, "availability")}</span>
          </div>
        </header>

        <AdminAvailabilityView />
      </div>
    </div>
  );
}
