// web/src/pages/Admin.jsx
"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import "@/styles/admin.scss";
import useAuth from "@/hooks/useAuth";

function Admin() {
  const { user, checking } = useAuth();
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherIdFilter, setTeacherIdFilter] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    userId: "",
    teacherId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    duration: "60",
    meetingUrl: "",
    notes: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    userId: "",
    teacherId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    duration: "60",
    meetingUrl: "",
    notes: "",
  });

  const [usersAdmin, setUsersAdmin] = useState([]);
  const [usersQ, setUsersQ] = useState("");
  const [usersBusy, setUsersBusy] = useState(false);

  const toDateInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const toTimeInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const joinDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  };

  const diffMinutes = (start, end) => {
    if (!start || !end) return 0;
    let ms = end - start;
    if (ms < 0) ms += 24 * 60 * 60 * 1000;
    return Math.round(ms / 60000);
  };

  useEffect(() => {
    if (form.date && form.startTime && form.endTime) {
      const start = joinDateTime(form.date, form.startTime);
      const end = joinDateTime(form.date, form.endTime);
      const mins = diffMinutes(start, end);
      setForm((f) =>
        f.duration === String(mins) ? f : { ...f, duration: String(mins) }
      );
    }
  }, [form.date, form.startTime, form.endTime]);

  useEffect(() => {
    if (editingId && editForm.date && editForm.startTime && editForm.endTime) {
      const start = joinDateTime(editForm.date, editForm.startTime);
      const end = joinDateTime(editForm.date, editForm.endTime);
      const mins = diffMinutes(start, end);
      setEditForm((f) =>
        f.duration === String(mins) ? f : { ...f, duration: String(mins) }
      );
    }
  }, [editingId, editForm.date, editForm.startTime, editForm.endTime]);

  useEffect(() => {
    if (checking || !user) return;
    (async () => {
      try {
        const u = await api.get("/users?role=learner");
        setUsers(u.data || []);
      } catch (e) {
        setStatus(e.response?.data?.error || "Failed to load learners");
      }
    })();
  }, [checking, user]);

  useEffect(() => {
    if (checking || !user) return;
    (async () => {
      try {
        const { data } = await api.get("/teachers?active=1");
        setTeachers(data || []);
      } catch (e) {
        setStatus(e.response?.data?.error || "Failed to load teachers");
      }
    })();
  }, [checking, user]);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (qDebounced.trim()) p.set("q", qDebounced.trim());
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (teacherIdFilter) p.set("teacherId", String(teacherIdFilter));
    p.set("limit", "50");
    p.set("offset", "0");
    return p.toString();
  }, [qDebounced, from, to, teacherIdFilter]);

  const normalizeSessionsResponse = (data) => {
    if (Array.isArray(data)) return { items: data, total: data.length };
    return {
      items: data?.items || [],
      total:
        typeof data?.total === "number"
          ? data.total
          : data?.items
          ? data.items.length
          : 0,
    };
  };

  const reloadSessions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/sessions?${params}`);
      const { items, total } = normalizeSessionsResponse(data);
      setSessions(items);
      setTotal(total);
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadSessions();
  }, [params]);

  const onCreateChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const createSession = async (e) => {
    e.preventDefault();
    setStatus("Saving…");
    try {
      // Build ISO datetimes the API expects
      const startAt = joinDateTime(form.date, form.startTime);
      const endAt = form.endTime ? joinDateTime(form.date, form.endTime) : null;

      const payload = {
        userId: Number(form.userId),
        // If you want teacher required, keep as Number; otherwise only include when selected
        ...(form.teacherId ? { teacherId: Number(form.teacherId) } : {}),
        title: form.title.trim() || "Lesson",
        startAt: startAt.toISOString(),
        ...(endAt
          ? { endAt: endAt.toISOString() }
          : { durationMin: Number(form.duration || 60) }),
        meetingUrl: form.meetingUrl || null,
        notes: form.notes || null,
      };

      await api.post("/admin/sessions", payload); // << correct admin endpoint
      setStatus("Created ✓");
      await reloadSessions();
      setForm((f) => ({
        ...f,
        teacherId: "",
        title: "",
        startTime: "",
        endTime: "",
        duration: "60",
        meetingUrl: "",
        notes: "",
      }));
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to create session");
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      userId: String(row.user?.id || ""),
      teacherId: String(row.teacher?.id || ""),
      title: row.title || "",
      date: toDateInput(row.startAt),
      startTime: toTimeInput(row.startAt),
      endTime: row.endAt ? toTimeInput(row.endAt) : "",
      duration: row.endAt ? "" : "60",
      meetingUrl: row.meetingUrl || "",
      notes: row.notes || "",
    });
  };

  const cancelEdit = () => setEditingId(null);

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const updateSession = async (id) => {
    setStatus("Updating…");
    try {
      const startAt =
        editForm.date && editForm.startTime
          ? joinDateTime(editForm.date, editForm.startTime)
          : null;
      const endAt =
        editForm.date && editForm.endTime
          ? joinDateTime(editForm.date, editForm.endTime)
          : null;

      const payload = {
        title: editForm.title.trim(),
        ...(startAt ? { startAt: startAt.toISOString() } : {}),
        ...(endAt !== null
          ? { endAt: endAt ? endAt.toISOString() : null }
          : {}),
        meetingUrl: editForm.meetingUrl || null,
        notes: editForm.notes || null,
        ...(editForm.userId ? { userId: Number(editForm.userId) } : {}),
        // If blank should mean "unassigned", omit the key or send 0 based on your backend choice
        ...(editForm.teacherId
          ? { teacherId: Number(editForm.teacherId) }
          : {}),
      };

      await api.patch(`/admin/sessions/${id}`, payload); // << correct admin endpoint
      setStatus("Updated ✓");
      setEditingId(null);
      await reloadSessions();
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to update session");
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this session?")) return;
    setStatus("Deleting…");
    try {
      await api.delete(`/admin/sessions/${id}`); // << correct admin endpoint
      setStatus("Deleted ✓");
      setSessions((rows) => rows.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to delete session");
    }
  };

  async function loadUsersAdmin() {
    setUsersBusy(true);
    try {
      const { data } = await api.get(
        `/admin/users?q=${encodeURIComponent(usersQ)}`
      );
      setUsersAdmin(data || []);
    } finally {
      setUsersBusy(false);
    }
  }

  useEffect(() => {
    loadUsersAdmin();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadUsersAdmin, 300);
    return () => clearTimeout(t);
  }, [usersQ]);

  async function changeRole(u, role) {
    try {
      await api.patch(`/admin/users/${u.id}`, { role });
      setStatus("Role updated ✓");
      loadUsersAdmin();
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to update role");
    }
  }

  async function toggleDisabled(u) {
    try {
      await api.patch(`/admin/users/${u.id}`, { isDisabled: !u.isDisabled });
      setStatus(!u.isDisabled ? "User disabled" : "User enabled");
      loadUsersAdmin();
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to change status");
    }
  }

  async function sendReset(u) {
    try {
      await api.post(`/admin/users/${u.id}/reset-password`);
      setStatus("Reset email sent ✓");
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to send reset");
    }
  }

  async function impersonate(u) {
    try {
      await api.post(`/admin/impersonate/${u.id}`);
      setStatus(`Viewing as ${u.email}`);
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to impersonate");
    }
  }

  async function stopImpersonate() {
    try {
      await api.post(`/admin/impersonate/stop`);
      setStatus("Back to admin");
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to stop impersonation");
    }
  }

  return (
    <div className="admin-modern">
      <div className="admin-header">
        <div className="admin-header__content">
          <h1 className="admin-title">
            Admin Dashboard
            <span className="admin-subtitle">
              Manage users, sessions, and monitor teacher workload
            </span>
          </h1>
        </div>
        {status && (
          <div className="status-toast">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M7 10L9 12L13 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {status}
          </div>
        )}
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <div className="admin-card__title-group">
            <div className="admin-card__icon admin-card__icon--primary">
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
              <h2 className="admin-card__title">User Management</h2>
              <p className="admin-card__subtitle">
                {usersAdmin.length} total users
              </p>
            </div>
          </div>
          <div className="admin-card__actions">
            <div className="search-box">
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
            <button className="btn-icon-modern" onClick={loadUsersAdmin}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M1 9H17M9 1V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button className="btn-secondary" onClick={stopImpersonate}>
              Return to admin
            </button>
          </div>
        </div>

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersAdmin.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {u.name?.charAt(0) || u.email.charAt(0)}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{u.name || "—"}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="learner">Learner</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        u.isDisabled
                          ? "status-badge--inactive"
                          : "status-badge--active"
                      }`}
                    >
                      <span className="status-badge__dot" />
                      {u.isDisabled ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action"
                        onClick={() => sendReset(u)}
                        title="Reset Password"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
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
                      <button
                        className="btn-action"
                        onClick={() => impersonate(u)}
                        title="View As"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </button>
                      <button
                        className={`btn-action ${
                          !u.isDisabled ? "btn-action--danger" : ""
                        }`}
                        onClick={() => toggleDisabled(u)}
                        title={u.isDisabled ? "Enable" : "Disable"}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M2 2L14 14M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div className="admin-card__title-group">
            <div className="admin-card__icon admin-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="admin-card__title">Create New Session</h2>
              <p className="admin-card__subtitle">
                Schedule a session for a learner
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={createSession} className="modern-form">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                Learner<span className="form-required">*</span>
              </label>
              <select
                name="userId"
                className="form-input"
                value={form.userId}
                onChange={onCreateChange}
                required
              >
                <option value="">Select learner...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} — ${u.email}` : u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Teacher</label>
              <select
                name="teacherId"
                className="form-input"
                value={form.teacherId}
                onChange={onCreateChange}
              >
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ? `${t.name} — ${t.email}` : t.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field form-field--full">
              <label className="form-label">
                Session Title<span className="form-required">*</span>
              </label>
              <input
                name="title"
                className="form-input"
                value={form.title}
                onChange={onCreateChange}
                placeholder="e.g., React Advanced Patterns"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                Date<span className="form-required">*</span>
              </label>
              <input
                type="date"
                name="date"
                className="form-input"
                value={form.date}
                onChange={onCreateChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                Start Time<span className="form-required">*</span>
              </label>
              <input
                type="time"
                name="startTime"
                className="form-input"
                value={form.startTime}
                onChange={onCreateChange}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">End Time</label>
              <input
                type="time"
                name="endTime"
                className="form-input"
                value={form.endTime}
                onChange={onCreateChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                className="form-input"
                value={form.duration}
                onChange={onCreateChange}
                min="15"
                step="15"
                disabled={!!form.endTime}
              />
            </div>

            <div className="form-field form-field--full">
              <label className="form-label">Meeting URL</label>
              <input
                name="meetingUrl"
                className="form-input"
                value={form.meetingUrl}
                onChange={onCreateChange}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="form-field form-field--full">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                className="form-textarea"
                value={form.notes}
                onChange={onCreateChange}
                rows={3}
                placeholder="Additional notes for this session..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create Session
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  title: "",
                  startTime: "",
                  endTime: "",
                  duration: "60",
                  meetingUrl: "",
                  notes: "",
                }))
              }
            >
              Clear Form
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div className="admin-card__title-group">
            <div className="admin-card__icon admin-card__icon--accent">
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
              </svg>
            </div>
            <div>
              <h2 className="admin-card__title">All Sessions</h2>
              <p className="admin-card__subtitle">
                {loading
                  ? "Loading..."
                  : `${sessions.length} of ${total} sessions`}
              </p>
            </div>
          </div>
          <div className="admin-card__actions">
            <div className="search-box">
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
                placeholder="Search sessions..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={teacherIdFilter}
              onChange={(e) => setTeacherIdFilter(e.target.value)}
            >
              <option value="">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="sessions-grid">
          {sessions.map((s) =>
            editingId === s.id ? (
              <div key={s.id} className="session-edit-card">
                <div className="session-edit-header">
                  <h3>Edit Session #{s.id}</h3>
                  <button className="btn-close" onClick={cancelEdit}>
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
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Learner</label>
                    <select
                      name="userId"
                      className="form-input"
                      value={editForm.userId}
                      onChange={onEditChange}
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ? `${u.name} — ${u.email}` : u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Teacher</label>
                    <select
                      name="teacherId"
                      className="form-input"
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
                  <div className="form-field form-field--full">
                    <label className="form-label">Title</label>
                    <input
                      name="title"
                      className="form-input"
                      value={editForm.title}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="date"
                      className="form-input"
                      value={editForm.date}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      className="form-input"
                      value={editForm.startTime}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      className="form-input"
                      value={editForm.endTime}
                      onChange={onEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Duration (minutes)</label>
                    <input
                      type="number"
                      name="duration"
                      className="form-input"
                      value={editForm.duration}
                      onChange={onEditChange}
                      min="15"
                      step="15"
                      disabled={!!editForm.endTime}
                    />
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label">Meeting URL</label>
                    <input
                      name="meetingUrl"
                      className="form-input"
                      value={editForm.meetingUrl}
                      onChange={onEditChange}
                    />
                  </div>
                </div>
                <div className="session-edit-actions">
                  <button className="btn-secondary" onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => deleteSession(s.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => updateSession(s.id)}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="session-card-modern">
                <div className="session-card-modern__header">
                  <div className="session-card-modern__badge">
                    Session #{s.id}
                  </div>
                  <div className="action-buttons">
                    <button
                      className="btn-action"
                      onClick={() => startEdit(s)}
                      title="Edit"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      className="btn-action btn-action--danger"
                      onClick={() => deleteSession(s.id)}
                      title="Delete"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2 4H14M6 7V11M10 7V11M3 4L4 13C4 13.5304 4.21071 14.0391 4.58579 14.4142C4.96086 14.7893 5.46957 15 6 15H10C10.5304 15 11.0391 14.7893 11.4142 14.4142C11.7893 14.0391 12 13.5304 12 13L13 4M5 4V2C5 1.73478 5.10536 1.48043 5.29289 1.29289C5.48043 1.10536 5.73478 1 6 1H10C10.2652 1 10.5196 1.10536 10.7071 1.29289C10.8946 1.48043 11 1.73478 11 2V4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="session-card-modern__title">{s.title}</h3>
                <div className="session-card-modern__info">
                  <div className="info-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 4V8H11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>{fmt(s.startAt)}</span>
                  </div>
                  <div className="info-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="8"
                        cy="5"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M2 13C2 11 5 9 8 9C11 9 14 11 14 13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>{s.user?.name || s.user?.email}</span>
                  </div>
                  {s.teacher && (
                    <div className="info-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 1L14 4L8 7L2 4L8 1Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12L8 15L14 12M2 8L8 11L14 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{s.teacher?.name || s.teacher?.email}</span>
                    </div>
                  )}
                  {s.meetingUrl && (
                    <a
                      href={s.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="meeting-link"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M10 6L14 3.5V12.5L10 10M2 4C2 3.44772 2.44772 3 3 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H3C2.44772 13 2 12.5523 2 12V4Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div className="admin-card__title-group">
            <div className="admin-card__icon admin-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <h2 className="admin-card__title">Teacher Workload</h2>
              <p className="admin-card__subtitle">Monitor hours and payroll</p>
            </div>
          </div>
          <div className="admin-card__actions">
            <select
              className="filter-select"
              value={teacherIdFilter}
              onChange={(e) => setTeacherIdFilter(e.target.value)}
            >
              <option value="">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <TeacherWorkload teacherId={teacherIdFilter} from={from} to={to} />
      </section>
    </div>
  );
}

function TeacherWorkload({ teacherId, from, to }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const p = new URLSearchParams();
        if (teacherId) p.set("teacherId", String(teacherId));
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const { data } = await api.get(
          `/admin/teachers/workload?${p.toString()}`
        );
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load workload data", e);
        setRows([]);
      } finally {
        setBusy(false);
      }
    })();
  }, [teacherId, from, to]);

  if (busy) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--admin-text-secondary)",
        }}
      >
        Loading workload data...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--admin-text-secondary)",
        }}
      >
        No workload data available
      </div>
    );
  }

  return (
    <div className="workload-grid">
      {rows.map((w) => (
        <div key={w.teacher.id} className="workload-card">
          <div className="workload-card__header">
            <div className="user-avatar user-avatar--large">
              {w.teacher.name?.charAt(0) || w.teacher.email.charAt(0)}
            </div>
            <div className="workload-card__info">
              <h3>{w.teacher.name || w.teacher.email}</h3>
              <p>{w.teacher.email}</p>
            </div>
          </div>
          <div className="workload-stats">
            <div className="workload-stat">
              <div className="workload-stat__label">Sessions</div>
              <div className="workload-stat__value">{w.sessions}</div>
            </div>
            <div className="workload-stat">
              <div className="workload-stat__label">Hours</div>
              <div className="workload-stat__value">{w.hours}</div>
            </div>
            <div className="workload-stat">
              <div className="workload-stat__label">Rate/Hour</div>
              <div className="workload-stat__value">
                ${(w.rateHourlyCents / 100).toFixed(2)}
              </div>
            </div>
            <div className="workload-stat workload-stat--highlight">
              <div className="workload-stat__label">Total Payroll</div>
              <div className="workload-stat__value">
                ${w.payrollAppliedUSD.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="workload-method">
            <span className="badge-method">{w.method}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Admin;
