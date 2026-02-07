"use client";

import Link from "next/link";

export default function AdminAccessFallback({ checking, isAdmin }) {
  if (checking) {
    return (
      <div className="adm-admin-modern adm-admin-loading">
        Checking your permissions…
      </div>
    );
  }

  if (isAdmin) return null;

  return (
    <div className="adm-admin-modern adm-admin-denied">
      <div className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__icon adm-admin-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 22H22L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9V14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="adm-admin-card__title">Access denied</h1>
              <p className="adm-admin-card__subtitle">
                You don&apos;t have permission to view this page.
              </p>
            </div>
          </div>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <p style={{ marginBottom: "1rem" }}>
            If you think this is a mistake, please contact the site administrator.
          </p>
          <Link href="/dashboard" className="adm-btn-primary">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
