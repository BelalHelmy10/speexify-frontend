"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import api, { clearCsrfToken } from "@/lib/api";
import MiniCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import useAuth from "@/hooks/useAuth";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { shiftDateToTimezone } from "@/utils/date";
import { usePathname, useRouter } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";
import { useToast } from "@/components/ToastProvider";

const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const SLOT_START_HOUR = 0;
const SLOT_END_HOUR = 24;
const DEFAULT_SCROLL_START_HOUR = 8;
const SLOT_HEIGHT = 60;
const TIME_GUTTER_WIDTH = 52;

const toRbcEvents = (arr = [], timezone) =>
  arr.map((s) => {
    const type = String(s.type || "").toUpperCase();
    const isGroup = type === "GROUP";
    const cap = typeof s.capacity === "number" ? s.capacity : null;
    const count =
      typeof s.participantCount === "number" ? s.participantCount : null;

    const start = shiftDateToTimezone(s.startAt, timezone);
    const endRaw = s.endAt ? s.endAt : s.startAt;
    const end = shiftDateToTimezone(endRaw, timezone);

    return {
      id: String(s.id),
      title: s.title || "",
      start,
      end,
      status: s.status,
      meetingUrl: s.meetingUrl || "",
      joinUrl: s.joinUrl || "",
      type,
      isGroup,
      capacity: cap,
      participantCount: count,
      seatsLabel:
        isGroup && (count !== null || cap !== null)
          ? `${count ?? 0}${cap ? `/${cap}` : ""}`
          : "",
      _raw: s,
      isAvailability: false,
    };
  });

function getVisibleRange(date, view) {
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  if (view === "day") {
    return { start: startOfDay(date), end: endOfDay(date) };
  }
  return {
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  };
}

function toAvailabilityEventsForRange(slots = [], start, end) {
  const events = [];
  const startDay = startOfDay(start);
  const endDay = endOfDay(end);

  for (
    let cursor = new Date(startDay);
    cursor <= endDay;
    cursor = addDays(cursor, 1)
  ) {
    const dayOfWeek = cursor.getDay();

    slots.forEach((slot) => {
      if (slot.status !== "active") return;

      if (slot.isRecurring && slot.dayOfWeek === dayOfWeek) {
        const [startHour, startMin] = slot.startTime.split(":").map(Number);
        const [endHour, endMin] = slot.endTime.split(":").map(Number);

        const evStart = new Date(cursor);
        evStart.setHours(startHour, startMin, 0, 0);

        const evEnd = new Date(cursor);
        evEnd.setHours(endHour, endMin, 0, 0);

        events.push({
          id: `avail-${slot.id}-${format(cursor, "yyyy-MM-dd")}`,
          slotId: slot.id,
          title: slot.note || "",
          start: evStart,
          end: evEnd,
          isAvailability: true,
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          _raw: slot,
        });
      }

      if (!slot.isRecurring && slot.specificDate) {
        const slotDate = new Date(slot.specificDate);
        if (!isSameDay(slotDate, cursor)) return;

        const [startHour, startMin] = slot.startTime.split(":").map(Number);
        const [endHour, endMin] = slot.endTime.split(":").map(Number);

        const evStart = new Date(cursor);
        evStart.setHours(startHour, startMin, 0, 0);

        const evEnd = new Date(cursor);
        evEnd.setHours(endHour, endMin, 0, 0);

        events.push({
          id: `avail-specific-${slot.id}-${format(cursor, "yyyy-MM-dd")}`,
          slotId: slot.id,
          title: slot.note || "",
          start: evStart,
          end: evEnd,
          isAvailability: true,
          isSpecificDate: true,
          _raw: slot,
        });
      }
    });
  }

  return events;
}

const useCountdown = (startAt, endAt, labels = {}) => {
  const startsIn = labels.startsIn || "Starts in";
  const live = labels.live || "Live";
  const ended = labels.ended || "Ended";

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!startAt) return "";

  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;

  if (now < start) {
    let remaining = Math.max(0, Math.floor((start - now) / 1000));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const mins = Math.floor(remaining / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return `${startsIn} ${parts.join(" ")}`;
  }

  if (now >= start && now <= end) return live;
  return ended;
};

const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

function buildDayLayout(events, dayDate) {
  const dayStart = new Date(dayDate);
  dayStart.setHours(SLOT_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(SLOT_END_HOUR, 0, 0, 0);

  const normalized = events
    .filter((ev) => ev.end > dayStart && ev.start < dayEnd)
    .map((ev) => {
      const clippedStart = ev.start < dayStart ? dayStart : ev.start;
      const clippedEnd = ev.end > dayEnd ? dayEnd : ev.end;
      const startMin = Math.max(
        0,
        differenceInMinutes(clippedStart, dayStart)
      );
      const endMin = Math.min(
        (SLOT_END_HOUR - SLOT_START_HOUR) * 60,
        differenceInMinutes(clippedEnd, dayStart)
      );

      return {
        ...ev,
        startMin,
        endMin: Math.max(startMin + 15, endMin),
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const groups = [];
  normalized.forEach((ev) => {
    const last = groups[groups.length - 1];
    if (!last || ev.startMin >= last.maxEnd) {
      groups.push({ events: [ev], maxEnd: ev.endMin });
    } else {
      last.events.push(ev);
      last.maxEnd = Math.max(last.maxEnd, ev.endMin);
    }
  });

  const laidOut = [];
  groups.forEach((group) => {
    const colsEnd = [];

    group.events.forEach((ev) => {
      let col = colsEnd.findIndex((endMin) => endMin <= ev.startMin);
      if (col === -1) {
        col = colsEnd.length;
        colsEnd.push(ev.endMin);
      } else {
        colsEnd[col] = ev.endMin;
      }
      laidOut.push({ ...ev, col });
    });

    const colCount = Math.max(1, colsEnd.length);
    for (let i = laidOut.length - group.events.length; i < laidOut.length; i++) {
      laidOut[i].colCount = colCount;
    }
  });

  return laidOut;
}

function getEventTone(event) {
  if (event.status === "canceled") return "canceled";
  if (event.status === "live" || canJoin(event.start, event.end)) return "live";
  if (event.isGroup) return "group";
  return "scheduled";
}

function getViewRangeLabel(currentDate, view) {
  if (view === "month") return format(currentDate, "MMMM yyyy");
  if (view === "day") return format(currentDate, "EEEE, MMM d, yyyy");

  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function SessionPopover({ event, onClose, dict, prefix }) {
  const countdown = useCountdown(event.start, event.end, {
    startsIn: t(dict, "countdown_starts_in") || "Starts in",
    live: t(dict, "countdown_live") || "Live",
    ended: t(dict, "countdown_ended") || "Ended",
  });

  const tone = getEventTone(event);
  const coachName =
    event?._raw?.teacher?.name ||
    event?._raw?.teacher?.email ||
    event?._raw?.coach?.name ||
    event?._raw?.coach?.email ||
    "-";
  const duration = Math.max(1, differenceInMinutes(event.end, event.start));
  const joinHref = event.joinUrl || event.meetingUrl;
  const joinable = tone !== "canceled" && joinHref && canJoin(event.start, event.end);

  return createPortal(
    <>
      <div className="calx-popover-backdrop" onClick={onClose} />
      <div className="calx-popover" role="dialog" aria-modal="true">
        <div className="calx-popover__header">
          <div className={`calx-popover__icon calx-popover__icon--${tone}`}>
            {tone === "live" ? "🎙️" : event.isGroup ? "👥" : "📚"}
          </div>
          <div className="calx-popover__head-copy">
            <div className="calx-popover__title">
              {event.title || t(dict, "session_default_title")}
            </div>
            <div className={`calx-popover__type calx-popover__type--${tone}`}>
              {tone === "live" ? "Live" : event.isGroup ? t(dict, "session_group") : "Scheduled"}
              {event.isGroup && event.seatsLabel ? ` · ${event.seatsLabel}` : ""}
            </div>
          </div>
          <button className="calx-popover__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="calx-popover__body">
          <div className="calx-popover__row">
            <span>📅</span>
            <span>{format(event.start, "EEEE, MMM d · h:mm a")}</span>
          </div>
          <div className="calx-popover__row">
            <span>⏱</span>
            <span>{duration} min</span>
          </div>
          <div className="calx-popover__row">
            <span>👤</span>
            <span>{coachName}</span>
          </div>

          <div className={`calx-popover__countdown ${tone === "live" ? "is-live" : ""}`}>
            {countdown}
          </div>
        </div>

        <div className="calx-popover__footer">
          {joinable ? (
            <a
              className="calx-popover__btn calx-popover__btn--primary"
              href={joinHref}
              target="_blank"
              rel="noreferrer"
            >
              Join Session →
            </a>
          ) : (
            <Link
              className="calx-popover__btn calx-popover__btn--primary"
              href={`${prefix}/dashboard/sessions/${event.id}`}
            >
              {t(dict, "go_to_session") || "Go to Session"} →
            </Link>
          )}

          <Link
            className="calx-popover__btn calx-popover__btn--ghost"
            href={`${prefix}/dashboard/sessions/${event.id}`}
          >
            Details
          </Link>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function CalendarPage() {
  const { user, checking } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = useMemo(() => getDictionary(locale, "calendar"), [locale]);

  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [calendarMode, setCalendarMode] = useState("sessions");

  const [events, setEvents] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showAvailabilityHint, setShowAvailabilityHint] = useState(true);

  const [activeEvent, setActiveEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    scheduled: true,
    canceled: true,
    group: true,
    oneOnOne: true,
    availability: true,
  });

  const filtersRef = useRef(null);
  const weekWrapRef = useRef(null);
  const hasAutoScrolledWeekRef = useRef(false);

  const isImpersonating = !!user?._impersonating;

  const fetchAvailability = useCallback(async () => {
    try {
      const { data } = await api.get("/availability");
      setAvailabilitySlots(data || []);
    } catch (e) {
      console.error("Failed to load availability:", e);
    }
  }, []);

  const fetchEvents = useCallback(async (startISO, endISO) => {
    setError("");
    const { data } = await api.get("/me/sessions-between", {
      params: { start: startISO, end: endISO, includeCanceled: true },
    });
    return Array.isArray(data) ? data : data?.sessions || [];
  }, []);

  useEffect(() => {
    if (!checking && user) fetchAvailability();
  }, [checking, user, fetchAvailability]);

  useEffect(() => {
    if (checking || !user) return;

    const { start, end } = getVisibleRange(currentDate, view);
    (async () => {
      try {
        const sessions = await fetchEvents(start.toISOString(), end.toISOString());
        setEvents(toRbcEvents(sessions, user?.timezone));
      } catch (e) {
        setError(e?.response?.data?.error || t(dict, "error_failed"));
      }
    })();
  }, [checking, user, currentDate, view, fetchEvents, dict]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!filtersRef.current) return;
      if (!filtersRef.current.contains(e.target)) setShowFilters(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const close = () => setActiveEvent(null);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, []);

  useEffect(() => {
    if (view !== "week") return;
    if (hasAutoScrolledWeekRef.current) return;
    if (!weekWrapRef.current) return;

    const targetScroll = Math.max(
      0,
      (DEFAULT_SCROLL_START_HOUR - SLOT_START_HOUR) * SLOT_HEIGHT
    );

    requestAnimationFrame(() => {
      if (!weekWrapRef.current) return;
      weekWrapRef.current.scrollTop = targetScroll;
      hasAutoScrolledWeekRef.current = true;
    });
  }, [view]);

  const isSessionVisible = useCallback(
    (event) => {
      const isCanceled = event.status === "canceled";
      if (isCanceled && !filters.canceled) return false;
      if (!isCanceled && !filters.scheduled) return false;
      if (event.isGroup && !filters.group) return false;
      if (!event.isGroup && !filters.oneOnOne) return false;
      return true;
    },
    [filters]
  );

  const { rangeStart, rangeEnd } = useMemo(
    () => getVisibleRange(currentDate, view),
    [currentDate, view]
  );

  const filteredSessions = useMemo(
    () => events.filter(isSessionVisible),
    [events, isSessionVisible]
  );

  const allAvailabilityEvents = useMemo(
    () => toAvailabilityEventsForRange(availabilitySlots, rangeStart, rangeEnd),
    [availabilitySlots, rangeStart, rangeEnd]
  );

  const filteredAvailabilityEvents = useMemo(() => {
    if (!filters.availability) return [];
    return allAvailabilityEvents;
  }, [allAvailabilityEvents, filters.availability]);

  const combinedEvents = useMemo(() => {
    return [...filteredSessions, ...filteredAvailabilityEvents];
  }, [filteredSessions, filteredAvailabilityEvents]);

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekSessions = useMemo(
    () =>
      filteredSessions.filter(
        (ev) => ev.end > weekStart && ev.start < addDays(weekStart, 7)
      ),
    [filteredSessions, weekStart]
  );

  const weekAvailability = useMemo(
    () =>
      toAvailabilityEventsForRange(
        availabilitySlots,
        weekStart,
        addDays(weekStart, 6)
      ).filter(() => filters.availability),
    [availabilitySlots, weekStart, filters.availability]
  );

  const timeLabels = useMemo(
    () =>
      Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR }, (_, i) => {
        const hour = SLOT_START_HOUR + i;
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        return format(date, "h a");
      }),
    []
  );

  const sessionsByDayLayout = useMemo(() => {
    return weekDays.map((day) => {
      const dayEvents = weekSessions.filter((ev) => isSameDay(ev.start, day));
      return buildDayLayout(dayEvents, day);
    });
  }, [weekDays, weekSessions]);

  const availabilityByDayLayout = useMemo(() => {
    return weekDays.map((day) => {
      const dayEvents = weekAvailability.filter((ev) => isSameDay(ev.start, day));
      return buildDayLayout(dayEvents, day);
    });
  }, [weekDays, weekAvailability]);

  const hasDateEvents = useCallback(
    (date) => {
      return combinedEvents.some((ev) => isSameDay(ev.start, date));
    },
    [combinedEvents]
  );

  const upcomingEvents = useMemo(() => {
    const inRange = filteredSessions
      .filter((ev) => ev.start >= rangeStart && ev.start <= rangeEnd)
      .sort((a, b) => a.start - b.start);

    if (inRange.length > 0) return inRange.slice(0, 4);

    const now = Date.now();
    return filteredSessions
      .filter((ev) => ev.end.getTime() >= now)
      .sort((a, b) => a.start - b.start)
      .slice(0, 4);
  }, [filteredSessions, rangeStart, rangeEnd]);

  const weekSessionCount = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    return filteredSessions.filter((ev) => ev.end > weekStart && ev.start < weekEnd)
      .length;
  }, [filteredSessions, weekStart]);

  const activeSlotCount = useMemo(
    () => availabilitySlots.filter((slot) => slot.status === "active").length,
    [availabilitySlots]
  );

  const totalAvailabilityHours = useMemo(() => {
    let minutes = 0;
    availabilitySlots.forEach((slot) => {
      if (slot.status !== "active") return;
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      minutes += endH * 60 + endM - (startH * 60 + startM);
    });
    return (minutes / 60).toFixed(1);
  }, [availabilitySlots]);

  const addAvailabilitySlot = useCallback(
    async (dayOfWeek, startTime, endTime) => {
      try {
        setSavingAvailability(true);
        await api.post("/availability", {
          dayOfWeek,
          startTime,
          endTime,
          isRecurring: true,
        });
        toast.success(t(dict, "success_add"));
        await fetchAvailability();
      } catch (e) {
        toast.error(e?.response?.data?.error || t(dict, "error_add"));
      } finally {
        setSavingAvailability(false);
      }
    },
    [dict, fetchAvailability, toast]
  );

  const deleteAvailabilitySlot = useCallback(
    async (slotId) => {
      try {
        setSavingAvailability(true);
        await api.delete(`/availability/${slotId}`);
        toast.success(t(dict, "success_remove"));
        await fetchAvailability();
      } catch (e) {
        toast.error(e?.response?.data?.error || t(dict, "error_remove"));
      } finally {
        setSavingAvailability(false);
      }
    },
    [dict, fetchAvailability, toast]
  );

  const clearDayAvailability = useCallback(
    async (dayOfWeek) => {
      if (!confirm(t(dict, "confirm_clear_day"))) return;
      try {
        setSavingAvailability(true);
        await api.delete("/availability", {
          params: { dayOfWeek, isRecurring: true },
        });
        toast.success(t(dict, "success_clear"));
        await fetchAvailability();
      } catch (e) {
        toast.error(e?.response?.data?.error || t(dict, "error_clear"));
      } finally {
        setSavingAvailability(false);
      }
    },
    [dict, fetchAvailability, toast]
  );

  const clearAllAvailability = useCallback(async () => {
    if (!confirm(t(dict, "confirm_clear_all"))) return;
    try {
      setSavingAvailability(true);
      await api.delete("/availability");
      toast.success(t(dict, "success_clear_all"));
      await fetchAvailability();
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_clear"));
    } finally {
      setSavingAvailability(false);
    }
  }, [dict, fetchAvailability, toast]);

  const toggleWeekCellAvailability = useCallback(
    (dayDate, hour) => {
      if (calendarMode !== "availability" || savingAvailability) return;

      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime =
        hour === SLOT_END_HOUR - 1
          ? "23:59"
          : `${String(hour + 1).padStart(2, "0")}:00`;
      const dayOfWeek = dayDate.getDay();

      const existing = availabilitySlots.find(
        (slot) =>
          slot.status === "active" &&
          slot.isRecurring &&
          slot.dayOfWeek === dayOfWeek &&
          slot.startTime === startTime &&
          slot.endTime === endTime
      );

      if (existing) {
        deleteAvailabilitySlot(existing.id);
      } else {
        addAvailabilitySlot(dayOfWeek, startTime, endTime);
      }
    },
    [
      calendarMode,
      savingAvailability,
      availabilitySlots,
      addAvailabilitySlot,
      deleteAvailabilitySlot,
    ]
  );

  const handleNavigate = useCallback(
    (dir) => {
      if (dir === "today") {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
        return;
      }

      if (view === "month") {
        setCurrentDate((prev) => (dir === "next" ? addMonths(prev, 1) : subMonths(prev, 1)));
        return;
      }

      if (view === "day") {
        setCurrentDate((prev) => (dir === "next" ? addDays(prev, 1) : addDays(prev, -1)));
        return;
      }

      setCurrentDate((prev) => (dir === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    },
    [view]
  );

  const handleWeekViewportWheel = useCallback((e) => {
    const el = weekWrapRef.current;
    if (!el) return;

    const delta = e.deltaY;
    if (!delta) return;

    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      // Scroll-chain to page once the calendar viewport reached an edge.
      window.scrollBy({ top: delta, behavior: "auto" });
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    el.scrollTop += delta;
  }, []);

  const onMiniChange = useCallback((date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  }, []);

  const handleStopImpersonate = useCallback(async () => {
    try {
      await api.post("/admin/impersonate/stop");
      clearCsrfToken();
      toast.success("Stopped viewing as user");
      router.push("/admin");
      setTimeout(() => window.location.reload(), 100);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to stop impersonation");
    }
  }, [router, toast]);

  const handleSelectRbcSlot = useCallback(
    ({ start, end }) => {
      if (calendarMode !== "availability") return;
      if (savingAvailability) return;

      const dayOfWeek = start.getDay();
      const startTime = format(start, "HH:mm");
      let endTime = format(end, "HH:mm");

      if (
        endTime === "00:00" &&
        format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd")
      ) {
        endTime = "23:59";
      }

      addAvailabilitySlot(dayOfWeek, startTime, endTime);
    },
    [calendarMode, savingAvailability, addAvailabilitySlot]
  );

  const handleSelectRbcEvent = useCallback(
    (event) => {
      if (event.isAvailability) {
        if (calendarMode === "availability" && event.slotId) {
          if (confirm(t(dict, "confirm_delete_slot"))) {
            deleteAvailabilitySlot(event.slotId);
          }
        }
        return;
      }
      setActiveEvent(event);
    },
    [calendarMode, deleteAvailabilitySlot, dict]
  );

  const eventPropGetter = useCallback(
    (event) => {
      if (event.isAvailability) {
        return {
          className: `calx-rbc-event calx-rbc-event--availability ${calendarMode === "availability" ? "is-active" : "is-faded"
            }`,
        };
      }
      const tone = getEventTone(event);
      return {
        className: `calx-rbc-event calx-rbc-event--${tone} ${calendarMode === "availability" ? "is-dimmed" : ""
          }`,
      };
    },
    [calendarMode]
  );

  const rbcEventComponent = useCallback(
    ({ event }) => (
      <div className="calx-rbc-pill">
        {event.isAvailability ? (
          <>
            <span>✓</span>
            <span>{t(dict, "available")}</span>
          </>
        ) : (
          <>
            <span>●</span>
            <span>{event.title || t(dict, "session_default_title")}</span>
          </>
        )}
      </div>
    ),
    [dict]
  );

  const rbcComponents = useMemo(() => ({ event: rbcEventComponent }), [rbcEventComponent]);

  if (checking) {
    return <div className="calx-state">{t(dict, "loading")}</div>;
  }

  if (!user) {
    return <div className="calx-state">{t(dict, "not_auth")}</div>;
  }

  return (
    <div className="calx-page">
      {isImpersonating && (
        <div className="calx-impersonate-bar">
          <span>
            👁️ <strong>Viewing as: {user?.name || user?.email}</strong>
          </span>
          <Link href={`${prefix}/dashboard`} className="calx-impersonate-link">
            📊 View Dashboard
          </Link>
          <button className="calx-impersonate-stop" onClick={handleStopImpersonate}>
            ✕ Stop Impersonating
          </button>
        </div>
      )}

      <div className="calx-shell">
        <aside className="calx-sidebar">
          <div>
            <div className="calx-sidebar-label">{t(dict, "quick_nav") || "Quick Nav"}</div>
            <MiniCalendar
              value={selectedDate}
              onChange={onMiniChange}
              showNeighboringMonth={true}
              next2Label={null}
              prev2Label={null}
              className="calx-mini-cal"
              tileClassName={({ date, view: miniView }) => {
                if (miniView !== "month") return "";
                const classes = [];
                if (isSameDay(date, new Date())) classes.push("is-today");
                if (isSameDay(date, selectedDate)) classes.push("is-selected");
                if (hasDateEvents(date)) classes.push("has-event");
                return classes.join(" ");
              }}
            />
          </div>

          <div>
            <div className="calx-sidebar-label">View Mode</div>
            <div className="calx-mode-toggle">
              <button
                className={`calx-mode-btn ${calendarMode === "sessions" ? "is-active" : ""}`}
                onClick={() => setCalendarMode("sessions")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect x="3" y="6" width="18" height="15" rx="4" fill="currentColor" fillOpacity="0.15" />
                  <rect x="3" y="6" width="18" height="15" rx="4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M3 11H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="7" y="14" width="4" height="3" rx="1" fill="currentColor" />
                  <rect x="13" y="14" width="4" height="3" rx="1" fill="currentColor" fillOpacity="0.4" />
                </svg>
                {t(dict, "mode_sessions") || "Sessions"}
              </button>
              <button
                className={`calx-mode-btn ${calendarMode === "availability" ? "is-active-green" : ""}`}
                onClick={() => setCalendarMode("availability")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 7V12L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                {t(dict, "mode_availability") || "Availability"}
                <span className="calx-mode-count">{activeSlotCount}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="calx-sidebar-label">This Week</div>
            <div className="calx-stats-card">
              <div className="calx-stat">
                <div className="calx-stat__value is-primary">{weekSessionCount}</div>
                <div className="calx-stat__label">Sessions</div>
              </div>
              <div className="calx-stat">
                <div className="calx-stat__value is-green">{activeSlotCount}</div>
                <div className="calx-stat__label">{t(dict, "slots")}</div>
              </div>
              <div className="calx-stat">
                <div className="calx-stat__value">{totalAvailabilityHours}h</div>
                <div className="calx-stat__label">{t(dict, "weekly")}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="calx-sidebar-label">Upcoming</div>
            <div className="calx-upcoming-list">
              {upcomingEvents.length === 0 ? (
                <div className="calx-empty-small">{t(dict, "empty")}</div>
              ) : (
                upcomingEvents.map((ev) => (
                  <button
                    key={`upcoming-${ev.id}-${ev.start.toISOString()}`}
                    className="calx-upcoming-item"
                    onClick={() => setActiveEvent(ev)}
                  >
                    <span className={`calx-upcoming-dot is-${getEventTone(ev)}`} />
                    <span className="calx-upcoming-copy">
                      <span className="calx-upcoming-title">
                        {ev.title || t(dict, "session_default_title")}
                      </span>
                      <span className="calx-upcoming-time">
                        {format(ev.start, "EEE · h:mm a")}
                        {ev.end ? ` - ${format(ev.end, "h:mm a")}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="calx-sidebar-cta">
            <div className="calx-sidebar-cta__title">Book a Session</div>
            <div className="calx-sidebar-cta__sub">
              Your next coaching session is one click away.
            </div>
            <Link className="calx-sidebar-cta__btn" href={`${prefix}/packages`}>
              + Book Now
            </Link>
          </div>
        </aside>

        <main className="calx-main">
          <div className="calx-toolbar">
            <div className="calx-toolbar-nav">
              <button className="calx-today-btn" onClick={() => handleNavigate("today")}>
                Today
              </button>
              <button className="calx-nav-btn" onClick={() => handleNavigate("prev")}>‹</button>
              <button className="calx-nav-btn" onClick={() => handleNavigate("next")}>›</button>
            </div>

            <div className="calx-toolbar-range">{getViewRangeLabel(currentDate, view)}</div>

            <div className="calx-view-tabs">
              <button
                className={`calx-view-tab ${view === "week" ? "is-active" : ""}`}
                onClick={() => setView("week")}
              >
                Week
              </button>
              <button
                className={`calx-view-tab ${view === "month" ? "is-active" : ""}`}
                onClick={() => setView("month")}
              >
                Month
              </button>
              <button
                className={`calx-view-tab ${view === "day" ? "is-active" : ""}`}
                onClick={() => setView("day")}
              >
                Day
              </button>
            </div>

            <div className="calx-filters" ref={filtersRef}>
              <button
                className="calx-filter-btn"
                onClick={() => setShowFilters((v) => !v)}
              >
                ⚙ Filter
              </button>

              {showFilters && (
                <div className="calx-filter-menu">
                  {[
                    ["scheduled", "Scheduled"],
                    ["canceled", "Canceled"],
                    ["group", "Group"],
                    ["oneOnOne", "1:1"],
                    ["availability", "Availability"],
                  ].map(([key, label]) => (
                    <label key={key} className="calx-filter-item">
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {calendarMode === "availability" && showAvailabilityHint && (
            <div className="calx-availability-banner">
              <span className="calx-availability-banner__icon">💡</span>
              <span className="calx-availability-banner__text">
                <strong>{t(dict, "instructions_title") || "Availability Editing Mode"}:</strong>{" "}
                {t(dict, "instructions_click") ||
                  "Click any cell to toggle one-hour availability. Click green blocks to remove."}
              </span>
              <button
                className="calx-availability-banner__close"
                onClick={() => setShowAvailabilityHint(false)}
              >
                ✕
              </button>
            </div>
          )}

          {error && <div className="calx-error-banner">⚠️ {error}</div>}

          {view === "week" ? (
            <div
              className="calx-week-wrap"
              ref={weekWrapRef}
              data-lenis-prevent
              onWheel={handleWeekViewportWheel}
            >
              <div className="calx-week-grid">
                <div className="calx-week-header">
                  <div className="calx-week-header-time" />
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const isSel = isSameDay(day, selectedDate);
                    return (
                      <button
                        key={`hdr-${day.toISOString()}`}
                        className="calx-week-header-day"
                        onClick={() => {
                          setSelectedDate(day);
                          setCurrentDate(day);
                        }}
                      >
                        <div className="calx-week-header-dow">{format(day, "EEE")}</div>
                        <div
                          className={`calx-week-header-num ${isToday ? "is-today" : ""} ${!isToday && isSel ? "is-selected" : ""
                            }`}
                        >
                          {format(day, "d")}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="calx-week-body" style={{ minHeight: (SLOT_END_HOUR - SLOT_START_HOUR) * SLOT_HEIGHT }}>
                  <div className="calx-week-time-col">
                    {timeLabels.map((label) => (
                      <div key={`t-${label}`} className="calx-week-time-slot">
                        <span className="calx-week-time-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIdx) => {
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={`day-${day.toISOString()}`}
                        className={`calx-week-day-col ${isToday ? "is-today" : ""} ${calendarMode === "availability" ? "is-availability" : ""
                          }`}
                      >
                        {timeLabels.map((_, rowIdx) => {
                          const hour = SLOT_START_HOUR + rowIdx;
                          return (
                            <button
                              key={`cell-${day.toISOString()}-${hour}`}
                              className={`calx-week-cell ${calendarMode === "availability" ? "is-clickable" : ""
                                }`}
                              onClick={() => toggleWeekCellAvailability(day, hour)}
                              disabled={calendarMode !== "availability" || savingAvailability}
                              aria-label={`Slot ${format(day, "EEEE")} ${hour}:00`}
                            />
                          );
                        })}

                        {filters.availability &&
                          availabilityByDayLayout[dayIdx]?.map((ev) => {
                            const top = (ev.startMin / 60) * SLOT_HEIGHT + 2;
                            const height = Math.max(24, ((ev.endMin - ev.startMin) / 60) * SLOT_HEIGHT - 4);
                            const widthPct = 100 / (ev.colCount || 1);
                            const leftPct = widthPct * (ev.col || 0);

                            return (
                              <button
                                key={ev.id}
                                className={`calx-avail-block is-visible ${calendarMode !== "availability" ? "is-passive" : ""
                                  }`}
                                style={{
                                  top,
                                  height,
                                  left: `calc(${leftPct}% + 4px)`,
                                  width: `calc(${widthPct}% - 8px)`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (calendarMode === "availability" && ev.slotId) {
                                    if (confirm(t(dict, "confirm_delete_slot"))) {
                                      deleteAvailabilitySlot(ev.slotId);
                                    }
                                  }
                                }}
                              >
                                ✓ {t(dict, "available")}
                              </button>
                            );
                          })}

                        {sessionsByDayLayout[dayIdx]?.map((ev) => {
                          const top = (ev.startMin / 60) * SLOT_HEIGHT + 2;
                          const height = Math.max(28, ((ev.endMin - ev.startMin) / 60) * SLOT_HEIGHT - 4);
                          const widthPct = 100 / (ev.colCount || 1);
                          const leftPct = widthPct * (ev.col || 0);
                          const tone = getEventTone(ev);

                          return (
                            <button
                              key={`sess-${ev.id}-${ev.start.toISOString()}`}
                              className={`calx-ev-pill is-${tone} ${calendarMode === "availability" ? "is-dimmed" : ""
                                }`}
                              style={{
                                top,
                                height,
                                left: `calc(${leftPct}% + 4px)`,
                                width: `calc(${widthPct}% - 8px)`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveEvent(ev);
                              }}
                            >
                              <span className="calx-ev-dot" />
                              <span className="calx-ev-copy">
                                <span className="calx-ev-title">
                                  {ev.title || t(dict, "session_default_title")}
                                </span>
                                <span className="calx-ev-sub">
                                  {format(ev.start, "h:mm a")}
                                  {ev.isGroup ? ` · ${t(dict, "session_group")}` : ""}
                                  {ev.isGroup && ev.seatsLabel ? ` · ${ev.seatsLabel}` : ""}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {savingAvailability && (
                <div className="calx-saving-overlay">
                  <span className="calx-saving-spinner" />
                  <span>{t(dict, "saving")}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="calx-rbc-panel">
              <BigCalendar
                localizer={localizer}
                date={currentDate}
                view={view}
                onView={(nextView) => setView(nextView)}
                onNavigate={(nextDate) => {
                  setCurrentDate(nextDate);
                  setSelectedDate(nextDate);
                }}
                onSelectEvent={handleSelectRbcEvent}
                onSelectSlot={handleSelectRbcSlot}
                selectable={calendarMode === "availability"}
                events={combinedEvents}
                startAccessor="start"
                endAccessor="end"
                components={rbcComponents}
                eventPropGetter={eventPropGetter}
                views={["month", "day"]}
                toolbar={false}
                step={30}
                timeslots={2}
                style={{ height: 760 }}
              />

              {savingAvailability && (
                <div className="calx-saving-overlay">
                  <span className="calx-saving-spinner" />
                  <span>{t(dict, "saving")}</span>
                </div>
              )}
            </div>
          )}

          {calendarMode === "availability" && (
            <div className="calx-availability-actions">
              <button
                className="calx-availability-action"
                disabled={savingAvailability}
                onClick={() => clearDayAvailability(selectedDate.getDay())}
              >
                Clear Selected Day
              </button>
              <button
                className="calx-availability-action is-danger"
                disabled={savingAvailability || activeSlotCount === 0}
                onClick={clearAllAvailability}
              >
                {t(dict, "clear_all")}
              </button>
            </div>
          )}
        </main>
      </div>

      {activeEvent && (
        <SessionPopover
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
          dict={dict}
          prefix={prefix}
        />
      )}
    </div>
  );
}
