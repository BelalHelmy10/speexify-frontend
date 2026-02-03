// components/admin/BulkSessionScheduler.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { useToast, useConfirm } from "@/components/ToastProvider";
import "@/styles/bulk-session-scheduler.scss";

/**
 * BulkSessionScheduler - Schedule recurring weekly sessions for a learner
 * 
 * Features:
 * - Select day of week (Monday, Tuesday, etc.)
 * - Select time (single time)
 * - Select number of sessions/weeks
 * - Creates sessions on consecutive weeks
 */
export default function BulkSessionScheduler({ isOpen, onClose, onSuccess }) {
    const { toast } = useToast();
    const { confirmModal } = useConfirm();

    // Form state
    const [learnerId, setLearnerId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState(1); // 0=Sunday, 1=Monday, etc.
    const [time, setTime] = useState("12:00");
    const [numberOfSessions, setNumberOfSessions] = useState(4);
    const [durationMin, setDurationMin] = useState(60);
    const [title, setTitle] = useState("Lesson");
    const [allowNoCredit, setAllowNoCredit] = useState(false);

    // Data state
    const [learners, setLearners] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [learnerCredits, setLearnerCredits] = useState(null);
    const [loadingLearners, setLoadingLearners] = useState(false);
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    const [loadingCredits, setLoadingCredits] = useState(false);

    // Submission state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Search state
    const [learnerSearch, setLearnerSearch] = useState("");

    // Days of week
    const daysOfWeek = [
        { value: 0, label: "Sunday" },
        { value: 1, label: "Monday" },
        { value: 2, label: "Tuesday" },
        { value: 3, label: "Wednesday" },
        { value: 4, label: "Thursday" },
        { value: 5, label: "Friday" },
        { value: 6, label: "Saturday" },
    ];

    // Generate time options (24 hours, 30-min intervals)
    const timeOptions = useMemo(() => {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const value = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                const ampm = hour >= 12 ? "PM" : "AM";
                const label = `${hour12}:${String(min).padStart(2, "0")} ${ampm}`;
                options.push({ value, label });
            }
        }
        return options;
    }, []);

    // Load learners with search (debounced fetch)
    const loadLearners = useCallback(async (search = "") => {
        try {
            setLoadingLearners(true);
            const { data } = await api.get("/users", {
                params: { role: "learner", q: search || undefined, active: "1" },
            });
            setLearners(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load learners:", err);
            setLearners([]);
        } finally {
            setLoadingLearners(false);
        }
    }, []);

    // Initial load of learners when modal opens
    useEffect(() => {
        if (isOpen) {
            loadLearners("");
        }
    }, [isOpen, loadLearners]);

    // Search learners with debounce
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            loadLearners(learnerSearch);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [learnerSearch, isOpen, loadLearners]);

    // Load teachers
    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                setLoadingTeachers(true);
                const { data } = await api.get("/teachers", {
                    params: { active: "1" },
                });
                setTeachers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load teachers:", err);
            } finally {
                setLoadingTeachers(false);
            }
        })();
    }, [isOpen]);

    // Load learner credits when selected
    useEffect(() => {
        if (!learnerId) {
            setLearnerCredits(null);
            return;
        }
        (async () => {
            try {
                setLoadingCredits(true);
                const { data } = await api.get(`/admin/users/${learnerId}/packages`);
                const totalCredits = (data || []).reduce((sum, pkg) => {
                    return sum + (pkg.remaining || 0);
                }, 0);
                setLearnerCredits(totalCredits);
            } catch (err) {
                console.error("Failed to load credits:", err);
                setLearnerCredits(null);
            } finally {
                setLoadingCredits(false);
            }
        })();
    }, [learnerId]);

    // Get selected learner name
    const selectedLearner = learners.find((l) => String(l.id) === String(learnerId));

    // Calculate session dates
    const sessionDates = useMemo(() => {
        const dates = [];
        const today = new Date();
        let currentDate = new Date(today);

        // Find the next occurrence of the selected day
        const targetDay = Number(dayOfWeek);
        while (currentDate.getDay() !== targetDay) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Generate dates for each session
        for (let i = 0; i < numberOfSessions; i++) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 7); // Add 7 days for next week
        }

        return dates;
    }, [dayOfWeek, numberOfSessions]);

    // Custom titles state
    const [customTitles, setCustomTitles] = useState({});

    // Reset custom titles when session dates change significantly (e.g. # of sessions changes)
    // We preserve existing indices if possible
    useEffect(() => {
        setCustomTitles(prev => {
            const next = {};
            sessionDates.forEach((_, idx) => {
                if (prev[idx]) next[idx] = prev[idx];
            });
            return next;
        });
    }, [sessionDates.length]);

    // Handle session title change
    const handleTitleChange = (idx, val) => {
        setCustomTitles(prev => ({
            ...prev,
            [idx]: val
        }));
    };

    // Format date for display
    const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // Validation
    const isValid = useMemo(() => {
        if (!learnerId) return false;
        if (!time) return false;
        if (numberOfSessions < 1 || numberOfSessions > 52) return false;
        if (!allowNoCredit && learnerCredits !== null && learnerCredits < numberOfSessions) {
            return false;
        }
        return true;
    }, [learnerId, time, numberOfSessions, allowNoCredit, learnerCredits]);

    // Handle submit
    const handleSubmit = async () => {
        if (!isValid) return;

        setError("");

        const dayName = daysOfWeek.find((d) => d.value === Number(dayOfWeek))?.label;
        const timeLabel = timeOptions.find((t) => t.value === time)?.label || time;

        // Confirmation
        const confirmed = await confirmModal(
            `Create ${numberOfSessions} session(s) for ${selectedLearner?.name || selectedLearner?.email}?\n\nEvery ${dayName} at ${timeLabel} starting ${formatDate(sessionDates[0])}`
        );
        if (!confirmed) return;

        try {
            setSaving(true);

            // Prepare ordered list of titles
            const titles = sessionDates.map((_, idx) => customTitles[idx] || title.trim() || "Lesson");

            const payload = {
                learnerId: Number(learnerId),
                teacherId: teacherId ? Number(teacherId) : null,
                dayOfWeek: Number(dayOfWeek),
                time,
                numberOfSessions: Number(numberOfSessions),
                durationMin: Number(durationMin),
                defaultTitle: title.trim() || "Lesson",
                customTitles: titles, // Send array of titles
                allowNoCredit,
            };

            const { data } = await api.post("/admin/sessions/bulk-create", payload);

            toast.success(
                `✅ Created ${data.created} session(s)! Credits: ${data.creditsAfter} remaining`
            );

            // Reset form
            setLearnerId("");
            setTeacherId("");
            setLearnerCredits(null);
            setLearnerSearch("");
            setCustomTitles({});

            onSuccess?.(data);
            onClose?.();
        } catch (err) {
            console.error("Bulk create failed:", err);
            const errData = err?.response?.data;

            if (errData?.error === "insufficient_credits") {
                setError(
                    `Insufficient credits: ${errData.creditsAvailable} available, ${errData.sessionsRequested} needed`
                );
            } else if (errData?.error === "time_conflict") {
                const conflictDates = (errData.conflicts || []).map((c) => c.date).join(", ");
                setError(`Time conflicts on: ${conflictDates}`);
            } else {
                setError(errData?.error || errData?.message || "Failed to create sessions");
            }

            toast.error(errData?.error || errData?.message || "Failed to create sessions");
        } finally {
            setSaving(false);
        }
    };

    // Reset on close
    const handleClose = () => {
        setLearnerId("");
        setTeacherId("");
        setError("");
        setLearnerCredits(null);
        setLearnerSearch("");
        setCustomTitles({});
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div className="bulk-scheduler-overlay" onClick={handleClose} data-lenis-prevent>
            <div className="bulk-scheduler" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
                {/* Header */}
                <div className="bulk-scheduler__header">
                    <div className="bulk-scheduler__title-group">
                        <span className="bulk-scheduler__icon">📅</span>
                        <div>
                            <h2 className="bulk-scheduler__title">Recurring Session Scheduler</h2>
                            <p className="bulk-scheduler__subtitle">
                                Schedule weekly sessions for a learner
                            </p>
                        </div>
                    </div>
                    <button
                        className="bulk-scheduler__close"
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bulk-scheduler__error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Form */}
                <div className="bulk-scheduler__form" data-lenis-prevent>
                    {/* Learner Selection */}
                    <div className="bulk-scheduler__field">
                        <label className="bulk-scheduler__label">
                            Learner <span className="bulk-scheduler__required">*</span>
                        </label>
                        <input
                            type="text"
                            className="bulk-scheduler__search"
                            placeholder="Search learners by name or email..."
                            value={learnerSearch}
                            onChange={(e) => setLearnerSearch(e.target.value)}
                        />
                        <select
                            className="bulk-scheduler__select"
                            value={learnerId}
                            onChange={(e) => setLearnerId(e.target.value)}
                            disabled={loadingLearners}
                        >
                            <option value="">
                                {loadingLearners ? "Loading..." : `-- Select Learner (${learners.length} found) --`}
                            </option>
                            {learners.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name || l.email} ({l.email})
                                </option>
                            ))}
                        </select>
                        {learnerId && (
                            <div className="bulk-scheduler__credits">
                                {loadingCredits ? (
                                    <span>Loading credits...</span>
                                ) : learnerCredits !== null ? (
                                    <span className={learnerCredits < numberOfSessions && !allowNoCredit ? "bulk-scheduler__credits--warning" : ""}>
                                        💳 {learnerCredits} credit(s) remaining
                                        {numberOfSessions > 0 && ` • ${numberOfSessions} session(s) requested`}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Teacher Selection */}
                    <div className="bulk-scheduler__field">
                        <label className="bulk-scheduler__label">Teacher (optional)</label>
                        <select
                            className="bulk-scheduler__select"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            disabled={loadingTeachers}
                        >
                            <option value="">-- No Teacher --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name || t.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Schedule Row */}
                    <div className="bulk-scheduler__row">
                        <div className="bulk-scheduler__field">
                            <label className="bulk-scheduler__label">
                                Day of Week <span className="bulk-scheduler__required">*</span>
                            </label>
                            <select
                                className="bulk-scheduler__select"
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                            >
                                {daysOfWeek.map((day) => (
                                    <option key={day.value} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bulk-scheduler__field">
                            <label className="bulk-scheduler__label">
                                Time <span className="bulk-scheduler__required">*</span>
                            </label>
                            <select
                                className="bulk-scheduler__select"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            >
                                {timeOptions.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bulk-scheduler__field">
                            <label className="bulk-scheduler__label">
                                # of Sessions <span className="bulk-scheduler__required">*</span>
                            </label>
                            <input
                                type="number"
                                className="bulk-scheduler__input"
                                value={numberOfSessions}
                                onChange={(e) => setNumberOfSessions(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
                                min={1}
                                max={52}
                            />
                        </div>
                    </div>

                    {/* Duration & Default Title Row */}
                    <div className="bulk-scheduler__row bulk-scheduler__row--half">
                        <div className="bulk-scheduler__field">
                            <label className="bulk-scheduler__label">Duration</label>
                            <select
                                className="bulk-scheduler__select"
                                value={durationMin}
                                onChange={(e) => setDurationMin(Number(e.target.value))}
                            >
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                            </select>
                        </div>
                        <div className="bulk-scheduler__field">
                            <label className="bulk-scheduler__label">Default Title</label>
                            <input
                                type="text"
                                className="bulk-scheduler__input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Lesson"
                            />
                        </div>
                    </div>

                    {/* Session Preview & Individual Naming */}
                    {numberOfSessions > 0 && (
                        <div className="bulk-scheduler__field bulk-scheduler__field--full">
                            <label className="bulk-scheduler__label">
                                Session Preview & Titles
                                <span className="bulk-scheduler__count">({sessionDates.length} sessions)</span>
                            </label>
                            <div className="bulk-scheduler__preview" data-lenis-prevent>
                                {sessionDates.map((date, idx) => (
                                    <div key={idx} className="bulk-scheduler__preview-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span className="bulk-scheduler__preview-num">{idx + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div className="bulk-scheduler__preview-date">{formatDate(date)}</div>
                                            <div className="bulk-scheduler__preview-time">
                                                {timeOptions.find((t) => t.value === time)?.label || time}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="bulk-scheduler__input"
                                            style={{ width: '60%' }}
                                            placeholder={title || "Lesson"}
                                            value={customTitles[idx] !== undefined ? customTitles[idx] : ""}
                                            onChange={(e) => handleTitleChange(idx, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Allow No Credit Checkbox */}
                    <div className="bulk-scheduler__field bulk-scheduler__field--checkbox">
                        <label className="bulk-scheduler__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowNoCredit}
                                onChange={(e) => setAllowNoCredit(e.target.checked)}
                            />
                            <span>Allow booking even if learner has insufficient credits</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="bulk-scheduler__actions">
                    <button
                        type="button"
                        className="bulk-scheduler__btn bulk-scheduler__btn--secondary"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="bulk-scheduler__btn bulk-scheduler__btn--primary"
                        onClick={handleSubmit}
                        disabled={!isValid || saving}
                    >
                        {saving
                            ? "Creating..."
                            : `Schedule ${numberOfSessions} Session${numberOfSessions !== 1 ? "s" : ""}`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
