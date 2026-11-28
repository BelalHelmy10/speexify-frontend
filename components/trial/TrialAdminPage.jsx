"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, Plus, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import AdminAccessFallback from "@/app/admin/components/AdminAccessFallback";
import FreeSessionRequestsPage from "@/app/admin/free-sessions/FreeSessionRequestsPage";
import TrialInvites from "./TrialInvites";
import { dayKey, downloadFile, formatTrial, TRIAL_STATUSES, zonedDayBounds } from "@/lib/trialBooking.mjs";
import { trialCopy } from "./copy";
import { adminTrialCopy } from "./adminCopy";
import "@/styles/trial-admin.scss";

const initialSettings = { leadHours: 12, horizonDays: 14, durationMin: 30, bufferMin: 0 };
const format = (at, locale) => formatTrial(at, locale, "Africa/Cairo", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
function BookingEditor({ booking, trainers, locale, onSave, busy }) {
  const c = adminTrialCopy[locale]; const statuses = trialCopy[locale].statuses;
  const [trainerId, setTrainerId] = useState(booking.trainerId || ""); const [status, setStatus] = useState(booking.status); const [notes, setNotes] = useState(booking.notes || ""); const [confirm, setConfirm] = useState(false);
  const message = adminTrialCopy[booking.locale === "ar" ? "ar" : "en"].whatsappText.replace("{name}", booking.name).replace("{date}", format(booking.slot.startAt, booking.locale));
  return <form className="ta-editor" onSubmit={(e) => { e.preventDefault(); if (status === "CANCELLED" && booking.status !== "CANCELLED" && !confirm) { setConfirm(true); return; } onSave(booking.id, { status, trainerId: trainerId ? Number(trainerId) : null, notes }); }}>
    <div className="ta-grid"><label>{c.trainer}<select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}><option value="">{c.unassigned}</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name || `#${t.id}`}</option>)}</select></label><label>{c.status}<select value={status} onChange={(e) => { setStatus(e.target.value); setConfirm(false); }}>{TRIAL_STATUSES.map((s) => <option key={s} value={s}>{statuses[s]}</option>)}</select></label></div>
    <label>{c.notes}<textarea maxLength={2000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><p className="ta-hint">{c.contactReminder} {c.manageHint}</p>
    {confirm && <p className="ta-warning" role="alert">{c.cancelWarning}</p>}
    <div className="ta-actions"><button className="ta-primary" disabled={busy} type="submit">{confirm ? c.cancelYes : c.save}</button>{confirm && <button type="button" onClick={() => { setConfirm(false); setStatus(booking.status); }}>{c.keep}</button>}<a href={`https://wa.me/${booking.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">{c.whatsapp}</a></div>
  </form>;
}
function SlotEditor({ slot, locale, busy, onSave, onClose }) {
  const c = adminTrialCopy[locale];
  const [draft, setDraft] = useState({
    date: dayKey(slot.startAt, "Africa/Cairo"),
    startTime: new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(slot.startAt)),
    durationMin: Math.round((new Date(slot.endAt) - new Date(slot.startAt)) / 60000),
    bufferMin: slot.bufferMin,
  });
  const [capacity, setCapacity] = useState(slot.capacity);
  const [acknowledge, setAcknowledge] = useState(false);
  return <form className="ta-editor" onSubmit={(e) => { e.preventDefault(); onSave({ capacity, schedule: draft, acknowledgeBookings: acknowledge }); }}>
    <h3>{c.editTitle}</h3>
    {slot.reservedCount > 0 && <p className="ta-warning">{c.editWarning}</p>}
    <div className="ta-grid"><label>{c.date}<input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>{c.start}<input required type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></label></div>
    <div className="ta-grid">{[["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value === "" ? "" : Number(e.target.value) })} /></label>)}<label>{c.capacity}<input type="number" required min={Math.max(1, slot.reservedCount)} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))} /></label></div>
    {slot.reservedCount > 0 && <label className="ta-checkbox"><input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />{c.acknowledge}</label>}
    <div className="ta-actions"><button className="ta-primary" disabled={busy} type="submit">{c.save}</button><button type="button" disabled={busy} onClick={onClose}>{c.closeEditor}</button></div>
  </form>;
}
export default function TrialAdminPage({ locale = "en" }) {
  const c = adminTrialCopy[locale]; const statuses = trialCopy[locale].statuses; const ar = locale === "ar"; const prefix = ar ? "/ar" : "";
  const { user, checking } = useAuth(); const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("bookings"); const [items, setItems] = useState([]); const [total, setTotal] = useState(0); const [slots, setSlots] = useState([]); const [trainers, setTrainers] = useState([]);
  const [config, setConfig] = useState(initialSettings); const [ruleDraft, setRuleDraft] = useState(initialSettings);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [range, setRange] = useState("upcoming"); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ date: "", startTime: "09:00", endTime: "17:00", durationMin: 30, bufferMin: 0, capacity: 1 });
  const [editingSlot, setEditingSlot] = useState(null);
  const [copyDay, setCopyDay] = useState({ source: "", target: "" }); const [slotDay, setSlotDay] = useState("");
  const initialized = useRef(false); const version = useRef(0); const locking = useRef(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const value = params.get("tab"); if (["bookings", "invites", "availability", "requests"].includes(value)) setTab(value); else if (params.has("requestId")) setTab("requests"); }, []);
  const parameters = useCallback(() => {
    const params = { q, status, page };
    if (range === "upcoming") params.from = new Date().toISOString();
    if (range === "today") {
      Object.assign(params, zonedDayBounds(dayKey(new Date(), "Africa/Cairo"), "Africa/Cairo"));
    }
    return params;
  }, [q, status, page, range]);
  const load = useCallback(async () => {
    const request = ++version.current; setLoading(true);
    try {
      const [bookings, setup] = await Promise.all([api.get("/admin/trial-bookings", { params: parameters() }), api.get("/admin/trial-bookings/setup")]);
      if (request !== version.current) return;
      setItems(bookings.data.items); setTotal(bookings.data.total); setSlots(setup.data.slots); setTrainers(setup.data.trainers); setConfig(setup.data.settings);
      if (!initialized.current) { setRuleDraft(setup.data.settings); setForm((f) => ({ ...f, durationMin: setup.data.settings.durationMin, bufferMin: setup.data.settings.bufferMin })); initialized.current = true; }
    } catch { if (request === version.current) setError(c.errors.DEFAULT); }
    finally { if (request === version.current) setLoading(false); }
  }, [parameters, c]);
  useEffect(() => { if (!isAdmin) return; const timer = setTimeout(() => { void load(); }, 200); return () => { clearTimeout(timer); version.current++; }; }, [load, isAdmin]);
  async function action(work, success = c.saved) {
    if (locking.current) return; locking.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); setNotice(success); await load(); }
    catch (e) { setError(c.errors[e?.response?.data?.code] || c.errors.DEFAULT); }
    finally { locking.current = false; setBusy(false); }
  }
  function changeTab(value) { setTab(value); window.history.replaceState(null, "", `${window.location.pathname}?tab=${value}`); }
  const visibleSlots = slots.filter((s) => !slotDay || dayKey(s.startAt, "Africa/Cairo") === slotDay);
  if (checking || !isAdmin) return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;
  return <div className="trial-admin" dir={ar ? "rtl" : "ltr"} lang={locale}>
    <header className="ta-header"><div><Link href={`${prefix}/admin`}>{c.dashboard}</Link><h1>{c.title}</h1><p>{c.subtitle}</p></div><div className="ta-actions"><Link href={`${prefix}/trial-booking`} target="_blank">{c.publicPage}</Link><button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${prefix}/trial-booking`); setNotice(c.linkCopied); } catch { setError(c.errors.DEFAULT); } }}>{c.copyPublic}</button><button onClick={load} disabled={loading}><RefreshCw size={16} />{c.refresh}</button></div></header>
    <nav className="ta-tabs" aria-label={c.title}>{["bookings", "invites", "availability", "requests"].map((value) => <button key={value} onClick={() => changeTab(value)} aria-current={tab === value ? "page" : undefined}>{c[value]}</button>)}</nav>
    {error && <p className="ta-error" role="alert">{error}</p>}{notice && <p className="ta-notice" role="status">{notice}</p>}
    {tab === "requests" ? <FreeSessionRequestsPage /> : tab === "invites" ? <TrialInvites locale={locale} /> : tab === "bookings" ? <>
      <p className="ta-info"><CalendarDays size={20} />{c.manual}</p>
      <div className="ta-toolbar"><input aria-label={c.search} placeholder={c.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /><select aria-label={c.status} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">{c.all}</option>{TRIAL_STATUSES.map((s) => <option key={s} value={s}>{statuses[s]}</option>)}</select><select aria-label={c.date} value={range} onChange={(e) => { setRange(e.target.value); setPage(0); }}>{["upcoming", "today", "history"].map((v) => <option key={v} value={v}>{c[v]}</option>)}</select><button disabled={busy} onClick={() => action(async () => { const { data } = await api.get("/admin/trial-bookings", { params: { ...parameters(), export: "1" }, responseType: "blob" }); downloadFile(data, "trial-bookings.csv", "text/csv;charset=utf-8"); }, "")}><Download size={16} />{c.export}</button></div>
      {loading ? <p role="status" className="ta-empty">{c.loading}</p> : !items.length ? <p className="ta-empty">{c.empty}</p> : <div className="ta-bookings">{items.map((b) => <article className="ta-booking" key={b.id}><div className="ta-booking-row"><div><strong>{format(b.slot.startAt, locale)}</strong><small>{Math.round((new Date(b.slot.endAt) - new Date(b.slot.startAt)) / 60000)} {trialCopy[locale].minutes} · Africa/Cairo</small></div><div><strong>{b.name}</strong><a dir="ltr" href={`tel:${b.phone}`}>{b.phone}</a></div><div><span className={`ta-badge ta-badge-${b.status.toLowerCase()}`}>{statuses[b.status]}</span><small>{b.trainer?.name || c.unassigned}</small></div><button aria-expanded={expanded === b.id} aria-controls={`booking-${b.id}`} onClick={() => setExpanded(expanded === b.id ? null : b.id)}>{c.details}</button></div>{expanded === b.id && <div id={`booking-${b.id}`}><BookingEditor key={`${b.id}-${b.updatedAt}`} booking={b} trainers={trainers} locale={locale} busy={busy} onSave={(id, data) => action(() => api.patch(`/admin/trial-bookings/${id}`, data))} /></div>}</article>)}</div>}
      <div className="ta-pagination"><span>{total} {c.total}</span><div><button disabled={!page || loading} onClick={() => setPage(page - 1)}>{c.previous}</button><button disabled={(page + 1) * 30 >= total || loading} onClick={() => setPage(page + 1)}>{c.next}</button></div></div>
    </> : <>
      <div className="ta-availability-grid"><section className="ta-panel"><h2>{c.availabilityTitle}</h2><p>{c.availabilityHint}</p><form onSubmit={(e) => { e.preventDefault(); action(() => api.post("/admin/trial-bookings/slots", form), c.added); }}><label>{c.date}<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><div className="ta-grid">{[["startTime", c.start], ["endTime", c.end]].map(([key, label]) => <label key={key}>{label}<input type="time" required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div><div className="ta-grid">{[["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60], ["capacity", c.capacity, 1, 100]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? "" : Number(e.target.value) })} /></label>)}</div><button className="ta-primary" disabled={busy} type="submit"><Plus size={16} />{c.add}</button></form></section>
      <div className="ta-stack"><section className="ta-panel"><h2>{c.copyTitle}</h2><p>{c.copyHint}</p><form onSubmit={(e) => { e.preventDefault(); action(() => api.post("/admin/trial-bookings/copy-day", copyDay), c.added); }}><div className="ta-grid">{[["source", c.source], ["target", c.target]].map(([key, label]) => <label key={key}>{label}<input type="date" required value={copyDay[key]} onChange={(e) => setCopyDay({ ...copyDay, [key]: e.target.value })} /></label>)}</div><button type="submit" disabled={busy}>{c.copy}</button></form></section>
      <section className="ta-panel"><h2>{c.settingsTitle}</h2><p>{c.settingsHint}</p><form onSubmit={(e) => { e.preventDefault(); action(async () => { const { id: _id, ...data } = ruleDraft; await api.put("/admin/trial-bookings/settings", data); setForm((f) => ({ ...f, durationMin: data.durationMin, bufferMin: data.bufferMin })); }); }}><div className="ta-grid">{[["leadHours", c.lead, 0, 168], ["horizonDays", c.horizon, 1, 90], ["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={ruleDraft[key]} onChange={(e) => setRuleDraft({ ...ruleDraft, [key]: e.target.value === "" ? "" : Number(e.target.value) })} /></label>)}</div><button type="submit" disabled={busy}>{c.saveSettings}</button></form></section></div></div>
      <section className="ta-panel"><div className="ta-toolbar"><h2>{c.published}</h2><input type="date" aria-label={c.date} value={slotDay} onChange={(e) => setSlotDay(e.target.value)} /></div><p className="ta-hint">{c.lead}: {config.leadHours} · {c.horizon}: {config.horizonDays}</p>{!visibleSlots.length ? <p className="ta-empty">{c.noSlots}</p> : <div className="ta-slot-list">{visibleSlots.map((s) => <div className="ta-slot-wrap" key={s.id}><div className="ta-slot"><div><strong>{format(s.startAt, locale)}</strong><small>{Math.round((new Date(s.endAt) - new Date(s.startAt)) / 60000)} {trialCopy[locale].minutes} · {c.buffer}: {s.bufferMin}</small></div><span>{c.used}: <strong>{s.reservedCount} / {s.capacity}</strong></span><span className="ta-badge">{s.enabled ? c.open : c.closed}</span><div className="ta-actions"><button disabled={busy} aria-expanded={editingSlot === s.id} onClick={() => setEditingSlot(editingSlot === s.id ? null : s.id)}>{c.edit}</button><button disabled={busy || s.capacity <= Math.max(1, s.reservedCount)} aria-label={c.removePlace} onClick={() => action(() => api.patch(`/admin/trial-bookings/slots/${s.id}`, { capacity: s.capacity - 1 }))}>−</button><button disabled={busy || s.capacity >= 100} aria-label={c.addPlace} onClick={() => action(() => api.patch(`/admin/trial-bookings/slots/${s.id}`, { capacity: s.capacity + 1 }))}>+</button><button disabled={busy} onClick={() => action(() => api.patch(`/admin/trial-bookings/slots/${s.id}`, { enabled: !s.enabled }))}>{s.enabled ? c.close : c.reopen}</button></div></div>{editingSlot === s.id && <SlotEditor key={`${s.id}-${s.startAt}-${s.endAt}-${s.capacity}`} slot={s} locale={locale} busy={busy} onClose={() => setEditingSlot(null)} onSave={(data) => action(async () => { await api.patch(`/admin/trial-bookings/slots/${s.id}`, data); setEditingSlot(null); })} />}</div>)}</div>}</section>
    </>}
  </div>;
}
