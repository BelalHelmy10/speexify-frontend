"use client";

function ProgressRing({ pct }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="pkg-ring">
      <circle cx="26" cy="26" r={r} className="pkg-ring__track" />
      <circle
        cx="26"
        cy="26"
        r={r}
        className="pkg-ring__fill"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" className="pkg-ring__label">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function PackageCard({ p, toDateInput, fmt }) {
  const used = Number(p.sessionsUsed || 0);
  const total = Number(p.sessionsTotal || 0);
  const remaining = Number(p.remaining ?? total - used);
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  const statusKey = (p.status || "unknown").toLowerCase();
  const statusMap = {
    active: { label: "Active", cls: "active" },
    expired: { label: "Expired", cls: "expired" },
    inactive: { label: "Inactive", cls: "inactive" },
    paused: { label: "Paused", cls: "paused" },
    completed: { label: "Completed", cls: "completed" },
  };
  const badge = statusMap[statusKey] || { label: p.status?.toUpperCase() || "Unknown", cls: "inactive" };

  return (
    <div className={`pkg-card pkg-card--${badge.cls}`}>
      {/* left accent strip */}
      <div className="pkg-card__strip" />

      <div className="pkg-card__body">
        {/* top row */}
        <div className="pkg-card__top">
          <div className="pkg-card__title-group">
            <span className="pkg-card__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </span>
            <h3 className="pkg-card__title">{p.packageTitle || "Unnamed Package"}</h3>
          </div>
          <span className={`pkg-badge pkg-badge--${badge.cls}`}>
            {badge.cls === "active" && <span className="pkg-badge__pulse" />}
            {badge.label}
          </span>
        </div>

        {/* metrics row */}
        <div className="pkg-card__metrics">
          <div className="pkg-card__ring-wrap">
            <ProgressRing pct={usedPct} />
            <span className="pkg-card__ring-sub">used</span>
          </div>

          <div className="pkg-card__stats">
            <div className="pkg-stat">
              <span className="pkg-stat__val">{total}</span>
              <span className="pkg-stat__lbl">Total</span>
            </div>
            <div className="pkg-stat pkg-stat--mid">
              <span className="pkg-stat__val">{used}</span>
              <span className="pkg-stat__lbl">Used</span>
            </div>
            <div className="pkg-stat pkg-stat--remaining">
              <span className="pkg-stat__val">{remaining}</span>
              <span className="pkg-stat__lbl">Left</span>
            </div>
          </div>

          {/* session bar */}
          <div className="pkg-card__bar-wrap">
            <div className="pkg-bar">
              <div className="pkg-bar__fill" style={{ width: `${usedPct}%` }} />
            </div>
            <p className="pkg-bar__legend">
              {used} of {total} sessions used
            </p>
          </div>
        </div>

        {/* footer meta */}
        <div className="pkg-card__meta">
          <span className="pkg-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {p.expiresAt ? `Expires ${toDateInput(p.expiresAt)}` : "No expiry"}
          </span>
          <span className="pkg-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Created {fmt(p.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="pkg-card pkg-card--skeleton">
      <div className="pkg-card__strip" />
      <div className="pkg-card__body">
        <div className="pkg-card__top">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div className="skel skel--icon" />
            <div className="skel skel--title" />
          </div>
          <div className="skel skel--badge" />
        </div>
        <div className="pkg-card__metrics">
          <div className="skel skel--ring" />
          <div className="pkg-card__stats">
            <div className="skel skel--stat" />
            <div className="skel skel--stat" />
            <div className="skel skel--stat" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="skel skel--bar" />
            <div className="skel skel--text" />
          </div>
        </div>
        <div className="pkg-card__meta">
          <div className="skel skel--text" />
          <div className="skel skel--text" />
        </div>
      </div>
    </div>
  );
}

export default function AdminPackagesModal({
  open,
  modalRef,
  selectedUser,
  packagesLoading,
  packages,
  onClose,
  toDateInput,
  fmt,
}) {
  if (!open) return null;

  const activeCount  = packages.filter((p) => (p.status || "").toLowerCase() === "active").length;
  const expiredCount = packages.filter((p) => (p.status || "").toLowerCase() === "expired").length;
  const totalRemaining = packages.reduce((s, p) => s + Number(p.remaining ?? 0), 0);

  const displayName = selectedUser?.name || selectedUser?.email || "User";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="pkg-overlay" role="dialog" aria-modal="true" aria-label={`Packages for ${displayName}`}>
      <div className="pkg-modal" ref={modalRef}>

        {/* ── HEADER ── */}
        <div className="pkg-modal__header">
          <div className="pkg-modal__user">
            <div className="pkg-modal__avatar" aria-hidden="true">{initials}</div>
            <div>
              <p className="pkg-modal__label">Packages for</p>
              <h2 className="pkg-modal__name">{displayName}</h2>
            </div>
          </div>

          {!packagesLoading && packages.length > 0 && (
            <div className="pkg-modal__summary">
              <div className="pkg-summary-chip pkg-summary-chip--active">
                <span className="pkg-summary-chip__dot" />
                {activeCount} active
              </div>
              {expiredCount > 0 && (
                <div className="pkg-summary-chip pkg-summary-chip--expired">
                  {expiredCount} expired
                </div>
              )}
              <div className="pkg-summary-chip pkg-summary-chip--neutral">
                {totalRemaining} sessions left
              </div>
            </div>
          )}

          <button className="pkg-modal__close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="pkg-modal__body">
          {packagesLoading ? (
            <div className="pkg-cards">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : packages.length === 0 ? (
            <div className="pkg-empty">
              <svg className="pkg-empty__icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="16" width="48" height="40" rx="4"/>
                <path d="M20 16v-4a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v4"/>
                <path d="M32 30v8M28 34h8"/>
              </svg>
              <p className="pkg-empty__title">No packages yet</p>
              <p className="pkg-empty__sub">This learner hasn&apos;t been assigned any packages.</p>
            </div>
          ) : (
            <div className="pkg-cards">
              {packages.map((p) => (
                <PackageCard key={p.id} p={p} toDateInput={toDateInput} fmt={fmt} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
