"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Copy, Lock, Pencil, Plus, Trash2, Unlock, UserRound } from "lucide-react";
import api from "@/lib/api";
import { dayKey, formatTrial } from "@/lib/trialBooking.mjs";
import { adminTrialCopy } from "./adminCopy";
import { trialCopy } from "./copy";

const CAIRO = "Africa/Cairo";
const time = (at, locale) => formatTrial(at, locale, CAIRO, { hour: "numeric", minute: "2-digit" });
const dayTitle = (at, locale) => formatTrial(at, locale, CAIRO, { weekday: "long", day: "numeric", month: "long" });
const minutes = (s) => Math.round((new Date(s.endAt) - new Date(s.startAt)) / 60000);
const clock = (at) => new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
// Egypt's week starts on Saturday. 3 Jan 2026 was a Saturday.
const WEEK = [6, 0, 1, 2, 3, 4, 5];
const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Every date from `from` to `until` that falls on one of the chosen weekdays.
export function repeatDates(from, until, weekdays) {
  if (!from) return [];
  if (!until || until < from) return [from];
  const days = weekdays.length ? weekdays : [weekdayOf(from)];
  const out = [];
  for (let d = from; d <= until && out.length < 92; d = addDays(d, 1)) if (days.includes(weekdayOf(d))) out.push(d);
  return out;
}
export function timesPerDay({ startTime, endTime, durationMin, bufferMin }) {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const span = toMin(endTime) - toMin(startTime); const step = Number(durationMin) + Number(bufferMin);
  return !startTime || !endTime || !durationMin || span < durationMin ? 0 : Math.floor((span - durationMin) / step) + 1;
}

function TrainerPicker({ c, trainers, value, onChange, multiple }) {
  const toggle = (id) => onChange(multiple ? (value.includes(id) ? value.filter((v) => v !== id) : [...value, id]) : [id]);
  return <div className="ta-chips" role="group" aria-label={c.trainers}>
    <button type="button" aria-pressed={!value.length} onClick={() => onChange([])}>{c.noTrainer}</button>
    {trainers.map((t) => <button type="button" key={t.id} aria-pressed={value.includes(t.id)} onClick={() => toggle(t.id)}><UserRound size={14} />{t.name || `#${t.id}`}</button>)}
  </div>;
}

function SlotEditor({ slot, trainers, locale, busy, onSave, onClose }) {
  const c = adminTrialCopy[locale];
  const [draft, setDraft] = useState({ date: dayKey(slot.startAt, CAIRO), startTime: clock(slot.startAt), durationMin: minutes(slot), bufferMin: slot.bufferMin });
  const [trainerId, setTrainerId] = useState(slot.trainerId ?? null);
  const [capacity, setCapacity] = useState(slot.capacity);
  const [acknowledge, setAcknowledge] = useState(false);
  const booked = slot.bookings?.length > 0;
  return <form className="ta-editor" onSubmit={(e) => { e.preventDefault(); onSave({ trainerId, capacity: trainerId ? 1 : capacity, schedule: draft, acknowledgeBookings: acknowledge }); }}>
    <h3>{c.editTitle}</h3>
    {booked && <p className="ta-warning">{c.editWarning}</p>}
    <label className="ta-label">{c.trainer}</label>
    <TrainerPicker c={c} trainers={trainers} value={trainerId ? [trainerId] : []} onChange={(ids) => setTrainerId(ids[0] ?? null)} />
    <div className="ta-grid"><label>{c.day}<input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>{c.start}<input required type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></label></div>
    <div className="ta-grid">{[["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value === "" ? "" : Number(e.target.value) })} /></label>)}
      {!trainerId && <label>{c.capacity}<input type="number" required min={Math.max(1, slot.reservedCount)} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))} /></label>}</div>
    {booked && <label className="ta-checkbox"><input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />{c.acknowledge}</label>}
    <div className="ta-actions"><button className="ta-primary" disabled={busy} type="submit">{c.save}</button><button type="button" disabled={busy} onClick={onClose}>{c.closeEditor}</button></div>
  </form>;
}

export default function TrialAvailability({ locale, slots, trainers, config, busy, action }) {
  const c = adminTrialCopy[locale]; const t = trialCopy[locale];
  const [form, setForm] = useState({ date: "", repeat: false, until: "", weekdays: [], startTime: "17:00", endTime: "20:00", durationMin: 30, bufferMin: 0, capacity: 1, trainerIds: [] });
  const [copy, setCopy] = useState({ source: "", target: "", weeks: 0 });
  const [rules, setRules] = useState(config); const [rulesTouched, setRulesTouched] = useState(false);
  const [filters, setFilters] = useState({ trainer: "all", state: "all", day: "" });
  const [selected, setSelected] = useState(() => new Set());
  const [confirming, setConfirming] = useState(null); // "bulk" | `day:YYYY-MM-DD` | `slot:id`
  const [editing, setEditing] = useState(null);
  useEffect(() => { if (!rulesTouched) setRules(config); }, [config, rulesTouched]);
  useEffect(() => { if (config.id) setForm((f) => ({ ...f, durationMin: config.durationMin, bufferMin: config.bufferMin })); }, [config.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelected((prev) => new Set([...prev].filter((id) => slots.some((s) => s.id === id)))); }, [slots]);

  const dates = form.repeat ? repeatDates(form.date, form.until, form.weekdays) : form.date ? [form.date] : [];
  const perDay = timesPerDay(form);
  const people = Math.max(1, form.trainerIds.length);
  const places = dates.length * perDay * (form.trainerIds.length ? 1 : Number(form.capacity) || 0) * people;
  const preview = !dates.length || !perDay ? c.previewNone : c.preview.replace("{times}", perDay).replace("{days}", dates.length).replace("{who}", form.trainerIds.length ? c.previewTrainers.replace("{n}", form.trainerIds.length) : c.previewNoTrainer).replace("{places}", places);

  const visible = useMemo(() => slots.filter((s) => {
    if (filters.trainer === "none" ? s.trainerId : filters.trainer !== "all" && String(s.trainerId) !== filters.trainer) return false;
    if (filters.day && dayKey(s.startAt, CAIRO) !== filters.day) return false;
    const full = s.reservedCount >= s.capacity;
    if (filters.state === "free" && (!s.enabled || full)) return false;
    if (filters.state === "booked" && !s.reservedCount) return false;
    if (filters.state === "closed" && s.enabled) return false;
    return true;
  }), [slots, filters]);
  const days = useMemo(() => {
    const map = new Map();
    for (const s of visible) {
      const day = dayKey(s.startAt, CAIRO); const at = new Date(s.startAt).toISOString();
      if (!map.has(day)) map.set(day, new Map());
      const times = map.get(day); if (!times.has(at)) times.set(at, []); times.get(at).push(s);
    }
    return [...map.entries()];
  }, [visible]);
  const totals = { times: visible.length, places: visible.reduce((n, s) => n + s.capacity, 0), booked: visible.reduce((n, s) => n + s.reservedCount, 0) };

  const toggleSelect = (ids, on) => setSelected((prev) => { const next = new Set(prev); ids.forEach((id) => (on ? next.add(id) : next.delete(id))); return next; });
  const bulk = (ids, act) => action(async () => { const { data } = await api.post("/admin/trial-bookings/slots/bulk", { ids, action: act }); setSelected(new Set()); setConfirming(null); return data; },
    (data) => act === "delete" ? c.deletedCount.replace("{n}", data.changed) + (data.kept ? ` ${c.keptCount.replace("{n}", data.kept)}` : "") : c.saved);
  const patch = (slot, body) => action(() => api.patch(`/admin/trial-bookings/slots/${slot.id}`, body));
  const deletable = (list) => list.filter((s) => !s._count?.bookings).map((s) => s.id);

  function add(event) {
    event.preventDefault();
    const { date: _d, repeat: _r, until: _u, weekdays: _w, ...rest } = form;
    action(() => api.post("/admin/trial-bookings/slots", { ...rest, dates, capacity: form.trainerIds.length ? 1 : form.capacity }).then(({ data }) => data),
      (data) => c.addedCount.replace("{n}", data.added) + (data.skipped ? ` ${c.skippedCount.replace("{n}", data.skipped)}` : ""));
  }
  function copyDay(event) {
    event.preventDefault();
    const targets = Array.from({ length: Number(copy.weeks || 0) + 1 }, (_, i) => addDays(copy.target, i * 7));
    action(() => api.post("/admin/trial-bookings/copy-day", { source: copy.source, targets }).then(({ data }) => data), (data) => c.addedCount.replace("{n}", data.added));
  }

  return <>
    <div className="ta-availability-grid">
      <section className="ta-panel">
        <h2>{c.availabilityTitle}</h2><p>{c.availabilityHint}</p>
        <form onSubmit={add}>
          <label className="ta-label">{c.trainers}</label>
          <TrainerPicker c={c} trainers={trainers} value={form.trainerIds} multiple onChange={(trainerIds) => setForm({ ...form, trainerIds })} />
          <p className="ta-hint">{form.trainerIds.length ? c.trainerHint : c.noTrainerHint}</p>
          <label>{form.repeat ? c.fromDate : c.day}<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="ta-checkbox"><input type="checkbox" checked={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.checked, weekdays: e.target.checked && form.date && !form.weekdays.length ? [weekdayOf(form.date)] : form.weekdays })} />{c.repeat}</label>
          {form.repeat && <div className="ta-repeat">
            <div className="ta-chips" role="group" aria-label={c.repeatOn}>{WEEK.map((d) => <button type="button" key={d} aria-pressed={form.weekdays.includes(d)} onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d] })}>{formatTrial(`2026-01-${String(3 + WEEK.indexOf(d)).padStart(2, "0")}T12:00:00Z`, locale, "UTC", { weekday: "short" })}</button>)}</div>
            <label>{c.until}<input type="date" required min={form.date} value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} /></label>
          </div>}
          <div className="ta-grid">{[["startTime", c.start], ["endTime", c.end]].map(([key, label]) => <label key={key}>{label}<input type="time" required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div>
          <div className="ta-grid">{[["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60], ...(form.trainerIds.length ? [] : [["capacity", c.capacity, 1, 100]])].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? "" : Number(e.target.value) })} /></label>)}</div>
          <p className="ta-preview" aria-live="polite"><CalendarPlus size={17} />{preview}</p>
          <button className="ta-primary" disabled={busy || !places} type="submit"><Plus size={16} />{c.add}</button>
        </form>
      </section>
      <div className="ta-stack">
        <section className="ta-panel"><h2>{c.copyTitle}</h2><p>{c.copyHint}</p>
          <form onSubmit={copyDay}>
            <div className="ta-grid">{[["source", c.source], ["target", c.target]].map(([key, label]) => <label key={key}>{label}<input type="date" required value={copy[key]} onChange={(e) => setCopy({ ...copy, [key]: e.target.value })} /></label>)}</div>
            <label>{c.copyWeeks}<input type="number" min={0} max={12} value={copy.weeks} onChange={(e) => setCopy({ ...copy, weeks: e.target.value === "" ? "" : Number(e.target.value) })} /></label>
            <button type="submit" disabled={busy}><Copy size={16} />{c.copy}</button>
          </form>
        </section>
        <section className="ta-panel"><h2>{c.settingsTitle}</h2><p>{c.settingsHint}</p>
          <form onSubmit={(e) => { e.preventDefault(); const { id: _id, ...data } = rules; action(async () => { await api.put("/admin/trial-bookings/settings", data); setRulesTouched(false); }); }}>
            <div className="ta-grid">{[["leadHours", c.lead, 0, 168], ["horizonDays", c.horizon, 1, 90], ["durationMin", c.duration, 15, 120], ["bufferMin", c.buffer, 0, 60]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} value={rules[key] ?? ""} onChange={(e) => { setRulesTouched(true); setRules({ ...rules, [key]: e.target.value === "" ? "" : Number(e.target.value) }); }} /></label>)}</div>
            <button type="submit" disabled={busy}>{c.saveSettings}</button>
          </form>
        </section>
      </div>
    </div>

    <section className="ta-panel ta-schedule">
      <div className="ta-toolbar"><h2>{c.published}</h2>
        <select aria-label={c.trainer} value={filters.trainer} onChange={(e) => setFilters({ ...filters, trainer: e.target.value })}><option value="all">{c.allTrainers}</option><option value="none">{c.noTrainer}</option>{trainers.map((tr) => <option key={tr.id} value={String(tr.id)}>{tr.name || `#${tr.id}`}</option>)}</select>
        <select aria-label={c.status} value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>{["all", "free", "booked", "closed"].map((v) => <option key={v} value={v}>{c[`show_${v}`]}</option>)}</select>
        <input type="date" aria-label={c.day} value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })} />
        {(filters.day || filters.trainer !== "all" || filters.state !== "all") && <button type="button" onClick={() => setFilters({ trainer: "all", state: "all", day: "" })}>{c.clearFilters}</button>}
      </div>
      <p className="ta-hint">{c.summary.replace("{times}", totals.times).replace("{places}", totals.places).replace("{booked}", totals.booked)} · {c.lead}: {config.leadHours} · {c.horizon}: {config.horizonDays}</p>

      {selected.size > 0 && <div className="ta-bulkbar" role="region" aria-label={c.selectedCount.replace("{n}", selected.size)}>
        <strong>{c.selectedCount.replace("{n}", selected.size)}</strong>
        {confirming === "bulk" ? <><span>{c.deleteConfirm}</span><button type="button" className="ta-danger" disabled={busy} onClick={() => bulk([...selected], "delete")}>{c.deleteYes}</button><button type="button" onClick={() => setConfirming(null)}>{c.neverMind}</button></>
          : <><button type="button" disabled={busy} onClick={() => bulk([...selected], "close")}><Lock size={15} />{c.close}</button><button type="button" disabled={busy} onClick={() => bulk([...selected], "open")}><Unlock size={15} />{c.reopen}</button><button type="button" className="ta-danger-soft" disabled={busy} onClick={() => setConfirming("bulk")}><Trash2 size={15} />{c.delete}</button><button type="button" onClick={() => setSelected(new Set())}>{c.clearSelection}</button></>}
      </div>}

      {!days.length ? <p className="ta-empty">{slots.length ? c.noMatches : c.noSlots}</p> : days.map(([day, times]) => {
        const list = [...times.values()].flat(); const ids = list.map((s) => s.id);
        const allOn = ids.every((id) => selected.has(id)); const empty = deletable(list);
        const booked = list.reduce((n, s) => n + s.reservedCount, 0);
        return <div className="ta-day" key={day}>
          <div className="ta-day-head">
            <label className="ta-check"><input type="checkbox" checked={allOn} onChange={(e) => toggleSelect(ids, e.target.checked)} aria-label={c.selectDay} /></label>
            <div><h3>{dayTitle(list[0].startAt, locale)}</h3><small>{c.daySummary.replace("{times}", times.size).replace("{places}", list.reduce((n, s) => n + s.capacity, 0)).replace("{booked}", booked)}</small></div>
            {confirming === `day:${day}` ? <div className="ta-actions"><span className="ta-confirm-text">{c.deleteDayConfirm.replace("{n}", empty.length)}</span><button type="button" className="ta-danger" disabled={busy} onClick={() => bulk(empty, "delete")}>{c.deleteYes}</button><button type="button" onClick={() => setConfirming(null)}>{c.neverMind}</button></div>
              : <button type="button" className="ta-danger-soft" disabled={busy || !empty.length} onClick={() => setConfirming(`day:${day}`)}><Trash2 size={15} />{c.deleteDay}</button>}
          </div>
          {[...times.entries()].map(([at, rows]) => <div className="ta-time" key={at}>
            <div className="ta-time-label"><strong>{time(at, locale)}</strong><small>{minutes(rows[0])} {t.minutes}</small></div>
            <div className="ta-time-rows">{rows.map((s) => {
              const names = s.bookings?.map((b) => b.name).join(", ");
              const state = !s.enabled ? "closed" : s.reservedCount >= s.capacity ? "full" : s.reservedCount ? "partly" : "free";
              return <div key={s.id} className={`ta-slot-row is-${state}`}>
                <div className="ta-slot-main">
                  <label className="ta-check"><input type="checkbox" checked={selected.has(s.id)} onChange={(e) => toggleSelect([s.id], e.target.checked)} aria-label={`${time(at, locale)} ${s.trainer?.name || c.noTrainer}`} /></label>
                  <span className="ta-who"><UserRound size={15} />{s.trainer?.name || c.noTrainer}</span>
                  <span className={`ta-badge ta-state-${state}`}>{state === "closed" ? c.closed : s.capacity > 1 ? c.placesBooked.replace("{booked}", s.reservedCount).replace("{places}", s.capacity) : s.reservedCount ? c.bookedLabel : c.freeLabel}</span>
                  {names && <span className="ta-names">{names}</span>}
                </div>
                <div className="ta-actions">
                  <button type="button" disabled={busy} aria-expanded={editing === s.id} onClick={() => setEditing(editing === s.id ? null : s.id)}><Pencil size={14} />{c.edit}</button>
                  {!s.trainerId && <><button type="button" disabled={busy || s.capacity <= Math.max(1, s.reservedCount)} aria-label={c.removePlace} onClick={() => patch(s, { capacity: s.capacity - 1 })}>−</button><button type="button" disabled={busy || s.capacity >= 100} aria-label={c.addPlace} onClick={() => patch(s, { capacity: s.capacity + 1 })}>+</button></>}
                  <button type="button" disabled={busy} onClick={() => patch(s, { enabled: !s.enabled })}>{s.enabled ? <Lock size={14} /> : <Unlock size={14} />}{s.enabled ? c.close : c.reopen}</button>
                  {s._count?.bookings ? <span className="ta-kept" title={c.cannotDelete}>{c.hasBookings}</span>
                    : confirming === `slot:${s.id}` ? <button type="button" className="ta-danger" disabled={busy} onClick={() => bulk([s.id], "delete")}>{c.deleteYes}</button>
                    : <button type="button" className="ta-danger-soft" disabled={busy} aria-label={`${c.delete} ${time(at, locale)}`} onClick={() => setConfirming(`slot:${s.id}`)}><Trash2 size={14} /></button>}
                </div>
                {editing === s.id && <SlotEditor key={`${s.id}-${s.startAt}-${s.trainerId}-${s.capacity}`} slot={s} trainers={trainers} locale={locale} busy={busy} onClose={() => setEditing(null)} onSave={(data) => action(async () => { await api.patch(`/admin/trial-bookings/slots/${s.id}`, data); setEditing(null); })} />}
              </div>;
            })}</div>
          </div>)}
        </div>;
      })}
    </section>
  </>;
}
