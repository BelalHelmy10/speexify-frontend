"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import "@/styles/free-session.scss";

const AVAILABILITY_DAYS = [
  { value: "sunday", shortEn: "Sun", shortAr: "الأحد", en: "Sunday", ar: "الأحد" },
  { value: "monday", shortEn: "Mon", shortAr: "الاثنين", en: "Monday", ar: "الاثنين" },
  { value: "tuesday", shortEn: "Tue", shortAr: "الثلاثاء", en: "Tuesday", ar: "الثلاثاء" },
  { value: "wednesday", shortEn: "Wed", shortAr: "الأربعاء", en: "Wednesday", ar: "الأربعاء" },
  { value: "thursday", shortEn: "Thu", shortAr: "الخميس", en: "Thursday", ar: "الخميس" },
  { value: "friday", shortEn: "Fri", shortAr: "الجمعة", en: "Friday", ar: "الجمعة" },
  { value: "saturday", shortEn: "Sat", shortAr: "السبت", en: "Saturday", ar: "السبت" },
];
const AVAILABILITY_HOURS = Array.from({ length: 17 }, (_, index) => index + 8);

function formatAvailabilityHour(hour, isArabic = false) {
  const normalized = hour === 24 ? 0 : hour;
  const suffix = normalized < 12 ? (isArabic ? "ص" : "AM") : (isArabic ? "م" : "PM");
  const display = normalized % 12 || 12;
  return `${display} ${suffix}`;
}

function availabilitySlot(day, hour) {
  return `${day} ${String(hour).padStart(2, "0")}:00`;
}

const GOAL_OPTIONS = [
  { value: "work", en: "Work & career", ar: "الشغل والتطور المهني" },
  { value: "travel", en: "Travel", ar: "السفر" },
  { value: "conversation", en: "Everyday conversation", ar: "المحادثات اليومية" },
  { value: "interviews", en: "Interviews", ar: "مقابلات العمل" },
  { value: "exams", en: "Exams", ar: "الامتحانات" },
  { value: "other", en: "Something else", ar: "هدف آخر" },
];

const COPY = {
  en: {
    eyebrow: "YOUR FIRST REP IS ON US",
    title: "Start speaking.",
    titleAccent: "For real.",
    intro: "Tell us a little about yourself and we’ll match you with a coach for one free, live conversation.",
    time: "2 minutes",
    noPayment: "No payment details",
    whatsapp: "Confirmation by WhatsApp",
    formTitle: "Book your free first session",
    formSubtitle: "Tell us which days and times usually work for you. We’ll confirm the exact slot on WhatsApp.",
    step1: "About you",
    step2: "What you want",
    step3: "Your availability",
    name: "Your name",
    namePlaceholder: "e.g. Ahmed Hassan",
    phone: "Mobile / WhatsApp number",
    phonePlaceholder: "+20 10 1234 5678",
    email: "Email address",
    optional: "Optional",
    emailPlaceholder: "you@example.com",
    goal: "What would you like to improve?",
    availability: "When are you usually free?",
    availabilityHint: "Select the hours that usually work for you",
    availabilityInstruction: "Choose as many hours as you like",
    availabilityEarlier: "Earlier hours",
    availabilityLater: "Show later hours",
    availabilityClear: "Clear all",
    availabilityEmpty: "No hours selected yet",
    availabilitySelected: "selected",
    note: "Anything we should know?",
    notePlaceholder: "A goal, an upcoming interview, or anything else…",
    submit: "Request my free session",
    submitting: "Sending your request…",
    privacy: "We’ll only use these details to arrange your session.",
    required: "Please complete your name, WhatsApp number, goal, and at least one available hour.",
    error: "Something went wrong. Please try again in a moment.",
    successEyebrow: "YOU’RE IN",
    successTitle: "Your free session is on its way.",
    successBody: "Thanks, {name}. We’ll message you on WhatsApp to confirm a time that works.",
    successNote: "Keep an eye on your phone — we usually reply within one business day.",
    back: "Back to home",
    chooseGoal: "Choose one",
  },
  ar: {
    eyebrow: "أول جلسة مجانية علينا",
    title: "اتكلم إنجليزي.",
    titleAccent: "بثقة.",
    intro: "جاوبنا على كام سؤال بسيط، وهنظبطلك جلسة مجانية مع مدرّب تتكلم معاه لايف.",
    time: "دقيقتين بس",
    noPayment: "من غير بيانات دفع",
    whatsapp: "هنأكد معاك على واتساب",
    formTitle: "احجز أول جلسة مجانية ليك",
    formSubtitle: "اختار الأيام والأوقات اللي تناسبك، وهنكلمك على واتساب عشان نحدد معاك المعاد.",
    step1: "بياناتك",
    step2: "هدفك",
    step3: "مواعيدك",
    name: "اسمك",
    namePlaceholder: "مثال: أحمد حسن",
    phone: "رقم الموبايل (واتساب)",
    phonePlaceholder: "+20 10 1234 5678",
    email: "الإيميل",
    optional: "اختياري",
    emailPlaceholder: "you@example.com",
    goal: "محتاج تطوّر الإنجليزي عشان إيه؟",
    availability: "بتكون فاضي إمتى؟",
    availabilityHint: "اختار الساعات اللي بتناسبك عادةً",
    availabilityInstruction: "اختار كل الساعات اللي تناسبك",
    availabilityEarlier: "الساعات اللي قبل كده",
    availabilityLater: "عرض الساعات اللي بعد كده",
    availabilityClear: "مسح الكل",
    availabilityEmpty: "لسه مفيش مواعيد متختارة",
    availabilitySelected: "اختيارات",
    note: "في حاجة مهمة تحب تعرفنا بيها؟",
    notePlaceholder: "هدف واضح، مقابلة عمل قريبة، أو أي حاجة تانية…",
    submit: "احجز جلستي المجانية",
    submitting: "بنجهّز طلبك…",
    privacy: "هنستخدم البيانات دي بس عشان نرتّب جلستك.",
    required: "كمّل اسمك ورقم واتساب والهدف واختار ساعة مناسبة على الأقل.",
    error: "حصلت مشكلة. جرّب تاني كمان شوية.",
    successEyebrow: "وصلنا طلبك",
    successTitle: "تمام، هنرتّب لك جلستك المجانية.",
    successBody: "شكرًا يا {name}. هنبعتلك على واتساب عشان نحدد معاك المعاد المناسب.",
    successNote: "خلي موبايلك قريب — هنتواصل معاك عادةً خلال يوم عمل.",
    back: "ارجع للرئيسية",
    chooseGoal: "اختار هدفك",
  },
};

function getLabel(option, locale, key = "en") {
  return option?.[locale === "ar" ? "ar" : key] || option?.en || option?.value;
}

export default function StarterSessionPage({ locale = "en" }) {
  const isArabic = locale === "ar";
  const copy = COPY[isArabic ? "ar" : "en"];
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    goal: "",
    availabilitySlots: [],
    notes: "",
  });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const availabilityGridRef = useRef(null);

  const selectedAvailabilityCount = form.availabilitySlots.length;
  const canSubmit = useMemo(
    () => Boolean(form.name.trim() && form.phone.trim() && form.goal && selectedAvailabilityCount),
    [form, selectedAvailabilityCount],
  );

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleAvailability = (value) => {
    setForm((current) => {
      const hasValue = current.availabilitySlots.includes(value);
      if (hasValue) {
        return { ...current, availabilitySlots: current.availabilitySlots.filter((slot) => slot !== value) };
      }
      return { ...current, availabilitySlots: [...current.availabilitySlots, value] };
    });
  };

  const clearAvailability = () => update("availabilitySlots", []);

  const availabilitySummary = useMemo(
    () => {
      const count = form.availabilitySlots.length;
      if (!count) return copy.availabilityEmpty;
      if (isArabic) return `${count} ${count === 1 ? "ميعاد مختار" : "مواعيد مختارة"}`;
      return `${count} ${copy.availabilitySelected}`;
    },
    [copy.availabilityEmpty, copy.availabilitySelected, form.availabilitySlots.length, isArabic],
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!canSubmit) {
      setError(copy.required);
      return;
    }

    setState("submitting");
    try {
      await api.post("/free-session-requests", {
        ...form,
        locale: isArabic ? "ar" : "en",
      });
      setState("success");
    } catch (submitError) {
      setState("idle");
      setError(submitError?.response?.data?.error || copy.error);
    }
  };

  if (state === "success") {
    return (
      <main className="starter-page starter-page--success" dir={isArabic ? "rtl" : "ltr"}>
        <section className="starter-success" aria-live="polite">
          <div className="starter-success__icon"><CheckCircle2 size={34} aria-hidden="true" /></div>
          <p className="starter-kicker">{copy.successEyebrow}</p>
          <h1>{copy.successTitle}</h1>
          <p>{copy.successBody.replace("{name}", form.name.trim())}</p>
          <div className="starter-success__note"><MessageCircle size={18} aria-hidden="true" />{copy.successNote}</div>
          <a className="starter-button starter-button--secondary" href={isArabic ? "/ar" : "/"}>{copy.back}<ArrowRight size={17} aria-hidden="true" /></a>
        </section>
      </main>
    );
  }

  return (
    <main className="starter-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="starter-orb starter-orb--one" aria-hidden="true" />
      <div className="starter-orb starter-orb--two" aria-hidden="true" />
      <div className="starter-layout">
        <section className="starter-intro">
          <div className="starter-brand-lockup" aria-label="Speexify">
            <span className="starter-brand-mark">S</span><span>Speexify</span>
          </div>
          <p className="starter-kicker">{copy.eyebrow}</p>
          <h1>{copy.title}<br /><span>{copy.titleAccent}</span></h1>
          <p className="starter-intro__body">{copy.intro}</p>

          <div className="starter-promises">
            <div><Clock3 size={18} aria-hidden="true" /><span>{copy.time}</span></div>
            <div><ShieldCheck size={18} aria-hidden="true" /><span>{copy.noPayment}</span></div>
            <div><MessageCircle size={18} aria-hidden="true" /><span>{copy.whatsapp}</span></div>
          </div>

          <div className="starter-steps" aria-label="Booking steps">
            <div><span>1</span>{copy.step1}</div>
            <div><span>2</span>{copy.step2}</div>
            <div><span>3</span>{copy.step3}</div>
          </div>
        </section>

        <section className="starter-card" aria-labelledby="starter-form-title">
          <div className="starter-card__topline"><span>01</span><span>{isArabic ? "خطوات بسيطة" : "A simple start"}</span></div>
          <div className="starter-card__heading">
            <div><h2 id="starter-form-title">{copy.formTitle}</h2><p>{copy.formSubtitle}</p></div>
            <span className="starter-free-pill">FREE</span>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="starter-form-section">
              <div className="starter-section-label"><span>1</span><div><strong>{copy.step1}</strong><small>{isArabic ? "محتاجين شوية بيانات عشان نتواصل معاك" : "Just the essentials"}</small></div></div>
              <div className="starter-fields starter-fields--two">
                <label className="starter-field"><span>{copy.name} <em>*</em></span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={copy.namePlaceholder} autoComplete="name" required /></label>
                <label className="starter-field"><span>{copy.phone} <em>*</em></span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder={copy.phonePlaceholder} autoComplete="tel" inputMode="tel" dir="ltr" required /></label>
              </div>
              <label className="starter-field"><span>{copy.email} <small>{copy.optional}</small></span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder={copy.emailPlaceholder} autoComplete="email" dir="ltr" /></label>
            </div>

            <div className="starter-form-section">
              <div className="starter-section-label"><span>2</span><div><strong>{copy.step2}</strong><small>{isArabic ? "عشان نخلي الجلسة مناسبة ليك" : "So we can make it useful"}</small></div></div>
              <fieldset className="starter-fieldset"><legend>{copy.goal} <em>*</em></legend><div className="starter-goal-grid" role="radiogroup" aria-label={copy.goal}>{GOAL_OPTIONS.map((option) => { const selected = form.goal === option.value; return <button type="button" role="radio" aria-checked={selected} className={`starter-choice starter-choice--goal ${selected ? "is-selected" : ""}`} key={option.value} onClick={() => update("goal", selected ? "" : option.value)}><span>{getLabel(option, locale)}</span><Check size={16} aria-hidden="true" /></button>; })}</div></fieldset>
            </div>

            <div className="starter-form-section">
              <div className="starter-section-label"><span>3</span><div><strong>{copy.step3}</strong><small>{isArabic ? "اختار الأيام والساعات اللي تناسبك" : "Choose the days and hours that suit you"}</small></div></div>
              <fieldset className="starter-fieldset"><legend>{copy.availability} <em>*</em></legend><p className="starter-fieldset__hint">{copy.availabilityHint}<span>{availabilitySummary}</span></p><div className="starter-availability-grid"><div className="starter-availability-toolbar"><span>{copy.availabilityInstruction}</span><div className="starter-availability-toolbar__actions"><button className="starter-availability-nav" type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: -420, behavior: "smooth" })} aria-label={isArabic ? "عرض الساعات السابقة" : "Show earlier hours"}>{isArabic ? "→" : "←"} {copy.availabilityEarlier}</button><button className="starter-availability-nav" type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: 420, behavior: "smooth" })} aria-label={isArabic ? "عرض الساعات التالية" : "Show later hours"}>{copy.availabilityLater} {isArabic ? "←" : <ArrowRight size={13} aria-hidden="true" />}</button><button type="button" onClick={clearAvailability} disabled={!form.availabilitySlots.length}>{copy.availabilityClear}</button></div></div><div className="starter-availability-scroll" ref={availabilityGridRef}><div className="starter-availability-head"><span />{AVAILABILITY_HOURS.map((hour) => <span key={hour}>{formatAvailabilityHour(hour, isArabic)}</span>)}</div>{AVAILABILITY_DAYS.map((day) => <div className="starter-availability-row" key={day.value}><strong>{isArabic ? day.shortAr : day.shortEn}</strong>{AVAILABILITY_HOURS.map((hour) => { const value = availabilitySlot(day.value, hour); const selected = form.availabilitySlots.includes(value); return <label className={selected ? "is-selected" : ""} key={value} title={`${getLabel(day, locale)} · ${formatAvailabilityHour(hour, isArabic)}`}><input type="checkbox" name="availabilitySlots" value={value} checked={selected} aria-label={`${getLabel(day, locale)} ${formatAvailabilityHour(hour, isArabic)}`} onChange={() => toggleAvailability(value)} /><span aria-hidden="true" /></label>; })}</div>)}</div></div><p className="starter-availability-summary">{availabilitySummary}</p></fieldset>
              <label className="starter-field"><span>{copy.note} <small>{copy.optional}</small></span><textarea rows="3" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notePlaceholder} /></label>
            </div>

            {error && <p className="starter-form-error" role="alert">{error}</p>}
            <div className="starter-submit-row"><button className="starter-button" type="submit" disabled={state === "submitting"}>{state === "submitting" ? copy.submitting : copy.submit}<ArrowRight size={18} aria-hidden="true" /></button><p><ShieldCheck size={15} aria-hidden="true" />{copy.privacy}</p></div>
          </form>
        </section>
      </div>
    </main>
  );
}
