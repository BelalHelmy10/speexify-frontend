// app/admin/page.js
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import api, { clearCsrfToken } from "@/lib/api";
import "@/styles/admin.scss";
import useAuth from "@/hooks/useAuth";
import { useToast, useConfirm } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
import BulkSessionScheduler from "@/components/admin/BulkSessionScheduler";
import AdminPackagesModal from "./components/AdminPackagesModal";
import AdminAttendanceModal from "./components/AdminAttendanceModal";
import AdminBulkActionBar from "./components/AdminBulkActionBar";
import AdminCreateSessionSection from "./components/AdminCreateSessionSection";
import AdminSessionsSection from "./components/AdminSessionsSection";
import AdminTeacherWorkloadSection from "./components/AdminTeacherWorkloadSection";
import AdminAvailabilitySection from "./components/AdminAvailabilitySection";
import AdminAccessFallback from "./components/AdminAccessFallback";
import AdminDashboardHeader from "./components/AdminDashboardHeader";
import AdminUserManagementSection from "./components/AdminUserManagementSection";
import {
  toDateInput,
  toTimeInput,
  fmt,
  joinDateTime,
  diffMinutes,
  normType,
  getSessionLearnerDisplay,
} from "./components/adminPageUtils";
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
  // BULK SELECTION STATE
  // ─────────────────────────────────────────────
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  // ─────────────────────────────────────────────
  // BULK SCHEDULER MODAL STATE
  // ─────────────────────────────────────────────
  const [showBulkScheduler, setShowBulkScheduler] = useState(false);
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
        `${type === "GROUP" ? "Group session" : "Session"
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
    if (checking) return;
    loadUsersAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);
  useEffect(() => {
    if (checking || !isAdmin) return;
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

  async function onRateHourlyBlur(userId, raw) {
    const value = String(raw || "").trim();
    const cents = value === "" ? null : Math.round(Number(value) * 100);
    await api.patch(`/admin/users/${userId}`, { rateHourlyCents: cents });
    loadUsersAdmin();
  }

  async function onRatePerSessionBlur(userId, raw) {
    const value = String(raw || "").trim();
    const cents = value === "" ? null : Math.round(Number(value) * 100);
    await api.patch(`/admin/users/${userId}`, { ratePerSessionCents: cents });
    loadUsersAdmin();
  }

  function openPackagesForUser(u) {
    setSelectedUser(u);
    loadPackages(u.id);
    setShowPackagesModal(true);
  }

  function openAttendanceForUser(u) {
    setAttendanceUser(u);
    loadAttendance(u.id);
    setShowAttendanceModal(true);
  }

  // ─────────────────────────────────────────────
  // BULK SELECTION HANDLERS
  // ─────────────────────────────────────────────
  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };
  const toggleAllUsers = () => {
    if (selectedUserIds.size === usersAdmin.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(usersAdmin.map((u) => u.id)));
    }
  };
  const toggleSessionSelection = (sessionId) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };
  const toggleAllSessions = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  };
  const clearAllSelections = () => {
    setSelectedUserIds(new Set());
    setSelectedSessionIds(new Set());
  };
  // ─────────────────────────────────────────────
  // BULK ACTION HANDLERS
  // ─────────────────────────────────────────────
  async function bulkEnableUsers() {
    if (selectedUserIds.size === 0) return;
    const ok = await confirmModal(
      `Enable ${selectedUserIds.size} selected user(s)?`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/users/bulk", {
        ids: Array.from(selectedUserIds),
        action: "enable",
      });
      toast.success(`${data.affected} user(s) enabled`);
      setSelectedUserIds(new Set());
      loadUsersAdmin();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to enable users");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkDisableUsers() {
    if (selectedUserIds.size === 0) return;
    const ok = await confirmModal(
      `⚠️ Disable ${selectedUserIds.size} selected user(s)? They will not be able to log in.`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/users/bulk", {
        ids: Array.from(selectedUserIds),
        action: "disable",
      });
      toast.success(`${data.affected} user(s) disabled`);
      setSelectedUserIds(new Set());
      loadUsersAdmin();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to disable users");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkChangeUserRole(role) {
    if (selectedUserIds.size === 0) return;
    const roleLabel = { learner: "Learner", teacher: "Teacher", admin: "Admin" }[role];
    const ok = await confirmModal(
      `Change ${selectedUserIds.size} selected user(s) to ${roleLabel} role?`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/users/bulk", {
        ids: Array.from(selectedUserIds),
        action: "role",
        role,
      });
      toast.success(`${data.affected} user(s) changed to ${roleLabel}`);
      setSelectedUserIds(new Set());
      loadUsersAdmin();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to change roles");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkResetPasswords() {
    if (selectedUserIds.size === 0) return;
    const ok = await confirmModal(
      `Send password reset emails to ${selectedUserIds.size} selected user(s)?`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/users/bulk/reset-password", {
        ids: Array.from(selectedUserIds),
      });
      toast.success(`Reset emails sent: ${data.sent} successful, ${data.failed} failed`);
      setSelectedUserIds(new Set());
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send reset emails");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkDeleteSessions() {
    if (selectedSessionIds.size === 0) return;
    const ok = await confirmModal(
      `🗑️ Delete ${selectedSessionIds.size} selected session(s)? This cannot be undone.`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/sessions/bulk", {
        ids: Array.from(selectedSessionIds),
        action: "delete",
      });
      toast.success(`${data.affected} session(s) deleted`);
      setSelectedSessionIds(new Set());
      reloadSessions();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete sessions");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkCancelSessions() {
    if (selectedSessionIds.size === 0) return;
    const ok = await confirmModal(
      `Cancel ${selectedSessionIds.size} selected session(s)? Credits will be refunded.`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/sessions/bulk", {
        ids: Array.from(selectedSessionIds),
        action: "cancel",
      });
      toast.success(
        `${data.affected} session(s) canceled, ${data.refundedCredits} credit(s) refunded`
      );
      setSelectedSessionIds(new Set());
      reloadSessions();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to cancel sessions");
    } finally {
      setBulkActionLoading(false);
    }
  }
  async function bulkAssignTeacher(teacherId) {
    if (selectedSessionIds.size === 0 || !teacherId) return;
    const teacher = teachers.find((t) => t.id === Number(teacherId));
    const teacherName = teacher?.name || teacher?.email || "selected teacher";
    const ok = await confirmModal(
      `Assign ${selectedSessionIds.size} selected session(s) to ${teacherName}?`
    );
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const { data } = await api.post("/admin/sessions/bulk", {
        ids: Array.from(selectedSessionIds),
        action: "assign-teacher",
        teacherId: Number(teacherId),
      });
      toast.success(`${data.affected} session(s) assigned to ${teacherName}`);
      setSelectedSessionIds(new Set());
      reloadSessions();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to assign teacher");
    } finally {
      setBulkActionLoading(false);
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
  if (checking || !isAdmin) {
    return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;
  }
  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="adm-admin-modern">
      <AdminDashboardHeader />

      {/* ═══════════════════════════════════════════════════════════════════
          USER MANAGEMENT
          ═══════════════════════════════════════════════════════════════════ */}
      <AdminUserManagementSection
        usersAdmin={usersAdmin}
        usersBusy={usersBusy}
        usersQ={usersQ}
        setUsersQ={setUsersQ}
        stopImpersonate={stopImpersonate}
        selectedUserIds={selectedUserIds}
        toggleAllUsers={toggleAllUsers}
        toggleUserSelection={toggleUserSelection}
        changeRole={changeRole}
        onRateHourlyBlur={onRateHourlyBlur}
        onRatePerSessionBlur={onRatePerSessionBlur}
        sendReset={sendReset}
        impersonate={impersonate}
        toggleDisabled={toggleDisabled}
        onOpenPackages={openPackagesForUser}
        onOpenAttendance={openAttendanceForUser}
      />
      {/* ═══════════════════════════════════════════════════════════════════
          CREATE SESSION
          ═══════════════════════════════════════════════════════════════════ */}
      <AdminCreateSessionSection
        form={form}
        teachers={teachers}
        users={users}
        normType={normType}
        onCreateChange={onCreateChange}
        onCreateLearnersChange={onCreateLearnersChange}
        createSession={createSession}
        setForm={setForm}
        setShowBulkScheduler={setShowBulkScheduler}
      />
      {/* ═══════════════════════════════════════════════════════════════════
          ALL SESSIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <AdminSessionsSection
        loading={loading}
        sessions={sessions}
        total={total}
        q={q}
        setQ={setQ}
        teacherIdFilter={teacherIdFilter}
        setTeacherIdFilter={setTeacherIdFilter}
        teachers={teachers}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        editingId={editingId}
        normType={normType}
        cancelEdit={cancelEdit}
        editForm={editForm}
        onEditChange={onEditChange}
        users={users}
        setEditForm={setEditForm}
        toast={toast}
        addParticipant={addParticipant}
        removeParticipant={removeParticipant}
        deleteSession={deleteSession}
        updateSession={updateSession}
        startEdit={startEdit}
        fmt={fmt}
        getSessionLearnerDisplay={getSessionLearnerDisplay}
      />
      {/* ═══════════════════════════════════════════════════════════════════
          TEACHER WORKLOAD
          ═══════════════════════════════════════════════════════════════════ */}
      <AdminTeacherWorkloadSection
        teacherIdFilter={teacherIdFilter}
        setTeacherIdFilter={setTeacherIdFilter}
        teachers={teachers}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
      />

      {/* USER AVAILABILITY */}
      <AdminAvailabilitySection />
      <AdminPackagesModal
        open={showPackagesModal}
        modalRef={modalRef}
        selectedUser={selectedUser}
        packagesLoading={packagesLoading}
        packages={packages}
        onClose={() => setShowPackagesModal(false)}
        toDateInput={toDateInput}
        fmt={fmt}
      />

      <AdminAttendanceModal
        open={showAttendanceModal}
        attendanceModalRef={attendanceModalRef}
        attendanceUser={attendanceUser}
        attendanceLoading={attendanceLoading}
        attendanceData={attendanceData}
        onClose={() => setShowAttendanceModal(false)}
      />

      <AdminBulkActionBar
        selectedUserIds={selectedUserIds}
        selectedSessionIds={selectedSessionIds}
        bulkActionLoading={bulkActionLoading}
        bulkEnableUsers={bulkEnableUsers}
        bulkDisableUsers={bulkDisableUsers}
        bulkChangeUserRole={bulkChangeUserRole}
        bulkResetPasswords={bulkResetPasswords}
        bulkDeleteSessions={bulkDeleteSessions}
        bulkCancelSessions={bulkCancelSessions}
        bulkAssignTeacher={bulkAssignTeacher}
        teachers={teachers}
        clearAllSelections={clearAllSelections}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          BULK SESSION SCHEDULER MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      <BulkSessionScheduler
        isOpen={showBulkScheduler}
        onClose={() => setShowBulkScheduler(false)}
        onSuccess={() => reloadSessions()}
      />
    </div>
  );
}
export default Admin;
