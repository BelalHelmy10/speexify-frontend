"use client";

export default function AdminBulkActionBar({
  selectedUserIds,
  selectedSessionIds,
  bulkActionLoading,
  bulkEnableUsers,
  bulkDisableUsers,
  bulkChangeUserRole,
  bulkResetPasswords,
  bulkDeleteSessions,
  bulkCancelSessions,
  bulkAssignTeacher,
  teachers,
  clearAllSelections,
}) {
  if (selectedUserIds.size === 0 && selectedSessionIds.size === 0) return null;

  return (
    <div className="adm-bulk-action-bar">
      <div className="adm-bulk-action-bar__info">
        <span className="adm-bulk-action-bar__count">
          {selectedUserIds.size > 0
            ? `${selectedUserIds.size} user${selectedUserIds.size !== 1 ? "s" : ""}`
            : `${selectedSessionIds.size} session${selectedSessionIds.size !== 1 ? "s" : ""}`} selected
        </span>
      </div>

      <div className="adm-bulk-action-bar__actions">
        {selectedUserIds.size > 0 && (
          <>
            <button
              className="adm-bulk-btn adm-bulk-btn--success"
              onClick={bulkEnableUsers}
              disabled={bulkActionLoading}
            >
              ✓ Enable
            </button>
            <button
              className="adm-bulk-btn adm-bulk-btn--danger"
              onClick={bulkDisableUsers}
              disabled={bulkActionLoading}
            >
              ✕ Disable
            </button>
            <select
              className="adm-bulk-select"
              onChange={(e) => {
                if (e.target.value) bulkChangeUserRole(e.target.value);
                e.target.value = "";
              }}
              disabled={bulkActionLoading}
            >
              <option value="">Change Role...</option>
              <option value="learner">Learner</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="adm-bulk-btn"
              onClick={bulkResetPasswords}
              disabled={bulkActionLoading}
            >
              📧 Reset Passwords
            </button>
          </>
        )}

        {selectedSessionIds.size > 0 && (
          <>
            <button
              className="adm-bulk-btn adm-bulk-btn--danger"
              onClick={bulkDeleteSessions}
              disabled={bulkActionLoading}
            >
              🗑️ Delete
            </button>
            <button
              className="adm-bulk-btn adm-bulk-btn--warning"
              onClick={bulkCancelSessions}
              disabled={bulkActionLoading}
            >
              ✕ Cancel
            </button>
            <select
              className="adm-bulk-select"
              onChange={(e) => {
                if (e.target.value) bulkAssignTeacher(e.target.value);
                e.target.value = "";
              }}
              disabled={bulkActionLoading}
            >
              <option value="">Assign Teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <button
        className="adm-bulk-action-bar__close"
        onClick={clearAllSelections}
        title="Clear selection"
      >
        ✕
      </button>

      {bulkActionLoading && <div className="adm-bulk-action-bar__loading">Processing...</div>}
    </div>
  );
}
