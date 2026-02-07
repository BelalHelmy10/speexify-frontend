"use client";

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

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-content" ref={modalRef}>
        <div className="adm-modal-header">
          <h2>Packages for {selectedUser?.name || selectedUser?.email || "User"}</h2>
          <button className="adm-btn-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {packagesLoading ? (
          <div className="adm-table-skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton skeleton--row" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="adm-empty">No packages found for this user.</div>
        ) : (
          <table className="adm-packages-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Total</th>
                <th>Used</th>
                <th>Remaining</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td>{p.packageTitle}</td>
                  <td>{p.sessionsTotal}</td>
                  <td>{p.sessionsUsed}</td>
                  <td>{p.remaining}</td>
                  <td>{p.expiresAt ? toDateInput(p.expiresAt) : "None"}</td>
                  <td>
                    <span
                      className={`adm-status-badge ${
                        p.status === "active"
                          ? "adm-status-badge--active"
                          : "adm-status-badge--inactive"
                      }`}
                    >
                      {p.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </td>
                  <td>{fmt(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
