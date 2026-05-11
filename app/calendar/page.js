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
import {
  Ban,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  PanelRightOpen,
  Plus,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

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
const DRAG_STEP_MINUTES = 15;
const DRAG_START_THRESHOLD_PX = 4;
const DRAFT_SLOT_PREFIX = "draft-slot-";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getSnappedMinuteFromPointer(clientY, columnEl) {
  const rect = columnEl.getBoundingClientRect();
  const y = clamp(clientY - rect.top, 0, (SLOT_END_HOUR - SLOT_START_HOUR) * SLOT_HEIGHT);
  const rawMinute = SLOT_START_HOUR * 60 + (y / SLOT_HEIGHT) * 60;
  return clamp(
    Math.round(rawMinute / DRAG_STEP_MINUTES) * DRAG_STEP_MINUTES,
    SLOT_START_HOUR * 60,
    SLOT_END_HOUR * 60
  );
}

function getDragSelectionBounds(anchorMinute, currentMinute) {
  let startMinute = Math.min(anchorMinute, currentMinute);
  let endMinute = Math.max(anchorMinute, currentMinute);

  if (startMinute === endMinute) {
    endMinute = Math.min(endMinute + DRAG_STEP_MINUTES, SLOT_END_HOUR * 60);
    if (startMinute === endMinute) {
      startMinute = Math.max(SLOT_START_HOUR * 60, startMinute - DRAG_STEP_MINUTES);
    }
  }

  return { startMinute, endMinute };
}

function formatAvailabilityTime(totalMinutes) {
  if (totalMinutes >= 24 * 60) return "23:59";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatMinuteLabel(totalMinutes) {
  const date = new Date();
  date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return format(date, "h:mm a");
}

function timeToMinutesValue(time = "00:00") {
  const [hours = 0, minutes = 0] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function cloneAvailabilitySlots(slots = []) {
  return slots.map((slot) => ({ ...slot }));
}

function isDraftAvailabilitySlot(slot) {
  return String(slot?.id || "").startsWith(DRAFT_SLOT_PREFIX);
}

function createDraftAvailabilitySlot(dayOfWeek, startTime, endTime) {
  return {
    id: `${DRAFT_SLOT_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
    dayOfWeek,
    startTime,
    endTime,
    isRecurring: true,
    status: "active",
  };
}

function normalizeAvailabilitySlots(slots = []) {
  const recurringByDay = new Map();
  const otherSlots = [];

  slots.forEach((slot) => {
    if (!slot || slot.status === "inactive") return;

    if (!slot.isRecurring || slot.dayOfWeek === null || slot.dayOfWeek === undefined) {
      otherSlots.push({ ...slot });
      return;
    }

    const daySlots = recurringByDay.get(slot.dayOfWeek) || [];
    daySlots.push({ ...slot, dayOfWeek: Number(slot.dayOfWeek), status: "active" });
    recurringByDay.set(slot.dayOfWeek, daySlots);
  });

  const merged = [];

  Array.from(recurringByDay.keys())
    .sort((a, b) => a - b)
    .forEach((dayOfWeek) => {
      const daySlots = recurringByDay
        .get(dayOfWeek)
        .sort(
          (a, b) =>
            timeToMinutesValue(a.startTime) - timeToMinutesValue(b.startTime) ||
            timeToMinutesValue(a.endTime) - timeToMinutesValue(b.endTime)
        );

      daySlots.forEach((slot) => {
        const last = merged[merged.length - 1];
        const slotStart = timeToMinutesValue(slot.startTime);
        const slotEnd = timeToMinutesValue(slot.endTime);

        if (
          last &&
          last.isRecurring &&
          Number(last.dayOfWeek) === Number(dayOfWeek) &&
          slotStart <= timeToMinutesValue(last.endTime)
        ) {
          const mergedEnd = Math.max(timeToMinutesValue(last.endTime), slotEnd);
          last.endTime = formatAvailabilityTime(mergedEnd);
          return;
        }

        merged.push({ ...slot });
      });
    });

  return [...merged, ...otherSlots];
}

function getAvailabilitySignature(slots = []) {
  return normalizeAvailabilitySlots(slots)
    .map((slot) =>
      [
        slot.id,
        slot.dayOfWeek ?? "",
        slot.specificDate ?? "",
        slot.startTime,
        slot.endTime,
        slot.isRecurring ? "1" : "0",
        slot.status || "active",
        slot.note || "",
      ].join("|")
    )
    .sort()
    .join(";");
}

function getAvailabilityPayload(slot) {
  return {
    dayOfWeek: slot.isRecurring ? Number(slot.dayOfWeek) : undefined,
    specificDate: slot.specificDate || undefined,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isRecurring: slot.isRecurring !== false,
    note: slot.note || undefined,
  };
}

function availabilitySlotChangedTimeOrNote(before, after) {
  return (
    before.startTime !== after.startTime ||
    before.endTime !== after.endTime ||
    (before.note || "") !== (after.note || "")
  );
}

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

function getSessionCoachName(event) {
  return (
    event?._raw?.teacher?.name ||
    event?._raw?.teacher?.email ||
    event?._raw?.coach?.name ||
    event?._raw?.coach?.email ||
    "-"
  );
}

function getSessionTypeLabel(event, tone, dict) {
  if (tone === "live") return "Live";
  if (tone === "canceled") return "Canceled";
  return event.isGroup ? t(dict, "session_group") : "Scheduled";
}

function getSessionDetailsHref(prefix, event) {
  return `${prefix}/dashboard/sessions/${event.id}`;
}

function getSessionJoinHref(event) {
  return event.joinUrl || event.meetingUrl || "";
}

function getAnchoredPopoverStyle(anchor) {
  if (!anchor || typeof window === "undefined") {
    return { left: "50%", top: "50%" };
  }

  const width = 340;
  const estimatedHeight = 318;
  const gap = 10;
  const viewportPadding = 14;
  const centerX = anchor.left + anchor.width / 2;
  const left = clamp(
    centerX - width / 2,
    viewportPadding,
    window.innerWidth - width - viewportPadding
  );
  const placeAbove =
    anchor.bottom + gap + estimatedHeight > window.innerHeight &&
    anchor.top - gap - estimatedHeight > viewportPadding;
  const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
  const preferredTop = placeAbove
    ? anchor.top - gap - estimatedHeight
    : anchor.bottom + gap;
  const top = clamp(preferredTop, viewportPadding, maxTop);

  return { left, top };
}

function SessionQuickPopover({
  event,
  anchor,
  onClose,
  onOpenDrawer,
  onCopyLink,
  dict,
  prefix,
}) {
  const countdown = useCountdown(event.start, event.end, {
    startsIn: t(dict, "countdown_starts_in") || "Starts in",
    live: t(dict, "countdown_live") || "Live",
    ended: t(dict, "countdown_ended") || "Ended",
  });

  const tone = getEventTone(event);
  const coachName = getSessionCoachName(event);
  const duration = Math.max(1, differenceInMinutes(event.end, event.start));
  const joinHref = getSessionJoinHref(event);
  const joinable = tone !== "canceled" && joinHref && canJoin(event.start, event.end);
  const detailHref = getSessionDetailsHref(prefix, event);
  const style = getAnchoredPopoverStyle(anchor);

  return createPortal(
    <>
      <button
        type="button"
        className="calx-event-popover-scrim"
        aria-label="Close session preview"
        onClick={onClose}
      />
      <div className="calx-event-popover" role="dialog" style={style}>
        <div className="calx-event-popover__header">
          <div className={`calx-event-popover__mark is-${tone}`} />
          <div className="calx-event-popover__head-copy">
            <div className="calx-event-popover__title">
              {event.title || t(dict, "session_default_title")}
            </div>
            <div className={`calx-event-popover__type is-${tone}`}>
              {getSessionTypeLabel(event, tone, dict)}
              {event.isGroup && event.seatsLabel ? ` · ${event.seatsLabel}` : ""}
            </div>
          </div>
          <button className="calx-event-popover__close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="calx-event-popover__body">
          <div className="calx-event-popover__row">
            <CalendarDays size={15} />
            <span>{format(event.start, "EEEE, MMM d · h:mm a")}</span>
          </div>
          <div className="calx-event-popover__row">
            <Clock3 size={15} />
            <span>{duration} min</span>
          </div>
          <div className="calx-event-popover__row">
            <UserRound size={15} />
            <span>{coachName}</span>
          </div>

          <div className={`calx-event-popover__countdown ${tone === "live" ? "is-live" : ""}`}>
            {countdown}
          </div>
        </div>

        <div className="calx-event-popover__footer">
          {joinable ? (
            <a
              className="calx-event-popover__btn is-primary"
              href={joinHref}
              target="_blank"
              rel="noreferrer"
            >
              Join <ExternalLink size={14} />
            </a>
          ) : (
            <Link
              className="calx-event-popover__btn is-primary"
              href={detailHref}
            >
              Open <ExternalLink size={14} />
            </Link>
          )}

          <button
            className="calx-event-popover__btn"
            onClick={() => onOpenDrawer(event)}
          >
            Details <PanelRightOpen size={14} />
          </button>

          <button
            className="calx-event-popover__btn is-icon"
            onClick={() => onCopyLink(event)}
            aria-label="Copy session link"
          >
            <Copy size={15} />
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

function SessionDetailDrawer({
  event,
  onClose,
  onCopyLink,
  onCancelSession,
  canceling,
  dict,
  prefix,
}) {
  const countdown = useCountdown(event.start, event.end, {
    startsIn: t(dict, "countdown_starts_in") || "Starts in",
    live: t(dict, "countdown_live") || "Live",
    ended: t(dict, "countdown_ended") || "Ended",
  });
  const tone = getEventTone(event);
  const coachName = getSessionCoachName(event);
  const duration = Math.max(1, differenceInMinutes(event.end, event.start));
  const joinHref = getSessionJoinHref(event);
  const detailHref = getSessionDetailsHref(prefix, event);
  const joinable = tone !== "canceled" && joinHref && canJoin(event.start, event.end);
  const canCancelSession = event.status !== "canceled" && event.start > new Date();

  return createPortal(
    <>
      <button
        type="button"
        className="calx-session-drawer-backdrop"
        aria-label="Close session details"
        onClick={onClose}
      />
      <aside className="calx-session-drawer" role="dialog" aria-modal="true">
        <div className="calx-session-drawer__header">
          <div>
            <div className={`calx-session-drawer__type is-${tone}`}>
              {getSessionTypeLabel(event, tone, dict)}
              {event.isGroup && event.seatsLabel ? ` · ${event.seatsLabel}` : ""}
            </div>
            <h2>{event.title || t(dict, "session_default_title")}</h2>
          </div>
          <button className="calx-session-drawer__close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="calx-session-drawer__countdown">{countdown}</div>

        <div className="calx-session-drawer__details">
          <div className="calx-session-drawer__detail">
            <CalendarDays size={17} />
            <span>{format(event.start, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="calx-session-drawer__detail">
            <Clock3 size={17} />
            <span>
              {format(event.start, "h:mm a")}
              {event.end ? ` - ${format(event.end, "h:mm a")}` : ""} · {duration} min
            </span>
          </div>
          <div className="calx-session-drawer__detail">
            <UserRound size={17} />
            <span>{coachName}</span>
          </div>
          <div className="calx-session-drawer__detail">
            <CalendarClock size={17} />
            <span>{event.isGroup ? t(dict, "session_group") : "1:1 session"}</span>
          </div>
        </div>

        <div className="calx-session-drawer__actions">
          {joinable ? (
            <a
              className="calx-session-drawer__action is-primary"
              href={joinHref}
              target="_blank"
              rel="noreferrer"
            >
              Join Session <ExternalLink size={15} />
            </a>
          ) : (
            <Link className="calx-session-drawer__action is-primary" href={detailHref}>
              Open Details <ExternalLink size={15} />
            </Link>
          )}

          <Link className="calx-session-drawer__action" href={detailHref}>
            Details
          </Link>
          <Link className="calx-session-drawer__action" href={detailHref}>
            Reschedule
          </Link>
          <button className="calx-session-drawer__action" onClick={() => onCopyLink(event)}>
            Copy link <Copy size={15} />
          </button>
          <button
            className="calx-session-drawer__action is-danger"
            disabled={!canCancelSession || canceling}
            onClick={() => onCancelSession(event)}
            title={canCancelSession ? "Cancel session" : "This session cannot be canceled"}
          >
            {canceling ? "Canceling..." : "Cancel"} <Ban size={15} />
          </button>
        </div>
      </aside>
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
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [calendarMode, setCalendarMode] = useState("sessions");

  const [events, setEvents] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityBaseline, setAvailabilityBaseline] = useState([]);
  const [availabilityUndoStack, setAvailabilityUndoStack] = useState([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showAvailabilityHint, setShowAvailabilityHint] = useState(true);
  const [dragSelection, setDragSelection] = useState(null);
  const [slotInteractionPreview, setSlotInteractionPreview] = useState(null);

  const [activeEvent, setActiveEvent] = useState(null);
  const [activeEventAnchor, setActiveEventAnchor] = useState(null);
  const [drawerEvent, setDrawerEvent] = useState(null);
  const [cancelingSessionId, setCancelingSessionId] = useState(null);
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
  const dragSelectionRef = useRef(null);
  const slotInteractionRef = useRef(null);
  const suppressWeekCellClickRef = useRef(false);
  const suppressAvailabilityBlockClickRef = useRef(false);

  const isImpersonating = !!user?._impersonating;

  const fetchAvailability = useCallback(async () => {
    try {
      const { data } = await api.get("/availability");
      const normalized = normalizeAvailabilitySlots(data || []);
      setAvailabilityBaseline(cloneAvailabilitySlots(normalized));
      setAvailabilitySlots(cloneAvailabilitySlots(normalized));
      setAvailabilityUndoStack([]);
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
    const close = () => {
      setActiveEvent(null);
      setActiveEventAnchor(null);
    };
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setActiveEvent(null);
      setActiveEventAnchor(null);
      setDrawerEvent(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
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

  const currentTimeTop = useMemo(() => {
    const minutesFromDayStart = now.getHours() * 60 + now.getMinutes();
    return ((minutesFromDayStart / 60) - SLOT_START_HOUR) * SLOT_HEIGHT;
  }, [now]);

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

  const availabilityChangeCount = useMemo(() => {
    const baselineSignature = getAvailabilitySignature(availabilityBaseline);
    const draftSignature = getAvailabilitySignature(availabilitySlots);
    return baselineSignature === draftSignature ? 0 : 1;
  }, [availabilityBaseline, availabilitySlots]);

  const hasAvailabilityChanges = availabilityChangeCount > 0;

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

  const updateAvailabilityDraft = useCallback((updater) => {
    setAvailabilitySlots((prev) => {
      const nextRaw = typeof updater === "function" ? updater(prev) : updater;
      const next = normalizeAvailabilitySlots(nextRaw);

      if (getAvailabilitySignature(prev) === getAvailabilitySignature(next)) {
        return prev;
      }

      setAvailabilityUndoStack((stack) => [
        ...stack.slice(-9),
        cloneAvailabilitySlots(prev),
      ]);

      return next;
    });
  }, []);

  const undoAvailabilityChange = useCallback(() => {
    setAvailabilityUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;

      setAvailabilitySlots(cloneAvailabilitySlots(previous));
      return stack.slice(0, -1);
    });
  }, []);

  const discardAvailabilityChanges = useCallback(() => {
    setAvailabilitySlots(cloneAvailabilitySlots(availabilityBaseline));
    setAvailabilityUndoStack([]);
    setDragSelection(null);
    setSlotInteractionPreview(null);
  }, [availabilityBaseline]);

  const addAvailabilitySlot = useCallback(
    (dayOfWeek, startTime, endTime) => {
      updateAvailabilityDraft((prev) => [
        ...prev,
        createDraftAvailabilitySlot(dayOfWeek, startTime, endTime),
      ]);
    },
    [updateAvailabilityDraft]
  );

  const deleteAvailabilitySlot = useCallback(
    (slotId) => {
      updateAvailabilityDraft((prev) =>
        prev.filter((slot) => String(slot.id) !== String(slotId))
      );
    },
    [updateAvailabilityDraft]
  );

  const clearDayAvailability = useCallback(
    (dayOfWeek) => {
      if (!confirm(t(dict, "confirm_clear_day"))) return;
      updateAvailabilityDraft((prev) =>
        prev.filter(
          (slot) => !slot.isRecurring || Number(slot.dayOfWeek) !== Number(dayOfWeek)
        )
      );
    },
    [dict, updateAvailabilityDraft]
  );

  const clearAllAvailability = useCallback(() => {
    if (!confirm(t(dict, "confirm_clear_all"))) return;
    updateAvailabilityDraft([]);
  }, [dict, updateAvailabilityDraft]);

  const saveAvailabilityChanges = useCallback(async () => {
    if (!hasAvailabilityChanges || savingAvailability) return;

    const baselineById = new Map(
      availabilityBaseline
        .filter((slot) => !isDraftAvailabilitySlot(slot))
        .map((slot) => [String(slot.id), slot])
    );
    const draftById = new Map(
      availabilitySlots
        .filter((slot) => !isDraftAvailabilitySlot(slot))
        .map((slot) => [String(slot.id), slot])
    );

    const deletes = [];
    const updates = [];
    const creates = [];

    availabilityBaseline.forEach((slot) => {
      if (isDraftAvailabilitySlot(slot)) return;

      const draftSlot = draftById.get(String(slot.id));
      if (!draftSlot) {
        deletes.push(slot);
        return;
      }

      const sameRecurringTarget =
        slot.isRecurring === draftSlot.isRecurring &&
        Number(slot.dayOfWeek) === Number(draftSlot.dayOfWeek) &&
        String(slot.specificDate || "") === String(draftSlot.specificDate || "");

      if (!sameRecurringTarget) {
        deletes.push(slot);
        creates.push(draftSlot);
        return;
      }

      if (availabilitySlotChangedTimeOrNote(slot, draftSlot)) {
        updates.push(draftSlot);
      }
    });

    availabilitySlots.forEach((slot) => {
      if (isDraftAvailabilitySlot(slot)) {
        creates.push(slot);
        return;
      }

      if (!baselineById.has(String(slot.id))) {
        creates.push(slot);
      }
    });

    try {
      setSavingAvailability(true);

      for (const slot of deletes) {
        await api.delete(`/availability/${slot.id}`);
      }

      for (const slot of updates) {
        await api.patch(`/availability/${slot.id}`, {
          startTime: slot.startTime,
          endTime: slot.endTime,
          note: slot.note || undefined,
        });
      }

      if (creates.length === 1) {
        await api.post("/availability", getAvailabilityPayload(creates[0]));
      } else if (creates.length > 1) {
        await api.post("/availability/bulk", {
          slots: creates.map(getAvailabilityPayload),
        });
      }

      toast.success("Availability changes saved");
      await fetchAvailability();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save availability changes");
    } finally {
      setSavingAvailability(false);
    }
  }, [
    availabilityBaseline,
    availabilitySlots,
    dict,
    fetchAvailability,
    hasAvailabilityChanges,
    savingAvailability,
    toast,
  ]);

  const updateAvailabilitySlotDraft = useCallback(
    (slotId, changes) => {
      updateAvailabilityDraft((prev) =>
        prev.map((slot) =>
          String(slot.id) === String(slotId) ? { ...slot, ...changes } : slot
        )
      );
    },
    [updateAvailabilityDraft]
  );

  const copyAvailabilitySlotDraft = useCallback(
    (slot, changes = {}) => {
      updateAvailabilityDraft((prev) => [
        ...prev,
        {
          ...slot,
          ...changes,
          id: `${DRAFT_SLOT_PREFIX}${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
        },
      ]);
    },
    [updateAvailabilityDraft]
  );

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

  const getWeekDragSelection = useCallback((drag, clientY, columnEl) => {
    const currentMinute = getSnappedMinuteFromPointer(clientY, columnEl);
    const { startMinute, endMinute } = getDragSelectionBounds(
      drag.anchorMinute,
      currentMinute
    );

    return {
      dayDate: drag.dayDate,
      dayIdx: drag.dayIdx,
      startMinute,
      endMinute,
    };
  }, []);

  const handleWeekDayPointerDown = useCallback(
    (e, dayDate, dayIdx) => {
      if (calendarMode !== "availability" || savingAvailability) return;
      if (e.button !== 0) return;
      if (!e.target.closest(".calx-week-cell")) return;

      dragSelectionRef.current = {
        pointerId: e.pointerId,
        dayDate,
        dayIdx,
        anchorMinute: getSnappedMinuteFromPointer(e.clientY, e.currentTarget),
        startY: e.clientY,
        hasMoved: false,
        selection: null,
      };

      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [calendarMode, savingAvailability]
  );

  const handleWeekDayPointerMove = useCallback(
    (e) => {
      const drag = dragSelectionRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (!drag.hasMoved && Math.abs(e.clientY - drag.startY) < DRAG_START_THRESHOLD_PX) {
        return;
      }

      const selection = getWeekDragSelection(drag, e.clientY, e.currentTarget);
      dragSelectionRef.current = {
        ...drag,
        hasMoved: true,
        selection,
      };
      setDragSelection(selection);
    },
    [getWeekDragSelection]
  );

  const handleWeekDayPointerEnd = useCallback(
    (e) => {
      const drag = dragSelectionRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      e.currentTarget.releasePointerCapture?.(e.pointerId);
      dragSelectionRef.current = null;
      setDragSelection(null);

      if (!drag.hasMoved) return;

      const selection = drag.selection || getWeekDragSelection(drag, e.clientY, e.currentTarget);
      if (!selection || selection.endMinute <= selection.startMinute) return;

      suppressWeekCellClickRef.current = true;
      window.setTimeout(() => {
        suppressWeekCellClickRef.current = false;
      }, 120);

      addAvailabilitySlot(
        selection.dayDate.getDay(),
        formatAvailabilityTime(selection.startMinute),
        formatAvailabilityTime(selection.endMinute)
      );
    },
    [addAvailabilitySlot, getWeekDragSelection]
  );

  const handleWeekDayPointerCancel = useCallback((e) => {
    const drag = dragSelectionRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragSelectionRef.current = null;
    setDragSelection(null);
  }, []);

  const getWeekDayIndexFromPointer = useCallback((clientX, clientY, fallbackIdx) => {
    const hit = document
      .elementFromPoint(clientX, clientY)
      ?.closest("[data-week-day-idx]");
    const nextIdx = Number(hit?.dataset?.weekDayIdx);

    if (Number.isInteger(nextIdx) && nextIdx >= 0 && nextIdx < weekDays.length) {
      return nextIdx;
    }

    return fallbackIdx;
  }, [weekDays.length]);

  const getWeekDayColumn = useCallback((dayIdx) => {
    return weekWrapRef.current?.querySelector(`[data-week-day-idx="${dayIdx}"]`);
  }, []);

  const getSlotInteractionPreview = useCallback(
    (drag, e) => {
      const targetDayIdx =
        drag.action === "move"
          ? getWeekDayIndexFromPointer(e.clientX, e.clientY, drag.dayIdx)
          : drag.dayIdx;
      const columnEl = getWeekDayColumn(targetDayIdx) || drag.columnEl;
      const pointerMinute = getSnappedMinuteFromPointer(e.clientY, columnEl);
      const duration = drag.endMinute - drag.startMinute;
      let startMinute = drag.startMinute;
      let endMinute = drag.endMinute;

      if (drag.action === "resize-start") {
        startMinute = clamp(
          pointerMinute,
          SLOT_START_HOUR * 60,
          drag.endMinute - DRAG_STEP_MINUTES
        );
      } else if (drag.action === "resize-end") {
        endMinute = clamp(
          pointerMinute,
          drag.startMinute + DRAG_STEP_MINUTES,
          SLOT_END_HOUR * 60
        );
      } else {
        startMinute = clamp(
          pointerMinute - drag.pointerOffsetMinutes,
          SLOT_START_HOUR * 60,
          SLOT_END_HOUR * 60 - duration
        );
        endMinute = startMinute + duration;
      }

      return {
        action: drag.action,
        copy: drag.action === "move" && (drag.copy || e.altKey),
        dayIdx: targetDayIdx,
        slotId: drag.slot.id,
        startMinute,
        endMinute,
      };
    },
    [getWeekDayColumn, getWeekDayIndexFromPointer]
  );

  const handleAvailabilityBlockPointerDown = useCallback(
    (e, slot, dayIdx, action) => {
      if (calendarMode !== "availability" || savingAvailability) return;
      if (e.button !== 0) return;

      const columnEl = e.currentTarget.closest(".calx-week-day-col");
      if (!columnEl) return;

      const pointerMinute = getSnappedMinuteFromPointer(e.clientY, columnEl);
      const startMinute = timeToMinutesValue(slot.startTime);
      const endMinute = timeToMinutesValue(slot.endTime);

      slotInteractionRef.current = {
        pointerId: e.pointerId,
        action,
        slot,
        dayIdx,
        columnEl,
        startMinute,
        endMinute,
        pointerOffsetMinutes: pointerMinute - startMinute,
        startX: e.clientX,
        startY: e.clientY,
        copy: e.altKey,
        hasMoved: false,
        preview: null,
      };

      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [calendarMode, savingAvailability]
  );

  useEffect(() => {
    const handleMove = (e) => {
      const drag = slotInteractionRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (
        !drag.hasMoved &&
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) <
        DRAG_START_THRESHOLD_PX
      ) {
        return;
      }

      const preview = getSlotInteractionPreview(drag, e);
      slotInteractionRef.current = {
        ...drag,
        hasMoved: true,
        preview,
      };
      setSlotInteractionPreview(preview);
    };

    const handleEnd = (e) => {
      const drag = slotInteractionRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const preview = drag.preview || getSlotInteractionPreview(drag, e);
      slotInteractionRef.current = null;
      setSlotInteractionPreview(null);

      if (!drag.hasMoved || !preview) return;

      suppressAvailabilityBlockClickRef.current = true;
      window.setTimeout(() => {
        suppressAvailabilityBlockClickRef.current = false;
      }, 120);

      const changes = {
        dayOfWeek: weekDays[preview.dayIdx]?.getDay() ?? drag.slot.dayOfWeek,
        startTime: formatAvailabilityTime(preview.startMinute),
        endTime: formatAvailabilityTime(preview.endMinute),
        isRecurring: true,
        status: "active",
      };

      if (preview.copy) {
        copyAvailabilitySlotDraft(drag.slot, changes);
      } else {
        updateAvailabilitySlotDraft(drag.slot.id, changes);
      }
    };

    const handleCancel = (e) => {
      const drag = slotInteractionRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      slotInteractionRef.current = null;
      setSlotInteractionPreview(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleCancel);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [
    copyAvailabilitySlotDraft,
    getSlotInteractionPreview,
    updateAvailabilitySlotDraft,
    weekDays,
  ]);

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

  const refreshVisibleEvents = useCallback(async () => {
    if (!user) return;

    const { start, end } = getVisibleRange(currentDate, view);
    const sessions = await fetchEvents(start.toISOString(), end.toISOString());
    setEvents(toRbcEvents(sessions, user?.timezone));
  }, [currentDate, fetchEvents, user, view]);

  const getEventAnchor = useCallback((target) => {
    if (!target || !target.getBoundingClientRect) {
      return {
        left: window.innerWidth / 2,
        right: window.innerWidth / 2,
        top: window.innerHeight / 2,
        bottom: window.innerHeight / 2,
        width: 0,
        height: 0,
      };
    }

    const rect = target.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const openSessionPopover = useCallback(
    (event, target) => {
      setDrawerEvent(null);
      setActiveEvent(event);
      setActiveEventAnchor(getEventAnchor(target));
    },
    [getEventAnchor]
  );

  const closeSessionPopover = useCallback(() => {
    setActiveEvent(null);
    setActiveEventAnchor(null);
  }, []);

  const openSessionDrawer = useCallback((event) => {
    setActiveEvent(null);
    setActiveEventAnchor(null);
    setDrawerEvent(event);
  }, []);

  const copySessionLink = useCallback(
    async (event) => {
      const joinHref = getSessionJoinHref(event);
      const fallbackHref = `${window.location.origin}${getSessionDetailsHref(prefix, event)}`;
      const href = joinHref || fallbackHref;

      try {
        await navigator.clipboard.writeText(href);
        toast.success("Session link copied");
      } catch {
        toast.error("Could not copy session link");
      }
    },
    [prefix, toast]
  );

  const cancelSessionFromCalendar = useCallback(
    async (event) => {
      if (!event || cancelingSessionId) return;
      if (!confirm("Cancel this session?")) return;

      try {
        setCancelingSessionId(event.id);
        await api.post(`/sessions/${event.id}/cancel`);
        toast.success("Session canceled");
        await refreshVisibleEvents();
        setActiveEvent(null);
        setActiveEventAnchor(null);
        setDrawerEvent(null);
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to cancel session");
      } finally {
        setCancelingSessionId(null);
      }
    },
    [cancelingSessionId, refreshVisibleEvents, toast]
  );

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
    (event, e) => {
      if (event.isAvailability) {
        if (calendarMode === "availability" && event.slotId) {
          if (confirm(t(dict, "confirm_delete_slot"))) {
            deleteAvailabilitySlot(event.slotId);
          }
        }
        return;
      }
      const target =
        e?.currentTarget ||
        e?.target?.closest?.(".rbc-event") ||
        e?.target ||
        null;
      openSessionPopover(event, target);
    },
    [calendarMode, deleteAvailabilitySlot, dict, openSessionPopover]
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
                type="button"
                className={`calx-mode-btn ${calendarMode === "sessions" ? "is-active" : ""}`}
                onClick={() => setCalendarMode("sessions")}
                aria-pressed={calendarMode === "sessions"}
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
                type="button"
                className={`calx-mode-btn ${calendarMode === "availability" ? "is-active-green" : ""}`}
                onClick={() => setCalendarMode("availability")}
                aria-pressed={calendarMode === "availability"}
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
                    onClick={(e) => openSessionPopover(ev, e.currentTarget)}
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
            <div className="calx-toolbar__left">
              <button
                type="button"
                className="calx-today-btn"
                onClick={() => handleNavigate("today")}
                aria-label="Jump to today"
              >
                Today
              </button>
              <div className="calx-toolbar-nav" role="group" aria-label="Calendar navigation">
                <button
                  type="button"
                  className="calx-nav-btn"
                  onClick={() => handleNavigate("prev")}
                  aria-label="Previous period"
                >
                  <ChevronLeft size={17} strokeWidth={2.8} />
                </button>
                <button
                  type="button"
                  className="calx-nav-btn"
                  onClick={() => handleNavigate("next")}
                  aria-label="Next period"
                >
                  <ChevronRight size={17} strokeWidth={2.8} />
                </button>
              </div>
            </div>

            <div className="calx-toolbar__center" aria-live="polite">
              <div className="calx-toolbar-range">{getViewRangeLabel(currentDate, view)}</div>
              <div className="calx-toolbar-timezone">{user?.timezone || "Local timezone"}</div>
            </div>

            <div className="calx-toolbar__right">
              <div className="calx-view-tabs" role="group" aria-label="Calendar view">
                <button
                  type="button"
                  className={`calx-view-tab ${view === "week" ? "is-active" : ""}`}
                  onClick={() => setView("week")}
                  aria-pressed={view === "week"}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={`calx-view-tab ${view === "month" ? "is-active" : ""}`}
                  onClick={() => setView("month")}
                  aria-pressed={view === "month"}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`calx-view-tab ${view === "day" ? "is-active" : ""}`}
                  onClick={() => setView("day")}
                  aria-pressed={view === "day"}
                >
                  Day
                </button>
              </div>

              <div className="calx-filters" ref={filtersRef}>
                <button
                  type="button"
                  className={`calx-filter-btn ${showFilters ? "is-active" : ""}`}
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={15} strokeWidth={2.5} />
                  Filter
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

              <Link className="calx-toolbar-book" href={`${prefix}/packages`}>
                <Plus size={15} strokeWidth={2.7} />
                Book
              </Link>
            </div>
          </div>

          {calendarMode === "availability" && showAvailabilityHint && (
            <div className="calx-availability-banner">
              <span className="calx-availability-banner__icon">💡</span>
              <span className="calx-availability-banner__text">
                <strong>{t(dict, "instructions_title") || "Availability Editing Mode"}:</strong>{" "}
                {t(dict, "instructions_drag") ||
                  "Drag on a day column to create an availability range."}{" "}
                Drag a block to move it, drag its edges to resize, and hold Option/Alt
                while dragging to copy.
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
                        type="button"
                        key={`hdr-${day.toISOString()}`}
                        className="calx-week-header-day"
                        onClick={() => {
                          setSelectedDate(day);
                          setCurrentDate(day);
                        }}
                        aria-pressed={isSel}
                        aria-label={`Select ${format(day, "EEEE, MMMM d")}`}
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
                    const activeDragSelection =
                      dragSelection?.dayIdx === dayIdx ? dragSelection : null;
                    const activeSlotPreview =
                      slotInteractionPreview?.dayIdx === dayIdx
                        ? slotInteractionPreview
                        : null;
                    const dragPreviewTop = activeDragSelection
                      ? ((activeDragSelection.startMinute - SLOT_START_HOUR * 60) / 60) *
                      SLOT_HEIGHT +
                      2
                      : 0;
                    const dragPreviewHeight = activeDragSelection
                      ? Math.max(
                        20,
                        ((activeDragSelection.endMinute - activeDragSelection.startMinute) / 60) *
                        SLOT_HEIGHT -
                        4
                      )
                      : 0;
                    const slotPreviewTop = activeSlotPreview
                      ? ((activeSlotPreview.startMinute - SLOT_START_HOUR * 60) / 60) *
                      SLOT_HEIGHT +
                      2
                      : 0;
                    const slotPreviewHeight = activeSlotPreview
                      ? Math.max(
                        20,
                        ((activeSlotPreview.endMinute - activeSlotPreview.startMinute) / 60) *
                        SLOT_HEIGHT -
                        4
                      )
                      : 0;

                    return (
                      <div
                        key={`day-${day.toISOString()}`}
                        data-week-day-idx={dayIdx}
                        className={`calx-week-day-col ${isToday ? "is-today" : ""} ${calendarMode === "availability" ? "is-availability" : ""
                          }`}
                        onPointerDown={(e) => handleWeekDayPointerDown(e, day, dayIdx)}
                        onPointerMove={handleWeekDayPointerMove}
                        onPointerUp={handleWeekDayPointerEnd}
                        onPointerCancel={handleWeekDayPointerCancel}
                      >
                        {timeLabels.map((_, rowIdx) => {
                          const hour = SLOT_START_HOUR + rowIdx;
                          return (
                            <button
                              key={`cell-${day.toISOString()}-${hour}`}
                              className={`calx-week-cell ${calendarMode === "availability" ? "is-clickable" : ""
                                }`}
                              onClick={(e) => {
                                if (suppressWeekCellClickRef.current) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  suppressWeekCellClickRef.current = false;
                                  return;
                                }
                                toggleWeekCellAvailability(day, hour);
                              }}
                              disabled={calendarMode !== "availability" || savingAvailability}
                              aria-label={`Slot ${format(day, "EEEE")} ${hour}:00`}
                            />
                          );
                        })}

                        {isToday && (
                          <div
                            className="calx-current-time-line"
                            style={{ top: currentTimeTop }}
                            aria-hidden="true"
                          >
                            <span className="calx-current-time-dot" />
                            <span className="calx-current-time-label">
                              {format(now, "h:mm a")}
                            </span>
                          </div>
                        )}

                        {activeDragSelection && (
                          <div
                            className="calx-drag-selection"
                            style={{
                              top: dragPreviewTop,
                              height: dragPreviewHeight,
                            }}
                            aria-hidden="true"
                          >
                            <span className="calx-drag-selection__label">
                              {formatMinuteLabel(activeDragSelection.startMinute)} -{" "}
                              {formatMinuteLabel(activeDragSelection.endMinute)}
                            </span>
                          </div>
                        )}

                        {activeSlotPreview && (
                          <div
                            className={`calx-drag-selection is-slot-preview ${activeSlotPreview.copy ? "is-copy" : ""
                              }`}
                            style={{
                              top: slotPreviewTop,
                              height: slotPreviewHeight,
                            }}
                            aria-hidden="true"
                          >
                            <span className="calx-drag-selection__label">
                              {activeSlotPreview.copy ? "Copy " : ""}
                              {formatMinuteLabel(activeSlotPreview.startMinute)} -{" "}
                              {formatMinuteLabel(activeSlotPreview.endMinute)}
                            </span>
                          </div>
                        )}

                        {filters.availability &&
                          availabilityByDayLayout[dayIdx]?.map((ev) => {
                            const top = (ev.startMin / 60) * SLOT_HEIGHT + 2;
                            const height = Math.max(24, ((ev.endMin - ev.startMin) / 60) * SLOT_HEIGHT - 4);
                            const widthPct = 100 / (ev.colCount || 1);
                            const leftPct = widthPct * (ev.col || 0);
                            const isEditingSlot =
                              slotInteractionPreview?.slotId &&
                              String(slotInteractionPreview.slotId) === String(ev.slotId);

                            return (
                              <button
                                key={ev.id}
                                className={`calx-avail-block is-visible ${calendarMode !== "availability" ? "is-passive" : "is-editable"
                                  } ${isEditingSlot ? "is-being-edited" : ""
                                  }`}
                                style={{
                                  top,
                                  height,
                                  left: `calc(${leftPct}% + 4px)`,
                                  width: `calc(${widthPct}% - 8px)`,
                                }}
                                onPointerDown={(e) =>
                                  handleAvailabilityBlockPointerDown(e, ev._raw, dayIdx, "move")
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (suppressAvailabilityBlockClickRef.current) {
                                    suppressAvailabilityBlockClickRef.current = false;
                                    return;
                                  }
                                  if (calendarMode === "availability" && ev.slotId) {
                                    if (confirm(t(dict, "confirm_delete_slot"))) {
                                      deleteAvailabilitySlot(ev.slotId);
                                    }
                                  }
                                }}
                              >
                                {calendarMode === "availability" && (
                                  <span
                                    className="calx-avail-resize calx-avail-resize--top"
                                    onPointerDown={(e) =>
                                      handleAvailabilityBlockPointerDown(
                                        e,
                                        ev._raw,
                                        dayIdx,
                                        "resize-start"
                                      )
                                    }
                                  />
                                )}
                                <span className="calx-avail-block__content">
                                  ✓ {t(dict, "available")}
                                </span>
                                {calendarMode === "availability" && (
                                  <span
                                    className="calx-avail-resize calx-avail-resize--bottom"
                                    onPointerDown={(e) =>
                                      handleAvailabilityBlockPointerDown(
                                        e,
                                        ev._raw,
                                        dayIdx,
                                        "resize-end"
                                      )
                                    }
                                  />
                                )}
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
                                openSessionPopover(ev, e.currentTarget);
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
              <div className={`calx-availability-status ${hasAvailabilityChanges ? "is-dirty" : ""
                }`}>
                {hasAvailabilityChanges ? "Unsaved availability changes" : "All availability changes saved"}
              </div>
              <button
                className="calx-availability-action"
                disabled={savingAvailability || availabilityUndoStack.length === 0}
                onClick={undoAvailabilityChange}
              >
                Undo
              </button>
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
              <button
                className="calx-availability-action"
                disabled={savingAvailability || !hasAvailabilityChanges}
                onClick={discardAvailabilityChanges}
              >
                Discard
              </button>
              <button
                className="calx-availability-action is-primary"
                disabled={savingAvailability || !hasAvailabilityChanges}
                onClick={saveAvailabilityChanges}
              >
                Save Changes
              </button>
            </div>
          )}
        </main>
      </div>

      {activeEvent && (
        <SessionQuickPopover
          event={activeEvent}
          anchor={activeEventAnchor}
          onClose={closeSessionPopover}
          onOpenDrawer={openSessionDrawer}
          onCopyLink={copySessionLink}
          dict={dict}
          prefix={prefix}
        />
      )}

      {drawerEvent && (
        <SessionDetailDrawer
          event={drawerEvent}
          onClose={() => setDrawerEvent(null)}
          onCopyLink={copySessionLink}
          onCancelSession={cancelSessionFromCalendar}
          canceling={String(cancelingSessionId) === String(drawerEvent.id)}
          dict={dict}
          prefix={prefix}
        />
      )}
    </div>
  );
}
