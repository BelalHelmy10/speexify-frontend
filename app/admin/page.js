// app/admin/page.js
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { clearCsrfToken } from "@/lib/api";
import "@/styles/admin.scss";
import useAuth from "@/hooks/useAuth";
import { useToast, useConfirm } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
function Admin() {
  const { toast } = useToast();
  const { confirmModal } = useConfirm();
  const { user, checking } = useAuth();
  const isAdmin = user?.role === "admin";
  const router = useRouter();
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
  // ─────────────────────────────────────────────
  // CREATE FORM STATE
  // ─────────────────────────────────────────────
  const [form, setForm] = useState({
    type: "ONE_ON_ONE",
    userId: "",
    learnerIds: [], // For GROUP sessions
    capacity: "",
    teacherId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    duration: "60",
    meetingUrl: "",
    notes: "",
  });
  // ─────────────────────────────────────────────
  // EDIT FORM STATE
  // ─────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "ONE_ON_ONE",
    userId: "",
    learnerIds: [],
    capacity: "",
    teacherId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    duration: "60",
    meetingUrl: "",
    notes: "",
  });
  // ─────────────────────────────────────────────
  // USER MANAGEMENT STATE
  // ─────────────────────────────────────────────
  const [usersAdmin, setUsersAdmin] = useState([]);
  const [usersQ, setUsersQ] = useState("");
  const [usersBusy, setUsersBusy] = useState(false);
  // ─────────────────────────────────────────────
  // PACKAGES MODAL STATE
  // ─────────────────────────────────────────────
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const modalRef = useRef(null);
  // ─────────────────────────────────────────────
  // ATTENDANCE MODAL STATE
  // ─────────────────────────────────────────────
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceUser, setAttendanceUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const attendanceModalRef = useRef(null);
  // ─────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────
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
  const normType = (v) => String(v || "ONE_ON_ONE").toUpperCase();
  // ─────────────────────────────────────────────
  // PARTICIPANT MANAGEMENT (for editing GROUP sessions)
  // ─────────────────────────────────────────────
  const refreshEditingFromServer = async (sessionId) => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}`, {
        params: { t: Date.now() },
      });
      const sess = data?.session;
      if (!sess) return;
      const type = normType(sess.type);
      const list = Array.isArray(sess.participants) ? sess.participants : [];
      const learners = Array.isArray(sess.learners) ? sess.learners : [];
      // Use learners array if available, otherwise extract from participants
      const activeIds =
        learners.length > 0
          ? learners
              .filter((l) => l.status !== "canceled")
              .map((l) => String(l.id))
          : list
              .filter((p) => p.status !== "canceled")
              .map((p) => String(p.userId || p.user?.id))
              .filter(Boolean);
      setEditForm((f) => ({
        ...f,
        type,
        capacity:
          typeof sess.capacity === "number" ? String(sess.capacity) : "",
        learnerIds: type === "GROUP" ? activeIds : [],
        userId:
          type === "ONE_ON_ONE"
            ? String(sess.userId || sess.user?.id || "")
            : "",
      }));
    } catch (err) {
      console.error("Failed to refresh session:", err);
    }
  };
  const addParticipant = async (sessionId, userId) => {
    if (!userId || !sessionId) return;
    try {
      await api.post(`/admin/sessions/${sessionId}/participants`, {
        userId: Number(userId),
      });
      toast.success("Participant added");
      await refreshEditingFromServer(sessionId);
      await reloadSessions();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to add participant");
    }
  };
  const removeParticipant = async (sessionId, userId) => {
    if (!userId || !sessionId) return;
    const ok = await confirmModal("Remove this participant from the session?");
    if (!ok) return;
    try {
      await api.delete(`/admin/sessions/${sessionId}/participants/${userId}`);
      toast.success("Participant removed");
      await refreshEditingFromServer(sessionId);
      await reloadSessions();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to remove participant");
    }
  };
  // ─────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────
  // Load learners
  useEffect(() => {
    if (checking || !isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get("/users?role=learner");
        setUsers(data || []);
      } catch (e) {
        setStatus(e.response?.data?.error || "Failed to load learners");
      }
    })();
  }, [checking, isAdmin]);
  // Load teachers
  useEffect(() => {
    if (checking || !isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get("/teachers?active=1");
        setTeachers(data || []);
      } catch (e) {
        setStatus(e.response?.data?.error || "Failed to load teachers");
      }
    })();
  }, [checking, isAdmin]);
  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  // Build query params
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
        typeof data?.total === "number" ? data.total : data?.items?.length || 0,
    };
  };
  const reloadSessions = async () => {
    if (!isAdmin) {
      setSessions([]);
      setTotal(0);
      setLoading(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  // Auto-calculate duration for create form
  useEffect(() => {
    if (form.date && form.startTime && form.endTime) {
      const start = joinDateTime(form.date, form.startTime);
      const end = joinDateTime(form.date, form.endTime);
      const mins = diffMinutes(start, end);
      if (mins > 0) {
        setForm((f) =>
          f.duration === String(mins) ? f : { ...f, duration: String(mins) }
        );
      }
    }
  }, [form.date, form.startTime, form.endTime]);
  // Auto-calculate duration for edit form
  useEffect(() => {
    if (editingId && editForm.date && editForm.startTime && editForm.endTime) {
      const start = joinDateTime(editForm.date, editForm.startTime);
      const end = joinDateTime(editForm.date, editForm.endTime);
      const mins = diffMinutes(start, end);
      if (mins > 0) {
        setEditForm((f) =>
          f.duration === String(mins) ? f : { ...f, duration: String(mins) }
        );
      }
    }
  }, [editingId, editForm.date, editForm.startTime, editForm.endTime]);
  // ─────────────────────────────────────────────
  // CREATE FORM HANDLERS
  // ─────────────────────────────────────────────
  const onCreateChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") {
      const t = normType(value);
      setForm((f) => ({
        ...f,
        type: t,
        userId: t === "ONE_ON_ONE" ? f.userId : "",
        learnerIds: t === "GROUP" ? f.learnerIds : [],
        capacity: t === "GROUP" ? f.capacity : "",
      }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };
  const onCreateLearnersChange = (e) => {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm((f) => ({ ...f, learnerIds: ids }));
  };
  const createSession = async (e) => {
    e.preventDefault();
    const startAt = joinDateTime(form.date, form.startTime);
    if (!startAt) {
      toast.error("Please select a valid date and time");
      return;
    }
    // Warn if session is in the past
    if (startAt < new Date()) {
      const proceed = await confirmModal(
        "⚠️ This session is scheduled in the past. Are you sure you want to create it?"
      );
      if (!proceed) return;
    }
    const type = normType(form.type);
    // Validation
    if (type === "ONE_ON_ONE" && !form.userId) {
      toast.error("Please select a learner for the 1:1 session");
      return;
    }
    if (
      type === "GROUP" &&
      (!form.learnerIds || form.learnerIds.length === 0)
    ) {
      toast.error("Please select at least one learner for the group session");
      return;
    }
    setStatus("Saving…");
    try {
      const endAt = form.endTime ? joinDateTime(form.date, form.endTime) : null;
      const payload = {
        type,
        title:
          form.title.trim() || (type === "GROUP" ? "Group Session" : "Lesson"),
        startAt: startAt.toISOString(),
        ...(form.teacherId ? { teacherId: Number(form.teacherId) } : {}),
        ...(endAt
          ? { endAt: endAt.toISOString() }
          : { durationMin: Number(form.duration || 60) }),
        joinUrl: form.meetingUrl || null,
        notes: form.notes || null,
      };
      if (type === "GROUP") {
        payload.learnerIds = form.learnerIds
          .map((x) => Number(x))
          .filter((n) => n > 0);
        payload.capacity = form.capacity ? Number(form.capacity) : null;
      } else {
        payload.learnerId = Number(form.userId);
      }
      const { data } = await api.post("/admin/sessions", payload);
      trackEvent("session_booked", {
        source: "admin",
        sessionId: data?.session?.id || data?.id,
        type,
        learnerId: type === "ONE_ON_ONE" ? payload.learnerId : null,
        learnerCount: type === "GROUP" ? payload.learnerIds?.length : 1,
        teacherId: payload.teacherId || null,
      });
      toast.success(
        `${
          type === "GROUP" ? "Group session" : "Session"
        } created successfully!`
      );
      setStatus("");
      await reloadSessions();
      // Reset form but keep date for convenience
      setForm((f) => ({
        ...f,
        type: "ONE_ON_ONE",
        userId: "",
        learnerIds: [],
        capacity: "",
        teacherId: "",
        title: "",
        startTime: "",
        endTime: "",
        duration: "60",
        meetingUrl: "",
        notes: "",
      }));
    } catch (e) {
      setStatus("");
      if (e.response?.status === 409) {
        toast.error(
          "Time conflict: A session already exists at this time for this learner or teacher"
        );
      } else if (e.response?.status === 422) {
        const msg =
          e.response?.data?.message || "Learner has no remaining credits";
        const userId = e.response?.data?.learnerId || e.response?.data?.userId;
        const learner = users.find((u) => u.id === userId);
        toast.error(learner ? `${learner.name || learner.email}: ${msg}` : msg);
      } else {
        toast.error(e.response?.data?.error || "Failed to create session");
      }
    }
  };
  // ─────────────────────────────────────────────
  // EDIT FORM HANDLERS
  // ─────────────────────────────────────────────
  const startEdit = (row) => {
    const type = normType(row.type);
    const learners = Array.isArray(row.learners) ? row.learners : [];
    const participants = Array.isArray(row.participants)
      ? row.participants
      : [];
    // Extract learner IDs from either learners array or participants
    const learnerIds =
      learners.length > 0
        ? learners
            .filter((l) => l.status !== "canceled")
            .map((l) => String(l.id))
        : participants
            .filter((p) => p.status !== "canceled")
            .map((p) => String(p.userId || p.user?.id))
            .filter(Boolean);
    setEditingId(row.id);
    setEditForm({
      type,
      userId: String(row.user?.id || row.userId || ""),
      learnerIds: type === "GROUP" ? learnerIds : [],
      capacity: typeof row.capacity === "number" ? String(row.capacity) : "",
      teacherId: String(row.teacher?.id || row.teacherId || ""),
      title: row.title || "",
      date: toDateInput(row.startAt),
      startTime: toTimeInput(row.startAt),
      endTime: row.endAt ? toTimeInput(row.endAt) : "",
      duration: row.endAt ? "" : "60",
      meetingUrl: row.meetingUrl || row.joinUrl || "",
      notes: row.notes || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      type: "ONE_ON_ONE",
      userId: "",
      learnerIds: [],
      capacity: "",
      teacherId: "",
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      duration: "60",
      meetingUrl: "",
      notes: "",
    });
  };
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
      const type = normType(editForm.type);
      const payload = {
        title: editForm.title.trim(),
        ...(startAt ? { startAt: startAt.toISOString() } : {}),
        ...(endAt !== null
          ? { endAt: endAt ? endAt.toISOString() : null }
          : {}),
        joinUrl: editForm.meetingUrl || null,
        notes: editForm.notes || null,
        ...(editForm.teacherId
          ? { teacherId: Number(editForm.teacherId) }
          : { teacherId: null }),
      };
      // Only include type-specific fields
      if (type === "GROUP") {
        payload.capacity = editForm.capacity ? Number(editForm.capacity) : null;
      } else if (editForm.userId) {
        payload.userId = Number(editForm.userId);
      }
      await api.patch(`/admin/sessions/${id}`, payload);
      toast.success("Session updated");
      setStatus("");
      setEditingId(null);
      await reloadSessions();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update session");
      setStatus("");
    }
  };
  const deleteSession = async (id) => {
    const ok = await confirmModal(
      "Delete this session? This cannot be undone."
    );
    if (!ok) return;
    setStatus("Deleting…");
    try {
      await api.delete(`/admin/sessions/${id}`);
      toast.success("Session deleted");
      setStatus("");
      setSessions((rows) => rows.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      if (editingId === id) cancelEdit();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete session");
      setStatus("");
    }
  };
  // ─────────────────────────────────────────────
  // USER MANAGEMENT
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // PACKAGES HANDLERS
  // ─────────────────────────────────────────────
  async function loadPackages(userId) {
    setPackagesLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/packages`);
      setPackages(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load packages");
      setPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  }
  // ─────────────────────────────────────────────
  // ATTENDANCE HANDLERS
  // ─────────────────────────────────────────────
  async function loadAttendance(userId) {
    setAttendanceLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/attendance`);
      setAttendanceData(data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load attendance");
      setAttendanceData(null);
    } finally {
      setAttendanceLoading(false);
    }
  }
  async function loadUsersAdmin() {
    if (!isAdmin) {
      setUsersAdmin([]);
      setUsersBusy(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(loadUsersAdmin, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersQ]);
  async function changeRole(u, role) {
    try {
      await api.patch(`/admin/users/${u.id}`, { role });
      toast.success("Role updated");
      loadUsersAdmin();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update role");
    }
  }
  async function toggleDisabled(u) {
    try {
      await api.patch(`/admin/users/${u.id}`, { isDisabled: !u.isDisabled });
      toast.success(!u.isDisabled ? "User disabled" : "User enabled");
      loadUsersAdmin();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to change status");
    }
  }
  async function sendReset(u) {
    try {
      await api.post(`/admin/users/${u.id}/reset-password`);
      toast.success("Reset email sent");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send reset");
    }
  }
  async function impersonate(u) {
    try {
      await api.post(`/admin/impersonate/${u.id}`);
      clearCsrfToken();
      toast.success(`Now viewing as ${u.name || u.email}`);

      // IMPORTANT: Use window.location.href for FULL page navigation
      // This forces useAuth to re-fetch from /auth/me with the new session
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to impersonate");
    }
  }
  async function stopImpersonate() {
    try {
      await api.post(`/admin/impersonate/stop`);
      clearCsrfToken();
      toast.success("Stopped viewing as user");
      // Return to admin page and refresh to get admin session back
      router.push("/admin");
      setTimeout(() => window.location.reload(), 100);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to stop impersonation");
    }
  }
  // Close modal on click outside - Packages
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowPackagesModal(false);
      }
    }
    if (showPackagesModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPackagesModal]);
  // Close modal on click outside - Attendance
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        attendanceModalRef.current &&
        !attendanceModalRef.current.contains(event.target)
      ) {
        setShowAttendanceModal(false);
      }
    }
    if (showAttendanceModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttendanceModal]);
  // ─────────────────────────────────────────────
  // ACCESS CONTROL
  // ─────────────────────────────────────────────
  if (checking) {
    return (
      <div className="adm-admin-modern adm-admin-loading">
        Checking your permissions…
      </div>
    );
  }
  if (!isAdmin) {
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
              If you think this is a mistake, please contact the site
              administrator.
            </p>
            <Link href="/dashboard" className="adm-btn-primary">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────
  // Get learner display for a session
  // ─────────────────────────────────────────────
  const getSessionLearnerDisplay = (s) => {
    const type = normType(s.type);
    if (type === "GROUP") {
      const learners = s.learners || [];
      const count =
        s.participantCount ??
        learners.filter((l) => l.status !== "canceled").length;
      const cap = s.capacity;
      if (learners.length === 0) {
        return `${count} participant${count !== 1 ? "s" : ""}${
          cap ? ` / ${cap}` : ""
        }`;
      }
      const names = learners
        .filter((l) => l.status !== "canceled")
        .slice(0, 2)
        .map((l) => l.name || l.email?.split("@")[0] || "Learner")
        .join(", ");
      const extra = count > 2 ? ` +${count - 2} more` : "";
      return `${names}${extra}${cap ? ` (${count}/${cap})` : ` (${count})`}`;
    }
    // ONE_ON_ONE
    return s.user?.name || s.user?.email || "No learner";
  };
  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="adm-admin-modern">
      <div className="adm-admin-header">
        <div className="adm-admin-header__content">
          <h1 className="adm-admin-title">
            Admin Dashboard
            <span className="adm-admin-subtitle">
              Manage users, sessions, and monitor teacher workload
            </span>
          </h1>
        </div>

        {/* ✅ NEW: Admin Support Inbox shortcut */}
        <div className="adm-admin-header__actions">
          <Link href="/admin/support" className="adm-btn-primary">
            🛟 Support Inbox
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          USER MANAGEMENT
          ═══════════════════════════════════════════════════════════════════ */}
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
              <p className="adm-admin-card__subtitle">
                {usersAdmin.length} total users
              </p>
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
        <div className="adm-data-table">
          {usersBusy ? (
            <div className="adm-table-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton skeleton--row" />
              ))}
            </div>
          ) : usersAdmin.length === 0 ? (
            <div className="adm-empty">
              No users found. Try changing the search or filters.
            </div>
          ) : (
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
                      <div className="adm-user-cell">
                        <div className="adm-user-avatar">
                          {u.name?.charAt(0) || u.email.charAt(0)}
                        </div>
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
                      <span
                        className={`adm-status-badge ${
                          u.isDisabled
                            ? "adm-status-badge--inactive"
                            : "adm-status-badge--active"
                        }`}
                      >
                        <span className="adm-status-badge__dot" />
                        {u.isDisabled ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="adm-action-buttons">
                        <button
                          className="adm-btn-action"
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
                          className="adm-btn-action"
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
                          className={`adm-btn-action ${
                            !u.isDisabled ? "adm-btn-action--danger" : ""
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
                        <button
                          className="adm-btn-action"
                          onClick={() => {
                            setSelectedUser(u);
                            loadPackages(u.id);
                            setShowPackagesModal(true);
                          }}
                          title="View Packages"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
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
                        {/* ✅ NEW: View Attendance Button */}
                        <button
                          className="adm-btn-action"
                          onClick={() => {
                            setAttendanceUser(u);
                            loadAttendance(u.id);
                            setShowAttendanceModal(true);
                          }}
                          title="View Attendance"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <rect
                              x="2"
                              y="3"
                              width="12"
                              height="10"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
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
      {/* ═══════════════════════════════════════════════════════════════════
          CREATE SESSION
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__icon adm-admin-card__icon--success">
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
              <h2 className="adm-admin-card__title">Create New Session</h2>
              <p className="adm-admin-card__subtitle">
                {normType(form.type) === "GROUP"
                  ? "Schedule a group session with multiple learners"
                  : "Schedule a 1:1 session for a learner"}
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={createSession} className="adm-modern-form">
          <div className="adm-form-grid">
            {/* Session Type */}
            <div className="adm-form-field">
              <label className="adm-form-label">Session Type</label>
              <select
                name="type"
                className="adm-form-input"
                value={form.type}
                onChange={onCreateChange}
              >
                <option value="ONE_ON_ONE">👤 One-on-One (1:1)</option>
                <option value="GROUP">👥 Group Session</option>
              </select>
            </div>
            {/* Teacher (same for both types) */}
            <div className="adm-form-field">
              <label className="adm-form-label">Teacher</label>
              <select
                name="teacherId"
                className="adm-form-input"
                value={form.teacherId}
                onChange={onCreateChange}
              >
                <option value="">Select teacher (optional)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.email}
                  </option>
                ))}
              </select>
            </div>
            {/* ONE_ON_ONE: Single learner */}
            {normType(form.type) === "ONE_ON_ONE" && (
              <div className="adm-form-field">
                <label className="adm-form-label">
                  Learner<span className="adm-form-required">*</span>
                </label>
                <select
                  name="userId"
                  className="adm-form-input"
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
            )}
            {/* GROUP: Multiple learners + capacity */}
            {normType(form.type) === "GROUP" && (
              <>
                <div className="adm-form-field">
                  <label className="adm-form-label">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    className="adm-form-input"
                    value={form.capacity}
                    onChange={onCreateChange}
                    min="1"
                    max="100"
                    placeholder="Max participants (optional)"
                  />
                </div>
                <div className="adm-form-field adm-form-field--full">
                  <label className="adm-form-label">
                    Participants<span className="adm-form-required">*</span>
                    <span
                      style={{ fontWeight: 400, marginLeft: 8, opacity: 0.7 }}
                    >
                      ({form.learnerIds.length} selected)
                    </span>
                  </label>
                  <select
                    multiple
                    className="adm-form-input"
                    value={form.learnerIds}
                    onChange={onCreateLearnersChange}
                    required
                    style={{ minHeight: 160 }}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} — ${u.email}` : u.email}
                      </option>
                    ))}
                  </select>
                  <small
                    style={{ opacity: 0.6, marginTop: 4, display: "block" }}
                  >
                    Hold Ctrl/Cmd to select multiple learners
                  </small>
                </div>
              </>
            )}
            {/* Title */}
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">
                Session Title<span className="adm-form-required">*</span>
              </label>
              <input
                name="title"
                className="adm-form-input"
                value={form.title}
                onChange={onCreateChange}
                placeholder={
                  normType(form.type) === "GROUP"
                    ? "e.g., Speaking Practice Group"
                    : "e.g., Grammar Review"
                }
                required
              />
            </div>
            {/* Date & Time */}
            <div className="adm-form-field">
              <label className="adm-form-label">
                Date<span className="adm-form-required">*</span>
              </label>
              <input
                type="date"
                name="date"
                className="adm-form-input"
                value={form.date}
                onChange={onCreateChange}
                required
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">
                Start Time<span className="adm-form-required">*</span>
              </label>
              <input
                type="time"
                name="startTime"
                className="adm-form-input"
                value={form.startTime}
                onChange={onCreateChange}
                required
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">End Time</label>
              <input
                type="time"
                name="endTime"
                className="adm-form-input"
                value={form.endTime}
                onChange={onCreateChange}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                className="adm-form-input"
                value={form.duration}
                onChange={onCreateChange}
                min="15"
                step="15"
                disabled={!!form.endTime}
              />
            </div>
            {/* Meeting URL */}
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Meeting URL</label>
              <input
                name="meetingUrl"
                className="adm-form-input"
                value={form.meetingUrl}
                onChange={onCreateChange}
                placeholder="https://meet.google.com/... (leave empty for built-in classroom)"
              />
            </div>
            {/* Notes */}
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Notes</label>
              <textarea
                name="notes"
                className="adm-form-textarea"
                value={form.notes}
                onChange={onCreateChange}
                rows={3}
                placeholder="Additional notes for this session..."
              />
            </div>
          </div>
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create {normType(form.type) === "GROUP" ? "Group " : ""}Session
            </button>
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  type: "ONE_ON_ONE",
                  userId: "",
                  learnerIds: [],
                  capacity: "",
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
      {/* ═══════════════════════════════════════════════════════════════════
          ALL SESSIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__icon adm-admin-card__icon--accent">
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
              <h2 className="adm-admin-card__title">All Sessions</h2>
              <p className="adm-admin-card__subtitle">
                {loading
                  ? "Loading..."
                  : `${sessions.length} of ${total} sessions`}
              </p>
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
                placeholder="Search sessions..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="adm-filter-select"
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
              className="adm-filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From"
            />
            <input
              type="date"
              className="adm-filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To"
            />
            <button
              className="adm-btn-primary"
              onClick={() =>
                document
                  .querySelector(".adm-modern-form")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              + Create Session
            </button>
          </div>
        </div>
        <div className="adm-sessions-grid">
          {loading ? (
            <div className="adm-sessions-skeleton">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="adm-session-card-skeleton skeleton-card"
                >
                  <div className="skeleton skeleton--chip" />
                  <div className="skeleton skeleton--title" />
                  <div className="skeleton skeleton--text" />
                  <div className="skeleton skeleton--text" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="adm-empty">
              No sessions found for this filter. Try changing the search, date
              range, or teacher.
            </div>
          ) : (
            sessions.map((s) =>
              editingId === s.id ? (
                /* ─────────────────────────────────────────────
                   EDIT CARD
                   ───────────────────────────────────────────── */
                <div key={s.id} className="adm-session-edit-card">
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
                      <input
                        type="time"
                        name="startTime"
                        className="adm-form-input"
                        value={editForm.startTime}
                        onChange={onEditChange}
                      />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">End Time</label>
                      <input
                        type="time"
                        name="endTime"
                        className="adm-form-input"
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
              ) : (
                /* ─────────────────────────────────────────────
                   SESSION CARD (view mode)
                   ───────────────────────────────────────────── */
                <div key={s.id} className="adm-session-card-modern">
                  <div className="adm-session-card-modern__header">
                    <div className="adm-session-card-modern__badge">
                      {normType(s.type) === "GROUP" ? "👥 Group" : "👤 1:1"} · #
                      {s.id}
                    </div>
                    <div className="adm-action-buttons">
                      <button
                        className="adm-btn-action"
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
                        className="adm-btn-action adm-btn-action--danger"
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
                  <h3 className="adm-session-card-modern__title">
                    {s.title ||
                      (normType(s.type) === "GROUP"
                        ? "Group Session"
                        : "Lesson")}
                  </h3>
                  <div className="adm-session-card-modern__info">
                    {/* Date/Time */}
                    <div className="adm-info-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
                    {/* Learners */}
                    <div className="adm-info-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        {normType(s.type) === "GROUP" ? (
                          <>
                            <path
                              d="M2 13C2 11 5 9 8 9C11 9 14 11 14 13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="6"
                              cy="5"
                              r="2.2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="5"
                              r="2.2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </svg>
                      <span>{getSessionLearnerDisplay(s)}</span>
                    </div>
                    {/* Teacher */}
                    {s.teacher && (
                      <div className="adm-info-row">
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
                    {/* Status badge */}
                    {s.status && s.status !== "scheduled" && (
                      <div className="adm-info-row">
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background:
                              s.status === "completed"
                                ? "rgba(16, 185, 129, 0.2)"
                                : s.status === "canceled"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(156, 163, 175, 0.2)",
                            color:
                              s.status === "completed"
                                ? "#10b981"
                                : s.status === "canceled"
                                ? "#ef4444"
                                : "#9ca3af",
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Meeting link */}
                    {(s.meetingUrl || s.joinUrl) && (
                      <a
                        href={s.meetingUrl || s.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="adm-meeting-link"
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
            )
          )}
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════════════════
          TEACHER WORKLOAD
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__icon adm-admin-card__icon--warning">
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
              <h2 className="adm-admin-card__title">Teacher Workload</h2>
              <p className="adm-admin-card__subtitle">
                Monitor hours and payroll
              </p>
            </div>
          </div>
          <div className="adm-admin-card__actions">
            <select
              className="adm-filter-select"
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
              className="adm-filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="adm-filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <TeacherWorkload teacherId={teacherIdFilter} from={from} to={to} />
      </section>
      {/* ═══════════════════════════════════════════════════════════════════
          PACKAGES MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {showPackagesModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" ref={modalRef}>
            <div className="adm-modal-header">
              <h2>
                Packages for{" "}
                {selectedUser?.name || selectedUser?.email || "User"}
              </h2>
              <button
                className="adm-btn-close"
                onClick={() => setShowPackagesModal(false)}
              >
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
      )}
      {/* ═══════════════════════════════════════════════════════════════════
          ATTENDANCE MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════════
    ATTENDANCE MODAL - FIXED VERSION
    ═══════════════════════════════════════════════════════════════════ */}
      {showAttendanceModal && (
        <div className="adm-modal-overlay">
          <div
            className="adm-modal-content adm-modal-content--large"
            ref={attendanceModalRef}
          >
            {/* FIXED HEADER */}
            <div className="adm-modal-header">
              <h2>
                📊 Attendance for{" "}
                {attendanceUser?.name || attendanceUser?.email || "User"}
              </h2>
              <button
                className="adm-btn-close"
                onClick={() => setShowAttendanceModal(false)}
              >
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

            {/* 🔥 KEY FIX: Wrap everything in scrollable container */}
            <div className="adm-modal-body">
              {attendanceLoading ? (
                <div className="adm-table-skeleton">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton skeleton--row" />
                  ))}
                </div>
              ) : !attendanceData ? (
                <div className="adm-empty">Failed to load attendance data.</div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="adm-attendance-stats">
                    <div className="adm-attendance-stat">
                      <div className="adm-attendance-stat__value">
                        {attendanceData.stats?.attendanceRate != null
                          ? `${attendanceData.stats.attendanceRate}%`
                          : "—"}
                      </div>
                      <div className="adm-attendance-stat__label">
                        Attendance Rate
                      </div>
                    </div>
                    <div className="adm-attendance-stat adm-attendance-stat--success">
                      <div className="adm-attendance-stat__value">
                        {attendanceData.stats?.attended || 0}
                      </div>
                      <div className="adm-attendance-stat__label">Attended</div>
                    </div>
                    <div className="adm-attendance-stat adm-attendance-stat--danger">
                      <div className="adm-attendance-stat__value">
                        {attendanceData.stats?.noShow || 0}
                      </div>
                      <div className="adm-attendance-stat__label">No Shows</div>
                    </div>
                    <div className="adm-attendance-stat adm-attendance-stat--warning">
                      <div className="adm-attendance-stat__value">
                        {attendanceData.stats?.excused || 0}
                      </div>
                      <div className="adm-attendance-stat__label">Excused</div>
                    </div>
                    <div className="adm-attendance-stat">
                      <div className="adm-attendance-stat__value">
                        {attendanceData.stats?.totalSessions || 0}
                      </div>
                      <div className="adm-attendance-stat__label">
                        Total Sessions
                      </div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  {attendanceData.monthlyBreakdown?.length > 0 && (
                    <div className="adm-attendance-monthly">
                      <h4>Monthly Breakdown</h4>
                      <div className="adm-attendance-monthly__grid">
                        {attendanceData.monthlyBreakdown.map((m) => (
                          <div
                            key={m.month}
                            className="adm-attendance-monthly__item"
                          >
                            <div className="adm-attendance-monthly__month">
                              {new Date(m.month + "-01").toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </div>
                            <div className="adm-attendance-monthly__bar">
                              <div
                                className="adm-attendance-monthly__fill"
                                style={{ width: `${m.attendanceRate || 0}%` }}
                              />
                              <span>{m.attendanceRate ?? 0}%</span>
                            </div>
                            <div className="adm-attendance-monthly__details">
                              <span className="success">✓ {m.attended}</span>
                              <span className="danger">✗ {m.noShow}</span>
                              <span className="warning">⚠ {m.excused}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Session History Table */}
                  <div className="adm-attendance-history">
                    <h4>
                      Session History ({attendanceData.history?.length || 0})
                    </h4>
                    {attendanceData.history?.length === 0 ? (
                      <div className="adm-empty">
                        No sessions found for this learner.
                      </div>
                    ) : (
                      <div className="adm-attendance-table-wrapper">
                        <table className="adm-attendance-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Session</th>
                              <th>Teacher</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceData.history
                              ?.slice(0, 20)
                              .map((record) => {
                                const statusConfig = {
                                  attended: {
                                    label: "Attended",
                                    icon: "✓",
                                    color: "#10b981",
                                  },
                                  no_show: {
                                    label: "No Show",
                                    icon: "✗",
                                    color: "#ef4444",
                                  },
                                  excused: {
                                    label: "Excused",
                                    icon: "⚠",
                                    color: "#f59e0b",
                                  },
                                  booked: {
                                    label: "Booked",
                                    icon: "📋",
                                    color: "#3b82f6",
                                  },
                                  canceled: {
                                    label: "Canceled",
                                    icon: "—",
                                    color: "#9ca3af",
                                  },
                                };
                                const cfg =
                                  statusConfig[record.status] ||
                                  statusConfig.booked;

                                return (
                                  <tr key={record.id}>
                                    <td>
                                      <div className="adm-attendance-date">
                                        {new Date(
                                          record.sessionDate
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </div>
                                      <div className="adm-attendance-time">
                                        {new Date(
                                          record.sessionDate
                                        ).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="adm-attendance-session">
                                        {record.sessionTitle}
                                        <span className="adm-attendance-type">
                                          {record.sessionType === "GROUP"
                                            ? "Group"
                                            : "1:1"}
                                        </span>
                                      </div>
                                    </td>
                                    <td>{record.teacherName}</td>
                                    <td>
                                      <span
                                        className="adm-attendance-status"
                                        style={{
                                          color: cfg.color,
                                          background: `${cfg.color}15`,
                                        }}
                                      >
                                        {cfg.icon} {cfg.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                        {attendanceData.history?.length > 20 && (
                          <p
                            style={{
                              textAlign: "center",
                              padding: "1rem",
                              opacity: 0.7,
                            }}
                          >
                            Showing 20 of {attendanceData.history.length}{" "}
                            sessions
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════════════════
   TEACHER WORKLOAD COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
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
      <div className="adm-workload-skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="adm-workload-card skeleton-card">
            <div className="skeleton skeleton--chip" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="adm-empty">
        No workload data available for this filter.
      </div>
    );
  }
  return (
    <div className="adm-workload-grid">
      {rows.map((w) => (
        <div key={w.teacher.id} className="adm-workload-card">
          <div className="adm-workload-card__header">
            <div className="adm-user-avatar adm-user-avatar--large">
              {w.teacher.name?.charAt(0) || w.teacher.email.charAt(0)}
            </div>
            <div className="adm-workload-card__info">
              <h3>{w.teacher.name || w.teacher.email}</h3>
              <p>{w.teacher.email}</p>
            </div>
          </div>
          <div className="adm-workload-stats">
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Sessions</div>
              <div className="adm-workload-stat__value">{w.sessions}</div>
            </div>
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Hours</div>
              <div className="adm-workload-stat__value">{w.hours}</div>
            </div>
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Rate/Hour</div>
              <div className="adm-workload-stat__value">
                ${(w.rateHourlyCents / 100).toFixed(2)}
              </div>
            </div>
            <div className="adm-workload-stat adm-workload-stat--highlight">
              <div className="adm-workload-stat__label">Total Payroll</div>
              <div className="adm-workload-stat__value">
                ${w.payrollAppliedUSD.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="adm-workload-method">
            <span className="adm-badge-method">{w.method}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
export default Admin;
