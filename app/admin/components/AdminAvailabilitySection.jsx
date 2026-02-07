"use client";

import Link from "next/link";

export default function AdminAvailabilitySection() {
  return (
    <section className="adm-admin-card">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M3 10H21M8 2V6M16 2V6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M9 15L11 17L15 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="adm-admin-card__title">User Availability</h2>
            <p className="adm-admin-card__subtitle">
              See when learners and teachers are available
            </p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <Link href="/admin/availability" className="adm-btn-primary">
            🗓️ View Availability Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
