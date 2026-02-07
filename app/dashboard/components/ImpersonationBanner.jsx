"use client";

import Link from "next/link";

export default function ImpersonationBanner({ user, onStop }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "#fff",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14l-3-3m3 3l3-3" />
        </svg>
        <div>
          <strong style={{ display: "block", fontSize: "14px" }}>
            👁️ Viewing as: {user?.name || user?.email}
          </strong>
          <span style={{ fontSize: "12px", opacity: 0.9 }}>
            Role: {user?.role} • You are impersonating this user
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <Link
          href="/calendar"
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          📅 View Calendar
        </Link>
        <button
          onClick={onStop}
          style={{
            background: "#fff",
            color: "#d97706",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ✕ Stop Impersonating
        </button>
      </div>
    </div>
  );
}
