"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import AdminAccessFallback from "../components/AdminAccessFallback";
import AdminDashboardHeader from "../components/AdminDashboardHeader";
import "@/styles/admin.scss";
import "@/styles/admin-free-sessions.scss";

const PAGE_SIZE = 24;
const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "BOOKED", "CLOSED"];
const SLOT_LABELS = {
  weekday_morning: "Weekdays · Morning",
  weekday_afternoon: "Weekdays · Afternoon",
  weekday_evening: "Weekdays · Evening",
  weekend_morning: "Weekend · Morning",
  weekend_afternoon: "Weekend · Afternoon",
  weekend_evening: "Weekend · Evening",
};
const DAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};
const TIME_LABELS = {
  morning: "Morning · 9 am–12 pm",
  afternoon: "Afternoon · 12–5 pm",
  evening: "Evening · 5–10 pm",
};

function formatAvailabilityHour(hour) {
  const normalized = Number(hour) === 24 ? 0 : Number(hour);
  const display = normalized % 12 || 12;
  return `${display} ${normalized < 12 ? "AM" : "PM"}`;
}
const GOAL_LABELS = {
  work: "Work & career",
  travel: "Travel",
  conversation: "Everyday conversation",
  interviews: "Interviews",
  exams: "Exams",
  other: "Something else",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function initials(name) {
  return String(name || "?").split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

function statusLabel(status) {
  return { NEW: "New", CONTACTED: "Contacted", BOOKED: "Booked", CLOSED: "Closed" }[status] || status;
}

function availability(item) {
  const exactSlots = Array.isArray(item.availabilitySlots) ? item.availabilitySlots : [];
  const groups = new Map();
  exactSlots.forEach((slot) => {
    const match = String(slot).match(/^([a-z]+) (\d{2}):00$/);
    if (!match) return;
    const [, day, hour] = match;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(formatAvailabilityHour(hour));
  });
  if (groups.size) return [...groups.entries()].map(([day, hours]) => `${DAY_LABELS[day] || day}: ${hours.join(", ")}`);
  const days = Array.isArray(item.preferredDays) ? item.preferredDays.map((day) => DAY_LABELS[day] || day) : [];
  const times = Array.isArray(item.preferredTimes) ? item.preferredTimes.map((time) => TIME_LABELS[time] || time) : [];
  if (days.length || times.length) return [...(days.length ? [days.join(" · ")] : []), ...times];
  const legacy = (Array.isArray(item.preferredSlots) ? item.preferredSlots : []).map((slot) => SLOT_LABELS[slot] || slot);
  return legacy;
}

export default function FreeSessionRequestsPage() {
  const { user, checking } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const activeItem = useMemo(() => items.find((item) => item.id === activeId) || null, [items, activeId]);

  const load = useCallback(async () => {
    if (checking || !isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/free-session-requests", {
        params: { q: query.trim() || undefined, status: status || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setItems(data?.items || []);
      setCounts(data?.counts || {});
      setTotal(data?.total || 0);
      if (activeId && !(data?.items || []).some((item) => item.id === activeId)) setActiveId(null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || "Failed to load free-session requests.");
    } finally {
      setLoading(false);
    }
  }, [activeId, checking, isAdmin, page, query, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [query, status]);

  const updateStatus = async (id, nextStatus) => {
    setSavingId(id);
    try {
      const previousStatus = items.find((item) => item.id === id)?.status;
      const { data } = await api.patch(`/admin/free-session-requests/${id}`, { status: nextStatus });
      setItems((current) => current.map((item) => item.id === id ? data.item : item));
      if (previousStatus && previousStatus !== nextStatus) {
        setCounts((current) => ({
          ...current,
          [previousStatus]: Math.max(0, (current[previousStatus] || 0) - 1),
          [nextStatus]: (current[nextStatus] || 0) + 1,
        }));
      }
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Could not update status.");
    } finally {
      setSavingId(null);
    }
  };

  if (checking || !isAdmin) return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;

  return (
    <div className="adm-admin-modern adm-free-sessions">
      <AdminDashboardHeader />
      <section className="free-requests-hero"><div><p className="free-requests-eyebrow">LEAD INBOX</p><h1>Free session requests</h1><p>Every new request, in one calm place. Reach out, choose a coach, and move it through the queue.</p></div><button type="button" className="free-requests-refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""} />Refresh</button></section>
      <section className="free-requests-stats" aria-label="Request summary">{[{ key: "NEW", label: "New requests", tone: "coral", icon: MessageCircle }, { key: "CONTACTED", label: "Contacted", tone: "blue", icon: Clock3 }, { key: "BOOKED", label: "Booked", tone: "green", icon: CheckCircle2 }, { key: "", label: "All requests", tone: "navy", icon: CalendarClock }].map(({ key, label, tone, icon: Icon }) => <button type="button" className={`free-stat free-stat--${tone} ${status === key ? "is-active" : ""}`} key={label} onClick={() => setStatus(key)}><span className="free-stat__icon"><Icon size={17} /></span><span><strong>{key ? (counts[key] || 0) : total}</strong><small>{label}</small></span></button>)}</section>
      <section className="free-requests-panel"><div className="free-requests-toolbar"><label className="free-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, or email" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">{STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value ? statusLabel(value) : "All statuses"}</option>)}</select></div>{error && <div className="free-requests-error">{error}</div>}{loading ? <div className="free-requests-empty">Loading requests…</div> : items.length === 0 ? <div className="free-requests-empty"><MessageCircle size={28} /><strong>No requests here yet</strong><span>New free-session forms will appear in this queue.</span></div> : <div className="free-requests-table-wrap"><table className="free-requests-table"><thead><tr><th>Person</th><th>Goal</th><th>Availability</th><th>Received</th><th>Status</th></tr></thead><tbody>{items.map((item) => { const itemAvailability = availability(item); return <tr key={item.id} className={activeId === item.id ? "is-active" : ""} onClick={() => setActiveId(item.id)}><td><div className="free-person"><span className="free-avatar">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.phone}</small></span></div></td><td><span className="free-goal">{GOAL_LABELS[item.goal] || item.goal}</span></td><td><div className="free-availability">{itemAvailability.slice(0, 2).map((entry) => <span key={entry}>{entry}</span>)}{!itemAvailability.length && <span>—</span>}</div></td><td className="free-date">{formatDate(item.createdAt)}</td><td onClick={(event) => event.stopPropagation()}><select className={`free-status free-status--${String(item.status).toLowerCase()}`} value={item.status} disabled={savingId === item.id} onChange={(event) => updateStatus(item.id, event.target.value)} aria-label={`Status for ${item.name}`}>{STATUS_OPTIONS.filter(Boolean).map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></td></tr>; })}</tbody></table></div>}{total > PAGE_SIZE && <div className="free-requests-pagination"><span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span><div><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button><button type="button" onClick={() => setPage((current) => current + 1)} disabled={(page + 1) * PAGE_SIZE >= total}>Next</button></div></div>}</section>
      {activeItem && <div className="free-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveId(null); }}><aside className="free-detail" aria-label="Free session request details"><div className="free-detail__header"><div><span className="free-avatar free-avatar--large">{initials(activeItem.name)}</span><div><p>Request #{activeItem.id}</p><h2>{activeItem.name}</h2></div></div><button type="button" onClick={() => setActiveId(null)} aria-label="Close details"><X size={19} /></button></div><div className="free-detail__actions"><a href={`https://wa.me/${String(activeItem.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>{activeItem.email && <a href={`mailto:${activeItem.email}`}><Mail size={16} /> Email</a>}<a href={`tel:${activeItem.phone}`}><Phone size={16} /> Call</a></div><div className="free-detail__body"><div className="free-detail__field"><span>Contact</span><strong>{activeItem.phone}</strong>{activeItem.email && <small>{activeItem.email}</small>}</div><div className="free-detail__field"><span>Goal</span><strong>{GOAL_LABELS[activeItem.goal] || activeItem.goal}</strong></div><div className="free-detail__field"><span>Availability</span><div className="free-detail__slot-list">{availability(activeItem).length ? availability(activeItem).map((entry) => <span key={entry}>{entry}</span>) : <span>—</span>}</div></div>{activeItem.notes && <div className="free-detail__field"><span>Note</span><p>{activeItem.notes}</p></div>}<div className="free-detail__field"><span>Submitted</span><strong>{formatDate(activeItem.createdAt)}</strong></div></div><div className="free-detail__footer"><label>Update status<select value={activeItem.status} disabled={savingId === activeItem.id} onChange={(event) => updateStatus(activeItem.id, event.target.value)}>{STATUS_OPTIONS.filter(Boolean).map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><a href={activeItem.email ? `mailto:${activeItem.email}` : `https://wa.me/${String(activeItem.phone).replace(/\D/g, "")}`} target={activeItem.email ? undefined : "_blank"} rel={activeItem.email ? undefined : "noreferrer"} className="free-detail__primary">Follow up <ExternalLink size={15} /></a></div></aside></div>}
    </div>
  );
}
