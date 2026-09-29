"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { useConfirm, useToast } from "@/components/ToastProvider";
import "@/styles/bulk-session-scheduler.scss";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
];

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  const [hour, minute] = String(value || "12:00").split(":").map(Number);
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function personLabel(person) {
  if (!person) return "Learner";
  return person.name || person.email || `Learner #${person.id}`;
}

function packageIsEligible(pkg) {
  if (typeof pkg.creditEligible === "boolean") return pkg.creditEligible;
  const remaining = Number(pkg.remaining ?? Number(pkg.sessionsTotal || 0) - Number(pkg.sessionsUsed || 0));
  const expired = pkg.expired || (pkg.expiresAt && new Date(pkg.expiresAt) <= new Date());
  return pkg.status === "active" && !expired && remaining > 0;
}

function packageRemaining(pkg) {
  return Math.max(
    0,
    Number(pkg.remaining ?? Number(pkg.sessionsTotal || 0) - Number(pkg.sessionsUsed || 0))
  );
}

function getInitialState() {
  return {
    sessionType: "ONE_ON_ONE",
    selectedLearnerIds: [],
    teacherId: "",
    startDate: todayInputValue(),
    time: "12:00",
    numberOfSessions: 4,
    durationMin: 60,
    capacity: 6,
    title: "Lesson",
    allowNoCredit: false,
    allowNoCreditReason: "",
  };
}

export default function BulkSessionScheduler({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const { confirmModal } = useConfirm();
  const [form, setForm] = useState(getInitialState);
  const [customTitles, setCustomTitles] = useState({});
  const [learners, setLearners] = useState([]);
  const [peopleById, setPeopleById] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [creditsByLearner, setCreditsByLearner] = useState({});
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isGroup = form.sessionType === "GROUP";
  const selectedLearners = useMemo(
    () =>
      form.selectedLearnerIds.map(
        (id) => peopleById[String(id)] || { id, email: `Learner #${id}` }
      ),
    [form.selectedLearnerIds, peopleById]
  );
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => String(teacher.id) === String(form.teacherId)),
    [form.teacherId, teachers]
  );

  const dayOfWeek = useMemo(() => {
    if (!form.startDate) return null;
    const [year, month, day] = form.startDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date.getDay();
  }, [form.startDate]);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        options.push({ value, label: formatTime(value) });
      }
    }
    return options;
  }, []);

  const sessionDates = useMemo(() => {
    if (!form.startDate) return [];
    const [year, month, day] = form.startDate.split("-").map(Number);
    let current = new Date(year, month - 1, day);
    if (Number.isNaN(current.getTime())) return [];

    return Array.from({ length: form.numberOfSessions }, () => {
      const date = new Date(current);
      current.setDate(current.getDate() + 7);
      return date;
    });
  }, [form.startDate, form.numberOfSessions]);

  useEffect(() => {
    setCustomTitles((current) =>
      Object.fromEntries(
        sessionDates.map((_, index) => [index, current[index] || ""])
      )
    );
  }, [sessionDates.length]);

  const creditRows = useMemo(
    () =>
      selectedLearners.map((learner) => ({
        learner,
        ...(creditsByLearner[String(learner.id)] || {
          remaining: null,
          error: "",
        }),
      })),
    [creditsByLearner, selectedLearners]
  );

  const creditRowsReady =
    creditRows.length > 0 &&
    creditRows.every((row) => row.remaining !== null && !row.error);
  const shortfallRows = creditRows.filter(
    (row) => Number(row.remaining || 0) < form.numberOfSessions
  );
  const capacityValid = !isGroup || selectedLearners.length <= Number(form.capacity || 0);
  const participantCountValid = isGroup
    ? selectedLearners.length >= 2
    : selectedLearners.length === 1;
  const overrideValid = !form.allowNoCredit || form.allowNoCreditReason.trim().length >= 6;
  const isValid =
    participantCountValid &&
    Boolean(form.startDate && form.time) &&
    dayOfWeek !== null &&
    form.numberOfSessions >= 1 &&
    form.numberOfSessions <= 52 &&
    capacityValid &&
    creditRowsReady &&
    (form.allowNoCredit || shortfallRows.length === 0) &&
    overrideValid;

  const loadLearners = useCallback(async (search = "") => {
    try {
      setLoadingLearners(true);
      const { data } = await api.get("/users", {
        params: { role: "learner", q: search || undefined, active: "1" },
      });
      const next = Array.isArray(data) ? data : [];
      setLearners(next);
      setPeopleById((current) => ({
        ...current,
        ...Object.fromEntries(next.map((person) => [String(person.id), person])),
      }));
    } catch (err) {
      console.error("Failed to load learners:", err);
      setLearners([]);
    } finally {
      setLoadingLearners(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => loadLearners(learnerSearch), learnerSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [isOpen, learnerSearch, loadLearners]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoadingTeachers(true);
        const { data } = await api.get("/teachers", { params: { active: "1" } });
        if (!cancelled) setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load teachers:", err);
        if (!cancelled) setTeachers([]);
      } finally {
        if (!cancelled) setLoadingTeachers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || form.selectedLearnerIds.length === 0) {
      setCreditsByLearner({});
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoadingCredits(true);
      const entries = await Promise.all(
        form.selectedLearnerIds.map(async (id) => {
          try {
            const { data } = await api.get(`/admin/users/${id}/packages`);
            const packages = Array.isArray(data) ? data : [];
            const remaining = packages
              .filter(
                (pkg) =>
                  packageIsEligible(pkg) && pkg.lessonType === form.sessionType
              )
              .reduce((sum, pkg) => sum + packageRemaining(pkg), 0);
            return [String(id), { remaining, error: "" }];
          } catch (err) {
            console.error("Failed to load learner credits:", err);
            return [String(id), { remaining: null, error: "Unable to load credits" }];
          }
        })
      );
      if (!cancelled) setCreditsByLearner(Object.fromEntries(entries));
      if (!cancelled) setLoadingCredits(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [form.selectedLearnerIds, form.sessionType, isOpen]);

  const updateForm = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setError("");
  };

  const handleTypeChange = (nextType) => {
    const nextIds = nextType === "GROUP"
      ? form.selectedLearnerIds
      : form.selectedLearnerIds.slice(0, 1);
    updateForm({ sessionType: nextType, selectedLearnerIds: nextIds });
  };

  const selectLearner = (learner) => {
    setPeopleById((current) => ({ ...current, [String(learner.id)]: learner }));
    updateForm({
      selectedLearnerIds: isGroup
        ? Array.from(new Set([...form.selectedLearnerIds, String(learner.id)]))
        : [String(learner.id)],
    });
    if (!isGroup) setLearnerSearch("");
  };

  const removeLearner = (id) => {
    updateForm({
      selectedLearnerIds: form.selectedLearnerIds.filter((value) => String(value) !== String(id)),
    });
  };

  const clearLearners = () => {
    updateForm({ selectedLearnerIds: [] });
  };

  const resetForm = () => {
    setForm(getInitialState());
    setCustomTitles({});
    setLearnerSearch("");
    setCreditsByLearner({});
    setError("");
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!isValid || saving) return;

    const participantLabel = isGroup
      ? `${selectedLearners.length} learners`
      : personLabel(selectedLearners[0]);
    const confirmed = await confirmModal(
      `Schedule ${form.numberOfSessions} weekly ${isGroup ? "group" : "1:1"} session(s) for ${participantLabel}?\n\nEvery ${DAYS_OF_WEEK[dayOfWeek]} at ${formatTime(form.time)} starting ${formatDate(sessionDates[0])}.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const titles = sessionDates.map(
        (_, index) =>
          customTitles[index]?.trim() ||
          form.title.trim() ||
          (isGroup ? "Group Session" : "Lesson")
      );
      const payload = {
        type: form.sessionType,
        ...(isGroup
          ? { learnerIds: form.selectedLearnerIds.map(Number), capacity: Number(form.capacity) }
          : { learnerId: Number(form.selectedLearnerIds[0]) }),
        teacherId: form.teacherId ? Number(form.teacherId) : null,
        startDate: form.startDate,
        dayOfWeek,
        time: form.time,
        numberOfSessions: Number(form.numberOfSessions),
        durationMin: Number(form.durationMin),
        defaultTitle: form.title.trim() || (isGroup ? "Group Session" : "Lesson"),
        customTitles: titles,
        allowNoCredit: form.allowNoCredit,
        allowNoCreditReason: form.allowNoCreditReason.trim(),
      };

      const { data } = await api.post("/admin/sessions/bulk-create", payload);
      const suffix = isGroup
        ? `${data.participantCount} learners notified`
        : `${data.creditsAfter} credit(s) remaining`;
      toast.success(`${data.created} recurring session(s) created · ${suffix}`);
      onSuccess?.(data);
      resetForm();
      onClose?.();
    } catch (err) {
      console.error("Bulk create failed:", err);
      const response = err?.response?.data || {};
      if (response.error === "insufficient_credits") {
        const learner = selectedLearners.find(
          (person) => String(person.id) === String(response.learnerId)
        );
        setError(
          `${personLabel(learner)} has ${response.creditsAvailable ?? 0} ${form.sessionType === "GROUP" ? "group" : "matching"} credit(s), but ${response.sessionsRequested ?? form.numberOfSessions} session(s) are requested.`
        );
      } else if (response.error === "time_conflict") {
        setError("At least one learner or the teacher already has a session at one of these times. Review the schedule and try again.");
      } else {
        setError(response.message || response.error || "Could not create the recurring schedule.");
      }
      toast.error(response.message || response.error || "Could not create the recurring schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const searchResults = learners.filter(
    (learner) =>
      !form.selectedLearnerIds.some((id) => String(id) === String(learner.id))
  );
  const requestedCredits = selectedLearners.length * form.numberOfSessions;
  const availableCredits = creditRows.reduce(
    (sum, row) => sum + Number(row.remaining || 0),
    0
  );

  return (
    <div
      className="bulk-scheduler-overlay"
      role="presentation"
      onClick={handleClose}
      data-lenis-prevent
    >
      <section
        className="bulk-scheduler"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-scheduler-title"
        onClick={(event) => event.stopPropagation()}
        data-lenis-prevent
      >
        <header className="bulk-scheduler__header">
          <div className="bulk-scheduler__eyebrow">
            <CalendarDays size={15} />
            <span>Scheduling workspace</span>
          </div>
          <button
            type="button"
            className="bulk-scheduler__close"
            onClick={handleClose}
            aria-label="Close recurring scheduler"
          >
            <X size={18} />
          </button>
          <h2 id="bulk-scheduler-title" className="bulk-scheduler__title">
            Build a recurring schedule
          </h2>
          <p className="bulk-scheduler__subtitle">
            Plan a consistent weekly rhythm for one learner or a complete group.
          </p>
        </header>

        {error && (
          <div className="bulk-scheduler__alert bulk-scheduler__alert--error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="bulk-scheduler__body">
          <main className="bulk-scheduler__main">
            <section className="bulk-scheduler__section">
              <div className="bulk-scheduler__section-heading">
                <div>
                  <span className="bulk-scheduler__step">01</span>
                  <div>
                    <h3>Choose the session format</h3>
                    <p>Credits are checked against the selected format.</p>
                  </div>
                </div>
              </div>

              <div className="bulk-scheduler__type-switch" role="group" aria-label="Session format">
                <button
                  type="button"
                  className={form.sessionType === "ONE_ON_ONE" ? "is-active" : ""}
                  onClick={() => handleTypeChange("ONE_ON_ONE")}
                  aria-pressed={form.sessionType === "ONE_ON_ONE"}
                >
                  <UserRound size={18} />
                  <span><strong>1:1 coaching</strong><small>One learner per time slot</small></span>
                </button>
                <button
                  type="button"
                  className={form.sessionType === "GROUP" ? "is-active" : ""}
                  onClick={() => handleTypeChange("GROUP")}
                  aria-pressed={form.sessionType === "GROUP"}
                >
                  <Users size={18} />
                  <span><strong>Group session</strong><small>Shared room for 2+ learners</small></span>
                </button>
              </div>
            </section>

            <section className="bulk-scheduler__section">
              <div className="bulk-scheduler__section-heading">
                <div>
                  <span className="bulk-scheduler__step">02</span>
                  <div>
                    <h3>{isGroup ? "Add participants" : "Choose the learner"}</h3>
                    <p>{isGroup ? "Select everyone who should receive every session." : "Search by name or email to avoid selecting the wrong account."}</p>
                  </div>
                </div>
                <span className="bulk-scheduler__count-pill">
                  {selectedLearners.length} selected
                </span>
              </div>

              <div className="bulk-scheduler__search-wrap">
                <Search size={17} />
                <input
                  type="search"
                  value={learnerSearch}
                  onChange={(event) => setLearnerSearch(event.target.value)}
                  placeholder="Search all learners by name or email"
                  aria-label="Search learners by name or email"
                />
                {loadingLearners && <Loader2 size={16} className="bulk-scheduler__spin" />}
              </div>

              <div className="bulk-scheduler__directory-meta" aria-live="polite">
                <span>
                  {learnerSearch ? "Matching active learners" : "All active learners"}
                </span>
                <strong>
                  {searchResults.length} available
                  {learnerSearch ? ` of ${learners.length}` : ""}
                </strong>
              </div>

              {selectedLearners.length > 0 && (
                <div className="bulk-scheduler__selection-block">
                  <div className="bulk-scheduler__selection-heading">
                    <span>Selected {isGroup ? "learners" : "learner"}</span>
                    <button type="button" onClick={clearLearners}>Clear all</button>
                  </div>
                  <div className="bulk-scheduler__chips" aria-label="Selected learners">
                    {selectedLearners.map((learner) => (
                      <span className="bulk-scheduler__chip" key={learner.id}>
                        <span className="bulk-scheduler__chip-avatar">{personLabel(learner).slice(0, 1).toUpperCase()}</span>
                        <span>{personLabel(learner)}</span>
                        <button
                          type="button"
                          onClick={() => removeLearner(learner.id)}
                          aria-label={`Remove ${personLabel(learner)}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bulk-scheduler__people-list">
                {searchResults.length > 0 ? searchResults.map((learner) => (
                  <button
                    type="button"
                    className="bulk-scheduler__person"
                    key={learner.id}
                    onClick={() => selectLearner(learner)}
                  >
                    <span className="bulk-scheduler__person-avatar">{personLabel(learner).slice(0, 1).toUpperCase()}</span>
                    <span className="bulk-scheduler__person-details">
                      <strong>{personLabel(learner)}</strong>
                      <small>{learner.email}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )) : (
                  <div className="bulk-scheduler__empty-list">
                    {loadingLearners ? "Loading learners…" : learnerSearch ? "No learners match that search." : "No learners available."}
                  </div>
                )}
              </div>

              {isGroup && (
                <div className="bulk-scheduler__inline-fields">
                  <label className="bulk-scheduler__field">
                    <span>Group capacity</span>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={form.capacity}
                      onChange={(event) => updateForm({ capacity: Math.max(2, Math.min(100, Number(event.target.value) || 2)) })}
                    />
                  </label>
                  <p className="bulk-scheduler__field-note">
                    <Info size={15} />
                    You can add more learners later, up to this limit.
                  </p>
                </div>
              )}
            </section>

            <section className="bulk-scheduler__section">
              <div className="bulk-scheduler__section-heading">
                <div>
                  <span className="bulk-scheduler__step">03</span>
                  <div>
                    <h3>Assign the teacher</h3>
                    <p>Choose who will teach every session, or leave it open for later.</p>
                  </div>
                </div>
                <span className="bulk-scheduler__count-pill">
                  {teachers.length} active {teachers.length === 1 ? "teacher" : "teachers"}
                </span>
              </div>

              <div className="bulk-scheduler__assignment-card">
                <div className="bulk-scheduler__assignment-icon"><UserRound size={18} /></div>
                <label className="bulk-scheduler__field">
                  <span>Teacher <em>optional</em></span>
                  <select value={form.teacherId} onChange={(event) => updateForm({ teacherId: event.target.value })} disabled={loadingTeachers}>
                    <option value="">No teacher assigned yet</option>
                    {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>)}
                  </select>
                </label>
                <p className="bulk-scheduler__field-note">
                  <Users size={15} />
                  {selectedTeacher ? `${selectedTeacher.name || selectedTeacher.email} will be added to every session.` : "You can assign a teacher later from the session details."}
                </p>
              </div>
            </section>

            <section className="bulk-scheduler__section">
              <div className="bulk-scheduler__section-heading">
                <div>
                  <span className="bulk-scheduler__step">04</span>
                  <div>
                    <h3>Set the weekly rhythm</h3>
                    <p>The start date anchors the same weekday for every session.</p>
                  </div>
                </div>
              </div>

              <div className="bulk-scheduler__fields-grid bulk-scheduler__fields-grid--three">
                <label className="bulk-scheduler__field">
                  <span>First session</span>
                  <input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} />
                </label>
                <label className="bulk-scheduler__field">
                  <span>Time</span>
                  <select value={form.time} onChange={(event) => updateForm({ time: event.target.value })}>
                    {timeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="bulk-scheduler__field">
                  <span>Sessions</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.numberOfSessions}
                    onChange={(event) => updateForm({ numberOfSessions: Math.max(1, Math.min(52, Number(event.target.value) || 1)) })}
                  />
                </label>
              </div>

              <div className="bulk-scheduler__fields-grid bulk-scheduler__fields-grid--two">
                <label className="bulk-scheduler__field">
                  <span>Duration</span>
                  <select value={form.durationMin} onChange={(event) => updateForm({ durationMin: Number(event.target.value) })}>
                    {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <div className="bulk-scheduler__field bulk-scheduler__field--read-only">
                  <span>Teacher</span>
                  <div>{selectedTeacher ? selectedTeacher.name || selectedTeacher.email : "Unassigned"}</div>
                </div>
              </div>

              <label className="bulk-scheduler__field">
                <span>Session title</span>
                <input type="text" value={form.title} onChange={(event) => updateForm({ title: event.target.value })} maxLength={120} placeholder={isGroup ? "Group Session" : "Lesson"} />
              </label>

              <div className="bulk-scheduler__timeline">
                <div className="bulk-scheduler__timeline-heading">
                  <span><Clock3 size={16} /> {DAYS_OF_WEEK[dayOfWeek] || "Select a date"} · {formatTime(form.time)}</span>
                  <strong>{sessionDates.length} dates</strong>
                </div>
                <div className="bulk-scheduler__timeline-list">
                  {sessionDates.slice(0, 6).map((date, index) => (
                    <div className="bulk-scheduler__timeline-item" key={date.toISOString()}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{formatDate(date)}</strong>
                      <small>{formatTime(form.time)}</small>
                      <input
                        type="text"
                        aria-label={`Title for session ${index + 1}`}
                        value={customTitles[index] || ""}
                        onChange={(event) =>
                          setCustomTitles((current) => ({
                            ...current,
                            [index]: event.target.value,
                          }))
                        }
                        placeholder={form.title || (isGroup ? "Group Session" : "Lesson")}
                        maxLength={120}
                      />
                    </div>
                  ))}
                  {sessionDates.length > 6 && <div className="bulk-scheduler__timeline-more">+ {sessionDates.length - 6} more weekly sessions</div>}
                </div>
              </div>
            </section>

            <section className="bulk-scheduler__section bulk-scheduler__section--last">
              <label className="bulk-scheduler__override">
                <input type="checkbox" checked={form.allowNoCredit} onChange={(event) => updateForm({ allowNoCredit: event.target.checked })} />
                <span className="bulk-scheduler__override-icon"><ShieldAlert size={17} /></span>
                <span><strong>Allow scheduling without available credits</strong><small>Use only for approved exceptions. This action is recorded in the admin audit trail.</small></span>
              </label>
              {form.allowNoCredit && (
                <textarea
                  value={form.allowNoCreditReason}
                  onChange={(event) => updateForm({ allowNoCreditReason: event.target.value })}
                  placeholder="Required reason for this exception…"
                  rows={2}
                  maxLength={240}
                />
              )}
            </section>
          </main>

          <aside className="bulk-scheduler__summary">
            <div className="bulk-scheduler__summary-top">
              <span className="bulk-scheduler__summary-kicker"><CalendarDays size={15} /> Schedule summary</span>
              <span className="bulk-scheduler__summary-status"><span /> Draft</span>
            </div>
            <h3>{isGroup ? "Group recurring schedule" : "1:1 recurring schedule"}</h3>
            <p className="bulk-scheduler__summary-copy">
              {isGroup ? "Every selected learner will be added to every weekly session." : "The selected learner will receive a weekly session."}
            </p>

            <div className="bulk-scheduler__summary-card">
              <div><Users size={16} /><span>Participants</span><strong>{selectedLearners.length || "—"}</strong></div>
              <div><UserRound size={16} /><span>Teacher</span><strong>{selectedTeacher ? selectedTeacher.name || selectedTeacher.email : "Unassigned"}</strong></div>
              <div><CalendarDays size={16} /><span>Schedule</span><strong>{form.numberOfSessions} × weekly</strong></div>
              <div><Clock3 size={16} /><span>Duration</span><strong>{form.durationMin} min</strong></div>
            </div>

            <div className="bulk-scheduler__credit-card">
              <div className="bulk-scheduler__credit-card-heading">
                <span><CreditCard size={17} /> Credit readiness</span>
                {loadingCredits ? <Loader2 size={16} className="bulk-scheduler__spin" /> : creditRowsReady && shortfallRows.length === 0 ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              </div>
              {creditRows.length === 0 ? (
                <p>Select {isGroup ? "participants" : "a learner"} to check matching credits.</p>
              ) : (
                <>
                  <div className="bulk-scheduler__credit-total"><strong>{availableCredits}</strong><span>usable {isGroup ? "group " : ""}credits across participants</span></div>
                  <div className="bulk-scheduler__credit-rows">
                    {creditRows.map((row) => (
                      <div key={row.learner.id} className={Number(row.remaining || 0) < form.numberOfSessions ? "is-short" : ""}>
                        <span>{personLabel(row.learner)}</span>
                        <strong>{row.remaining === null ? "…" : `${row.remaining} left`}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="bulk-scheduler__credit-footnote">
                    {requestedCredits} credit{requestedCredits === 1 ? "" : "s"} required in total{isGroup ? " · each learner pays one per session" : ""}.
                  </p>
                </>
              )}
            </div>

            {(!participantCountValid || !capacityValid || (!form.allowNoCredit && shortfallRows.length > 0)) && (
              <div className="bulk-scheduler__summary-warning">
                <AlertTriangle size={16} />
                {!participantCountValid ? (isGroup ? "Select at least two learners for a group." : "Select one learner to continue.") : !capacityValid ? "Increase capacity or remove a participant." : "Every participant needs enough matching credits."}
              </div>
            )}

            <button type="button" className="bulk-scheduler__submit" onClick={handleSubmit} disabled={!isValid || saving}>
              {saving ? <><Loader2 size={17} className="bulk-scheduler__spin" /> Creating schedule…</> : <>Schedule {form.numberOfSessions} session{form.numberOfSessions === 1 ? "" : "s"} <ChevronRight size={17} /></>}
            </button>
            <p className="bulk-scheduler__secure-note"><ShieldAlert size={14} /> Conflicts and credit debits are checked atomically before anything is saved.</p>
          </aside>
        </div>

        <footer className="bulk-scheduler__footer">
          <span><Info size={14} /> Learners and teachers receive booking confirmations after creation.</span>
          <button type="button" onClick={handleClose} disabled={saving}>Cancel</button>
        </footer>
      </section>
    </div>
  );
}
