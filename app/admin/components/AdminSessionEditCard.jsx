"use client";

import TimePicker from "@/components/ui/TimePicker";

export default function AdminSessionEditCard({
  s,
  normType,
  cancelEdit,
  editForm,
  onEditChange,
  users,
  setEditForm,
  toast,
  addParticipant,
  removeParticipant,
  teachers,
  deleteSession,
  updateSession,
}) {
  return (
                <div className="adm-session-edit-card">
                  <div className="adm-session-edit-header">
                    <h3>
                      Edit Session #{s.id}
                      {normType(s.type) === "GROUP" && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: "0.75rem",
                            background: "rgba(99, 102, 241, 0.2)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          GROUP
                        </span>
                      )}
                    </h3>
                    <button className="adm-btn-close" onClick={cancelEdit}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M12 4L4 12M4 4L12 12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="adm-form-grid">
                    {/* ONE_ON_ONE: Show learner dropdown */}
                    {normType(editForm.type) === "ONE_ON_ONE" && (
                      <div className="adm-form-field">
                        <label className="adm-form-label">Learner</label>
                        <select
                          name="userId"
                          className="adm-form-input"
                          value={editForm.userId}
                          onChange={onEditChange}
                        >
                          <option value="">Select learner...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ? `${u.name} — ${u.email}` : u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* GROUP: Show capacity and participant management */}
                    {normType(editForm.type) === "GROUP" && (
                      <>
                        <div className="adm-form-field">
                          <label className="adm-form-label">Capacity</label>
                          <input
                            type="number"
                            name="capacity"
                            className="adm-form-input"
                            value={editForm.capacity}
                            onChange={onEditChange}
                            min="1"
                            placeholder="Max participants"
                          />
                        </div>
                        <div className="adm-form-field adm-form-field--full">
                          <label className="adm-form-label">
                            Current Participants ({editForm.learnerIds.length})
                          </label>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: "1 1 300px" }}>
                              <select
                                multiple
                                className="adm-form-input"
                                value={editForm.learnerIds}
                                onChange={(e) => {
                                  const ids = Array.from(
                                    e.target.selectedOptions
                                  ).map((o) => o.value);
                                  setEditForm((f) => ({
                                    ...f,
                                    learnerIds: ids,
                                  }));
                                }}
                                style={{ minHeight: 120, width: "100%" }}
                              >
                                {users.map((u) => (
                                  <option
                                    key={u.id}
                                    value={u.id}
                                    style={{
                                      background: editForm.learnerIds.includes(
                                        String(u.id)
                                      )
                                        ? "rgba(99, 102, 241, 0.2)"
                                        : "transparent",
                                    }}
                                  >
                                    {u.name
                                      ? `${u.name} — ${u.email}`
                                      : u.email}
                                    {editForm.learnerIds.includes(String(u.id))
                                      ? " ✓"
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div
                              style={{
                                flex: "0 0 180px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              <small style={{ opacity: 0.7 }}>
                                Select a learner and click:
                              </small>
                              <button
                                type="button"
                                className="adm-btn-secondary"
                                style={{ width: "100%", padding: "0.5rem" }}
                                onClick={async () => {
                                  // Find a learner that's selected in the list but NOT in current participants
                                  const listEl = document.querySelector(
                                    ".adm-session-edit-card select[multiple]"
                                  );
                                  const selectedInList = Array.from(
                                    listEl?.selectedOptions || []
                                  ).map((o) => o.value);
                                  const toAdd = selectedInList.find(
                                    (id) => !editForm.learnerIds.includes(id)
                                  );
                                  if (!toAdd) {
                                    toast.error(
                                      "Select a learner NOT already in the session"
                                    );
                                    return;
                                  }
                                  await addParticipant(s.id, toAdd);
                                }}
                              >
                                + Add Selected
                              </button>
                              <button
                                type="button"
                                className="adm-btn-danger"
                                style={{ width: "100%", padding: "0.5rem" }}
                                onClick={async () => {
                                  const listEl = document.querySelector(
                                    ".adm-session-edit-card select[multiple]"
                                  );
                                  const selectedInList = Array.from(
                                    listEl?.selectedOptions || []
                                  ).map((o) => o.value);
                                  const toRemove = selectedInList.find((id) =>
                                    editForm.learnerIds.includes(id)
                                  );
                                  if (!toRemove) {
                                    toast.error(
                                      "Select a participant to remove"
                                    );
                                    return;
                                  }
                                  await removeParticipant(s.id, toRemove);
                                }}
                              >
                                − Remove Selected
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {/* Teacher */}
                    <div className="adm-form-field">
                      <label className="adm-form-label">Teacher</label>
                      <select
                        name="teacherId"
                        className="adm-form-input"
                        value={editForm.teacherId}
                        onChange={onEditChange}
                      >
                        <option value="">Unassigned</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || t.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Title */}
                    <div className="adm-form-field adm-form-field--full">
                      <label className="adm-form-label">Title</label>
                      <input
                        name="title"
                        className="adm-form-input"
                        value={editForm.title}
                        onChange={onEditChange}
                      />
                    </div>
                    {/* Date & Time */}
                    <div className="adm-form-field">
                      <label className="adm-form-label">Date</label>
                      <input
                        type="date"
                        name="date"
                        className="adm-form-input"
                        value={editForm.date}
                        onChange={onEditChange}
                      />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">Start Time</label>
                      <TimePicker
                        name="startTime"
                        value={editForm.startTime}
                        onChange={onEditChange}
                      />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">End Time</label>
                      <TimePicker
                        name="endTime"
                        value={editForm.endTime}
                        onChange={onEditChange}
                      />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">Duration (min)</label>
                      <input
                        type="number"
                        name="duration"
                        className="adm-form-input"
                        value={editForm.duration}
                        onChange={onEditChange}
                        min="15"
                        step="15"
                        disabled={!!editForm.endTime}
                      />
                    </div>
                    {/* Meeting URL */}
                    <div className="adm-form-field adm-form-field--full">
                      <label className="adm-form-label">Meeting URL</label>
                      <input
                        name="meetingUrl"
                        className="adm-form-input"
                        value={editForm.meetingUrl}
                        onChange={onEditChange}
                      />
                    </div>
                  </div>
                  <div className="adm-session-edit-actions">
                    <button className="adm-btn-secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button
                      className="adm-btn-danger"
                      onClick={() => deleteSession(s.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="adm-btn-primary"
                      onClick={() => updateSession(s.id)}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
  );
}
