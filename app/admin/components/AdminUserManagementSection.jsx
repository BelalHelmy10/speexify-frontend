"use client";

export default function AdminUserManagementSection({
  usersAdmin,
  usersBusy,
  usersQ,
  setUsersQ,
  stopImpersonate,
  selectedUserIds,
  toggleAllUsers,
  toggleUserSelection,
  changeRole,
  onRateHourlyBlur,
  onRatePerSessionBlur,
  sendReset,
  impersonate,
  toggleDisabled,
  onOpenPackages,
  onOpenAttendance,
}) {
  return (
    <section className="adm-admin-card">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="adm-admin-card__title">User Management</h2>
            <p className="adm-admin-card__subtitle">{usersAdmin.length} total users</p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <div className="adm-search-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M11.5 11.5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={usersQ}
              onChange={(e) => setUsersQ(e.target.value)}
            />
          </div>
          <button className="adm-btn-secondary" onClick={stopImpersonate}>
            Return to admin
          </button>
        </div>
      </div>

      <div className="adm-data-table adm-data-table--scrollable" data-lenis-prevent>
        {usersBusy ? (
          <div className="adm-table-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton skeleton--row" />
            ))}
          </div>
        ) : usersAdmin.length === 0 ? (
          <div className="adm-empty">No users found. Try changing the search or filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    className="adm-checkbox"
                    checked={selectedUserIds.size === usersAdmin.length && usersAdmin.length > 0}
                    onChange={toggleAllUsers}
                    title="Select all users"
                  />
                </th>
                <th>User</th>
                <th>Role</th>
                <th>Hourly Rate ($)</th>
                <th>Per Session ($)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersAdmin.map((u) => (
                <tr key={u.id} className={selectedUserIds.has(u.id) ? "adm-row--selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="adm-checkbox"
                      checked={selectedUserIds.has(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                    />
                  </td>
                  <td>
                    <div className="adm-user-cell">
                      <div className="adm-user-avatar">{u.name?.charAt(0) || u.email.charAt(0)}</div>
                      <div className="adm-user-info">
                        <div className="adm-user-name">{u.name || "—"}</div>
                        <div className="adm-user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="adm-role-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="learner">Learner</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>

                  <td>
                    {u.role === "teacher" || u.role === "admin" ? (
                      <input
                        type="number"
                        className="adm-form-input adm-rate-input"
                        defaultValue={
                          typeof u.rateHourlyCents === "number"
                            ? (u.rateHourlyCents / 100).toFixed(2)
                            : ""
                        }
                        placeholder="—"
                        min="0"
                        step="0.01"
                        onBlur={(e) => onRateHourlyBlur(u.id, e.target.value)}
                      />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {u.role === "teacher" || u.role === "admin" ? (
                      <input
                        type="number"
                        className="adm-form-input adm-rate-input"
                        defaultValue={
                          typeof u.ratePerSessionCents === "number"
                            ? (u.ratePerSessionCents / 100).toFixed(2)
                            : ""
                        }
                        placeholder="—"
                        min="0"
                        step="0.01"
                        onBlur={(e) => onRatePerSessionBlur(u.id, e.target.value)}
                      />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span
                      className={`adm-status-badge ${
                        u.isDisabled ? "adm-status-badge--inactive" : "adm-status-badge--active"
                      }`}
                    >
                      <span className="adm-status-badge__dot" />
                      {u.isDisabled ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="adm-action-buttons">
                      <button className="adm-btn-action" onClick={() => sendReset(u)} title="Reset Password">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M12 8C12 10.2091 10.2091 12 8 12C5.79086 12 4 10.2091 4 8C4 5.79086 5.79086 4 8 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8 1V4L10 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button className="adm-btn-action" onClick={() => impersonate(u)} title="View As">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                      <button
                        className={`adm-btn-action ${!u.isDisabled ? "adm-btn-action--danger" : ""}`}
                        onClick={() => toggleDisabled(u)}
                        title={u.isDisabled ? "Enable" : "Disable"}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 2L14 14M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button className="adm-btn-action" onClick={() => onOpenPackages(u)} title="View Packages">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 4H14V12H2V4ZM8 4V12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4 2L6 4H10L12 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button className="adm-btn-action" onClick={() => onOpenAttendance(u)} title="View Attendance">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <path
                            d="M5 7L7 9L11 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
