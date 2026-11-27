"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { calendarFile, downloadFile, formatTrial, groupSlots, makeToken, normalizeTrialPhone, period } from "@/lib/trialBooking.mjs";
import { trialCopy } from "./copy";
import "@/styles/trial-booking.scss";

export default function TrialBookingPage({ locale = "en" }) {
  const c = trialCopy[locale]; const ar = locale === "ar"; const prefix = ar ? "/ar" : "";
  const [slots, setSlots] = useState([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  const [timezone, setTimezone] = useState("Africa/Cairo"); const [zones, setZones] = useState(["Africa/Cairo"]);
  const [day, setDay] = useState(""); const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [website, setWebsite] = useState("");
  const [booking, setBooking] = useState(null); const [rescheduling, setRescheduling] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [fieldError, setFieldError] = useState({});
  const [cancelPrompt, setCancelPrompt] = useState(false); const [copied, setCopied] = useState(false); const [manageLink, setManageLink] = useState("");
  const token = useRef(null); const strip = useRef(null); const successHeading = useRef(null); const submitting = useRef(false);
  const format = (value, options) => formatTrial(value, locale, timezone, options);
  const message = (e) => c.errors[e?.response?.data?.code] || (e?.response?.status === 429 ? c.errors.RATE_LIMITED : c.errors.DEFAULT);
  const refresh = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try { const { data } = await api.get("/trial-bookings/availability"); setSlots(data.slots); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo";
    setZones([...new Set([local, "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Australia/Sydney"])]);
    setTimezone(local);
    try {
      const draft = JSON.parse(sessionStorage.getItem("trial-language-draft") || "null");
      sessionStorage.removeItem("trial-language-draft");
      if (draft) { setName(draft.name || ""); setPhone(draft.phone || ""); setSelectedId(draft.selectedId); setDay(draft.day || ""); if (draft.timezone) setTimezone(draft.timezone); }
    } catch { /* Storage may be disabled. */ }
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get("manage");
    let pending;
    try { pending = sessionStorage.getItem("trial-pending-token"); } catch { /* optional recovery */ }
    const secret = fragment || pending;
    if (secret && /^[a-f0-9]{64}$/.test(secret)) {
      token.current = secret;
      setBusy(true);
      api.post("/trial-bookings/lookup", { token: secret }).then(({ data }) => {
        setBooking(data); setTimezone(data.timezone);
        window.history.replaceState(null, "", `${window.location.pathname}#manage=${secret}`);
        setManageLink(window.location.href);
      }).catch((e) => { if (fragment) setError(c.errors[e?.response?.data?.code] || c.errors.DEFAULT); }).finally(() => setBusy(false));
    }
    void refresh();
  }, [refresh, c]);
  useEffect(() => { if (booking && !rescheduling) successHeading.current?.focus(); }, [booking, rescheduling]);
  const groups = useMemo(() => groupSlots(slots, timezone), [slots, timezone]);
  const activeDay = groups.some(([key]) => key === day) ? day : groups[0]?.[0];
  const daySlots = groups.find(([key]) => key === activeDay)?.[1] || [];
  const selected = daySlots.find((slot) => slot.id === selectedId);
  const active = booking && ["RESERVED", "CONFIRMED"].includes(booking.status) && new Date(booking.slot.startAt) > new Date();
  const showBooking = booking && !rescheduling;
  function rememberLanguage() {
    try { sessionStorage.setItem("trial-language-draft", JSON.stringify({ name, phone, selectedId, day: activeDay, timezone })); } catch { /* optional */ }
  }
  function saved(data) {
    setBooking(data); setRescheduling(false); setCancelPrompt(false); setError("");
    const url = `${window.location.pathname}#manage=${token.current}`;
    window.history.replaceState(null, "", url); setManageLink(window.location.href);
    try { sessionStorage.removeItem("trial-pending-token"); } catch { /* optional */ }
  }
  async function submit(event) {
    event.preventDefault(); if (!selected || submitting.current) return;
    const normalized = normalizeTrialPhone(phone);
    const errors = rescheduling ? {} : { ...(name.trim().length < 2 ? { name: c.nameError } : {}), ...(!/^\+[1-9]\d{7,14}$/.test(normalized) ? { phone: c.phoneError } : {}) };
    setFieldError(errors);
    if (Object.keys(errors).length) { document.getElementById(errors.name ? "trial-name" : "trial-phone")?.focus(); return; }
    submitting.current = true; setBusy(true); setError("");
    try {
      if (!token.current) token.current = makeToken();
      try { sessionStorage.setItem("trial-pending-token", token.current); } catch { /* token remains in memory */ }
      const { data } = rescheduling
        ? await api.post("/trial-bookings/change", { token: token.current, action: "reschedule", slotId: selected.id })
        : await api.post("/trial-bookings", { token: token.current, slotId: selected.id, name: name.trim(), phone: normalized, timezone, locale, website });
      saved(data);
    } catch (e) { setError(message(e)); if (e?.response?.status === 409) await refresh(); }
    finally { setBusy(false); submitting.current = false; }
  }
  async function cancel() {
    if (submitting.current) return; submitting.current = true; setBusy(true); setError("");
    try { const { data } = await api.post("/trial-bookings/change", { token: token.current, action: "cancel" }); saved(data); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); submitting.current = false; }
  }
  function startAgain() {
    token.current = null; setBooking(null); setRescheduling(false); setSelectedId(null); setError(""); setManageLink("");
    window.history.replaceState(null, "", window.location.pathname); void refresh();
  }
  const otherHref = `${ar ? "" : "/ar"}/trial-booking${booking && token.current ? `#manage=${token.current}` : ""}`;
  return <div className="trial-page" dir={ar ? "rtl" : "ltr"} lang={locale}>
    <div className="trial-topline"><Link href={prefix || "/"} className="trial-wordmark">speexify<span>.</span></Link><Link href={otherHref} onClick={rememberLanguage} className="trial-language"><Globe2 size={17} />{ar ? "English" : "العربية"}</Link></div>
    <div className="trial-layout">
      <aside className="trial-intro"><p className="trial-eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="trial-lead">{c.intro}</p><div className="trial-benefits"><span><Sparkles size={18} />{c.free}</span><span><Check size={18} />{c.personal}</span><span><ShieldCheck size={18} />{c.noAccount}</span></div>
        <div className="trial-next"><span className="trial-icon"><CalendarDays size={22} /></span><h2>{c.next}</h2><p>{c.nextText}</p></div>
      </aside>
      <section className="trial-card" aria-busy={busy || loading}>
        {error && <div className="trial-error" role="alert">{error}</div>}
        {showBooking ? <div className="trial-success">
          <span className="trial-success-icon"><Check size={30} /></span><p className="trial-eyebrow">{c.statuses[booking.status]}</p>
          <h2 ref={successHeading} tabIndex={-1}>{booking.status === "CANCELLED" ? c.cancelled : booking.status === "CONFIRMED" ? c.confirmed : ["COMPLETED", "NO_SHOW"].includes(booking.status) ? c.finished : c.success}</h2>
          <p>{booking.status === "CANCELLED" ? c.cancelledText : booking.status === "CONFIRMED" ? c.confirmedText : c.successText}</p>
          <div className="trial-receipt"><strong>{format(booking.slot.startAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong><span>{format(booking.slot.startAt, { hour: "numeric", minute: "2-digit" })} – {format(booking.slot.endAt, { hour: "numeric", minute: "2-digit" })}</span><small>{timezone}</small><span>{booking.name}</span><span dir="ltr">{booking.phone}</span><small>{c.reference}: {booking.id.slice(0, 8).toUpperCase()}</small></div>
          {booking.status !== "CANCELLED" && <button className="trial-primary" onClick={() => downloadFile(calendarFile(booking), "speexify-trial.ics", "text/calendar;charset=utf-8")}><CalendarDays size={18} />{c.calendar}</button>}
          <button className="trial-secondary" onClick={async () => { try { await navigator.clipboard.writeText(manageLink); setCopied(true); } catch { document.getElementById("trial-private-link")?.select(); } }}>{copied ? c.copied : c.copy}</button>
          <label className="trial-link-label" htmlFor="trial-private-link">{c.linkHint}</label><input id="trial-private-link" className="trial-private-link" readOnly value={manageLink} dir="ltr" onFocus={(e) => e.target.select()} />
          {active ? <div className="trial-manage"><button disabled={busy} onClick={() => { setRescheduling(true); setSelectedId(null); setError(""); void refresh(); }}>{c.change}</button><button disabled={busy} onClick={() => setCancelPrompt(true)}>{c.cancel}</button></div> : <><p>{c.closed}</p><button className="trial-secondary" onClick={startAgain}>{c.newBooking}</button></>}
          {cancelPrompt && <div className="trial-cancel" role="group" aria-label={c.cancel}><p>{c.cancelPrompt}</p><button className="trial-secondary" disabled={busy} onClick={() => setCancelPrompt(false)}>{c.keep}</button><button className="trial-danger" disabled={busy} onClick={cancel}>{busy ? c.busy : c.cancelYes}</button></div>}
        </div> : <>
          <div className="trial-card-heading"><p className="trial-eyebrow">{c.progress}</p><h2>{c.choose}</h2><p>{c.chooseHint}</p></div>
          {rescheduling && <button className="trial-text-button" onClick={() => setRescheduling(false)}>{c.back}</button>}
          <label className="trial-timezone"><Globe2 size={16} /><span>{c.timezone}</span><select value={timezone} onChange={(e) => { setTimezone(e.target.value); setDay(""); setSelectedId(null); }}>{[...new Set([...zones, timezone])].map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>
          {loading ? <div className="trial-state" role="status">{c.loading}<div className="trial-skeleton" /></div> : loadError ? <div className="trial-state" role="alert"><p>{c.errors.DEFAULT}</p><button className="trial-secondary" onClick={refresh}>{c.retry}</button></div> : !groups.length ? <div className="trial-state"><CalendarDays size={36} /><h3>{c.empty}</h3><p>{c.emptyText}</p><Link className="trial-secondary" href={`${prefix}/contact`}>{c.contact}</Link></div> : <>
            <div className="trial-day-nav"><button type="button" aria-label={c.earlier} onClick={() => strip.current?.scrollBy({ left: ar ? 300 : -300, behavior: "smooth" })}>{ar ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button><span>{format(daySlots[0]?.startAt, { month: "long", year: "numeric" })}</span><button type="button" aria-label={c.later} onClick={() => strip.current?.scrollBy({ left: ar ? -300 : 300, behavior: "smooth" })}>{ar ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button></div>
            <div className="trial-days" ref={strip} role="group" aria-label={c.choose}>{groups.map(([key, list]) => <button type="button" key={key} aria-pressed={key === activeDay} onClick={() => { setDay(key); setSelectedId(null); }} className={key === activeDay ? "is-selected" : ""}><span>{format(list[0].startAt, { weekday: "short" })}</span><strong>{format(list[0].startAt, { day: "numeric" })}</strong><small>{format(list[0].startAt, { month: "short" })}</small><i aria-hidden="true" /><span className="trial-sr-only">{list.length} {c.available}</span></button>)}</div>
            <div className="trial-times" role="group" aria-label={c.chooseHint}>{["morning", "afternoon", "evening"].map((part) => {
              const list = daySlots.filter((s) => period(s.startAt, timezone) === part);
              return list.length ? <div className="trial-time-group" key={part}><h3>{c[part]}</h3><div>{list.map((s) => <button type="button" key={s.id} className={selected?.id === s.id ? "is-selected" : ""} aria-pressed={selected?.id === s.id} onClick={() => { setSelectedId(s.id); setError(""); }}>{format(s.startAt, { hour: "numeric", minute: "2-digit" })}{selected?.id === s.id && <Check size={15} aria-hidden="true" />}</button>)}</div></div> : null;
            })}</div>
            <form onSubmit={submit} noValidate>
              {selected ? <>
                <div className="trial-selection" aria-live="polite"><CalendarDays size={20} /><div><strong>{format(selected.startAt, { weekday: "long", month: "short", day: "numeric" })} · {format(selected.startAt, { hour: "numeric", minute: "2-digit" })}</strong><span><Clock3 size={14} />{Math.round((new Date(selected.endAt) - new Date(selected.startAt)) / 60000)} {c.minutes} · {timezone}</span></div></div>
                {!rescheduling && <fieldset disabled={busy} className="trial-fields"><legend>{c.details}</legend><p>{c.detailsHint}</p><label htmlFor="trial-name">{c.name}</label><input id="trial-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldError.name} aria-describedby={fieldError.name ? "trial-name-error" : undefined} />{fieldError.name && <span id="trial-name-error" className="trial-field-error">{fieldError.name}</span>}<label htmlFor="trial-phone">{c.phone}</label><input id="trial-phone" name="tel" type="tel" dir="ltr" autoComplete="tel" placeholder="+20 100 123 4567" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!fieldError.phone} aria-describedby={fieldError.phone ? "trial-phone-error" : "trial-phone-hint"} /><small id="trial-phone-hint">{c.phoneHint}</small>{fieldError.phone && <span id="trial-phone-error" className="trial-field-error">{fieldError.phone}</span>}<div className="trial-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div></fieldset>}
                <button className="trial-primary" disabled={busy} type="submit">{busy ? c.busy : rescheduling ? c.save : c.reserve}</button><p className="trial-privacy"><ShieldCheck size={15} /><span>{c.privacy} <Link href={`${prefix}/privacy`}>{c.privacyLink}</Link></span></p>
              </> : <p className="trial-select-hint"><Clock3 size={17} />{c.selectHint}</p>}
            </form>
          </>}
        </>}
      </section>
    </div>
  </div>;
}
