"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Link2, MessageCircle, Plus } from "lucide-react";
import api from "@/lib/api";
import { formatTrial, normalizeTrialPhone } from "@/lib/trialBooking.mjs";
import { adminTrialCopy } from "./adminCopy";
import { trialCopy } from "./copy";

const PHONE = /^\+[1-9]\d{7,14}$/;
const when = (at, locale) => formatTrial(at, locale, "Africa/Cairo", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const day = (at, locale) => formatTrial(at, locale, "Africa/Cairo", { day: "numeric", month: "short" });

export function inviteLink(origin, invite) {
  return `${origin}${invite.locale === "ar" ? "/ar" : ""}/trial-booking#invite=${invite.token}`;
}
// Opens WhatsApp with the message written in the person's language. Nothing is sent automatically.
export function inviteWhatsapp(invite, link) {
  const text = adminTrialCopy[invite.locale === "ar" ? "ar" : "en"].inviteMessage.replace("{name}", invite.name.trim().split(/\s+/)[0]).replace("{link}", link);
  return `https://wa.me/${invite.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export default function TrialInvites({ locale }) {
  const c = adminTrialCopy[locale]; const statuses = trialCopy[locale].statuses;
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", locale: "ar", days: 14 }); const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [created, setCreated] = useState(null); const [origin, setOrigin] = useState("");
  const version = useRef(0);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const load = useCallback(async () => {
    const request = ++version.current; setLoading(true);
    try { const { data } = await api.get("/admin/trial-bookings/invites", { params: { q } }); if (request === version.current) setItems(data.items); }
    catch { if (request === version.current) setError(c.errors.DEFAULT); }
    finally { if (request === version.current) setLoading(false); }
  }, [q, c]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 200); return () => { clearTimeout(timer); version.current++; }; }, [load]);

  async function create(event) {
    event.preventDefault(); if (busy) return;
    const phone = normalizeTrialPhone(form.phone);
    const problem = form.name.trim().length < 2 ? "name" : !PHONE.test(phone) ? "phone" : "";
    setFieldError(problem);
    if (problem) { document.getElementById(`invite-${problem}`)?.focus(); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.post("/admin/trial-bookings/invites", { name: form.name.trim(), phone, locale: form.locale, days: Number(form.days) || 14 });
      setCreated(data); setForm((f) => ({ ...f, name: "", phone: "" })); await load();
    } catch (e) { setError(c.errors[e?.response?.data?.code] || c.errors.DEFAULT); }
    finally { setBusy(false); }
  }
  async function copy(invite) {
    try { await navigator.clipboard.writeText(inviteLink(origin, invite)); setError(""); setNotice(c.inviteCopied); }
    catch { setError(c.errors.DEFAULT); }
  }
  async function toggle(invite, active) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await api.patch(`/admin/trial-bookings/invites/${invite.id}`, { active }); setNotice(c.saved); await load(); }
    catch (e) { setError(c.errors[e?.response?.data?.code] || c.errors.DEFAULT); }
    finally { setBusy(false); }
  }
  const stateLabel = (invite) => invite.state === "BOOKED" ? `${c.inviteBooked} · ${when(invite.booking.slot.startAt, locale)}${invite.booking.status !== "RESERVED" ? ` · ${statuses[invite.booking.status]}` : ""}`
    : invite.state === "WAITING" ? c.inviteWaiting : invite.state === "EXPIRED" ? c.inviteExpired : c.inviteOff;
  const createdLink = created ? inviteLink(origin, created) : "";

  return <div className="ta-invites">
    <section className="ta-panel">
      <h2>{c.inviteTitle}</h2><p>{c.inviteHint}</p>
      <form onSubmit={create} noValidate>
        <div className="ta-grid">
          <label>{c.inviteName}<input id="invite-name" autoComplete="off" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={fieldError === "name"} /></label>
          <label>{c.phone}<input id="invite-phone" type="tel" dir="ltr" autoComplete="off" placeholder="010 0123 4567" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={fieldError === "phone"} /></label>
        </div>
        {fieldError && <p className="ta-warning" role="alert">{fieldError === "name" ? c.inviteNameError : c.invitePhoneError}</p>}
        <div className="ta-grid">
          <label>{c.inviteLanguage}<select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}><option value="ar">العربية</option><option value="en">English</option></select></label>
          <label>{c.inviteDays}<input type="number" min={1} max={60} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value === "" ? "" : Number(e.target.value) })} /></label>
        </div>
        <button className="ta-primary" disabled={busy} type="submit"><Plus size={16} />{c.inviteCreate}</button>
      </form>
      {created && <div className="ta-invite-ready" role="status">
        <strong><Link2 size={18} />{c.inviteReady.replace("{name}", created.name)}</strong>
        <input readOnly dir="ltr" value={createdLink} aria-label={c.inviteCopy} onFocus={(e) => e.target.select()} />
        <div className="ta-actions">
          <button type="button" className="ta-primary" onClick={() => copy(created)}><Copy size={16} />{c.inviteCopy}</button>
          <a href={inviteWhatsapp(created, createdLink)} target="_blank" rel="noreferrer"><MessageCircle size={16} />{c.inviteWhatsapp}</a>
        </div>
        <p className="ta-hint">{c.inviteWhatsappHint}</p>
      </div>}
    </section>
    <section className="ta-panel">
      <div className="ta-toolbar"><h2>{c.inviteList}</h2><input aria-label={c.search} placeholder={c.search} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {error && <p className="ta-error" role="alert">{error}</p>}{notice && <p className="ta-notice" role="status">{notice}</p>}
      {loading && !items.length ? <p role="status" className="ta-empty">{c.loading}</p> : !items.length ? <p className="ta-empty">{c.inviteEmpty}</p> : <div className="ta-invite-list">{items.map((invite) => {
        const link = inviteLink(origin, invite);
        return <div className="ta-invite" key={invite.id}>
          <div><strong>{invite.name}</strong><a dir="ltr" href={`tel:${invite.phone}`}>{invite.phone}</a></div>
          <div><span className={`ta-badge ta-invite-${invite.state.toLowerCase()}`}>{stateLabel(invite)}</span>
            <small>{invite.locale === "ar" ? "العربية" : "English"}{invite.state === "WAITING" ? ` · ${c.inviteUntil.replace("{date}", day(invite.expiresAt, locale))}` : ""}</small></div>
          <div className="ta-actions">
            <button type="button" onClick={() => copy(invite)}><Copy size={15} />{c.inviteCopy}</button>
            <a href={inviteWhatsapp(invite, link)} target="_blank" rel="noreferrer"><MessageCircle size={15} />{c.inviteWhatsapp}</a>
            {invite.state === "WAITING" && <button type="button" disabled={busy} onClick={() => toggle(invite, false)}>{c.inviteSwitchOff}</button>}
            {["EXPIRED", "OFF"].includes(invite.state) && <button type="button" disabled={busy} onClick={() => toggle(invite, true)}>{c.inviteSwitchOn}</button>}
          </div>
        </div>;
      })}</div>}
    </section>
  </div>;
}
