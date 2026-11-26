"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import api, { clearCsrfToken } from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { APP_ROUTES, routeHref } from "@/lib/routes";
import { getDictionary } from "@/app/i18n";
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
    eyebrow: "START WITH A FREE LIVE SESSION",
    title: "Tell us what matters.",
    titleAccent: "We’ll listen live.",
    intro: "Share what you want English to help you do. Your coach will assess your level in a real conversation, then recommend the right next step.",
    time: "2-minute onboarding",
    noPayment: "No payment details",
    whatsapp: "Confirmation by WhatsApp",
    formTitle: "Request your free session",
    formSubtitle: "Share your goal and availability. Your coach will check your English during the live session.",
    step1: "About you",
    step2: "Your goal",
    step3: "Your availability",
    journey1: "Quick onboarding",
    journey2: "Free live session",
    journey3: "Plan recommendation",
    name: "Your name",
    namePlaceholder: "e.g. Ahmed Hassan",
    phone: "Mobile / WhatsApp number",
    phonePlaceholder: "+20 10 1234 5678",
    email: "Email address",

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
    note: "What do you want to be able to do in English?",
    notePlaceholder: "For example: lead meetings without freezing, pass an interview, or speak more naturally while travelling…",
    account: "Your Speexify account",
    accountNew: "Use your email to create an account and request your free session.",
    accountExisting: "This request will be linked to the account below.",
    signIn: "Already have an account? Sign in",
    emailInUse: "This email is already registered. Sign in to finish your request.",
    sendCode: "Email me a verification code",
    sendingCode: "Sending your code…",
    verifyTitle: "Verify your email",
    verifyBody: "Enter the 6-digit code we sent to {email}, then choose your password.",
    code: "Email verification code",
    password: "Create a password",
    passwordHint: "At least 8 characters, including an English letter and a number.",
    editDetails: "Edit your details",
    resend: "Resend code",
    resendWait: "Resend in {seconds}s",
    codeInvalid: "Enter the 6-digit code from your email.",
    codeExpired: "Your code expired or can no longer be used. Request a new one.",
    passwordInvalid: "Use at least 8 characters, including an English letter and a number.",
    emailInvalid: "Enter a valid email address for your account.",
    phoneInvalid: "Enter a valid WhatsApp number with 8 to 15 digits.",
    rateLimit: "Please wait before trying again.",
    accountSubmit: "Create account and request free session",
    submit: "Request my free session",
    accountCreated: "Account created · Request received",
    alreadyTitle: "You already have a free session request",
    alreadyBody: "Your existing request is linked to this account. You can follow up with us on WhatsApp if you need to change your availability.",
    dashboard: "Go to my account",
    policyPrefix: "Your information is handled according to our",
    privacyLink: "Privacy Policy",
    submitting: "Sending your request…",
    required: "Please add your name, WhatsApp number, goal, what you want to achieve, and at least one available hour.",
    error: "Something went wrong. Please try again in a moment.",
    successEyebrow: "YOU’RE IN",
    successTitle: "Your free session is on its way.",
    successBody: "Thanks, {name}. We’ll message you on WhatsApp to confirm a time with a coach who can understand your goal and assess your English live.",
    successNote: "After the session, you’ll receive a clear starting level and a personalised package recommendation.",
    successStep1: "We confirm your time",
    successStep2: "You meet your coach for free",
    successStep3: "You choose the recommended plan",
    planContext: "You were viewing {plan}. No need to decide yet—your coach will confirm the best fit after the free session.",
    chooseGoal: "Choose one",
  },
  ar: {
    eyebrow: "ابدأ بجلسة مباشرة مجانية",
    title: "قولنا إيه المهم ليك.",
    titleAccent: "وهنسمعك لايف.",
    intro: "شاركنا إنت عايز الإنجليزي يساعدك في إيه. المدرّب هيقيّم مستواك في محادثة حقيقية، وبعدها يرشحلك الخطوة الأنسب.",
    time: "بداية في دقيقتين",
    noPayment: "من غير بيانات دفع",
    whatsapp: "هنأكد معاك على واتساب",
    formTitle: "اطلب جلستك المجانية",
    formSubtitle: "قولنا هدفك والمواعيد اللي تناسبك. المدرّب هيقيّم مستواك في الجلسة المباشرة.",
    step1: "بياناتك",
    step2: "هدفك",
    step3: "مواعيدك",
    journey1: "تعريف سريع",
    journey2: "جلسة مباشرة مجانية",
    journey3: "ترشيح الخطة المناسبة",
    name: "اسمك",
    namePlaceholder: "مثال: أحمد حسن",
    phone: "رقم الموبايل (واتساب)",
    phonePlaceholder: "+20 10 1234 5678",
    email: "الإيميل",

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
    note: "عايز تقدر تعمل إيه بالإنجليزي؟",
    notePlaceholder: "مثال: أقود ميتنج من غير ما أتردد، أنجح في مقابلة، أو أتكلم بطبيعية أكتر في السفر…",
    account: "حسابك على Speexify",
    accountNew: "استخدم إيميلك عشان تعمل حساب وتطلب جلستك المجانية.",
    accountExisting: "هنربط طلب الجلسة بالحساب اللي ظاهر هنا.",
    signIn: "عندك حساب بالفعل؟ سجّل دخول",
    emailInUse: "الإيميل ده مسجّل بالفعل. سجّل دخولك عشان تكمّل الطلب.",
    sendCode: "ابعت لي رمز التأكيد على الإيميل",
    sendingCode: "بنبعت لك الرمز…",
    verifyTitle: "أكّد إيميلك",
    verifyBody: "اكتب الرمز المكوّن من ٦ أرقام اللي بعتناه على {email}، وبعدها اختار كلمة المرور.",
    code: "رمز تأكيد الإيميل",
    password: "اختار كلمة مرور",
    passwordHint: "٨ خانات على الأقل، فيها حرف إنجليزي ورقم.",
    editDetails: "عدّل بياناتك",
    resend: "ابعت الرمز تاني",
    resendWait: "إعادة الإرسال بعد {seconds} ثانية",
    codeInvalid: "اكتب رمز التأكيد المكوّن من ٦ أرقام اللي وصلك على الإيميل.",
    codeExpired: "الرمز انتهت صلاحيته أو مبقاش متاح. اطلب رمز جديد.",
    passwordInvalid: "اختار كلمة مرور من ٨ خانات على الأقل، وفيها حرف إنجليزي ورقم.",
    emailInvalid: "اكتب إيميل صحيح عشان نعمل حسابك.",
    phoneInvalid: "اكتب رقم واتساب صحيح من ٨ لـ١٥ رقم.",
    rateLimit: "استنى شوية قبل ما تجرّب تاني.",
    accountSubmit: "اعمل حساب واطلب جلستي المجانية",
    submit: "اطلب جلستي المجانية",
    accountCreated: "حسابك اتعمل وطلبك وصل",
    alreadyTitle: "عندك طلب جلسة مجانية بالفعل",
    alreadyBody: "طلبك موجود على الحساب ده. لو محتاج تعدّل مواعيدك، تقدر تتابع معانا على واتساب.",
    dashboard: "افتح حسابي",
    policyPrefix: "بنتعامل مع بياناتك حسب",
    privacyLink: "سياسة الخصوصية",
    submitting: "بنجهّز طلبك…",
    required: "كمّل اسمك ورقم واتساب وهدفك والنتيجة اللي عايز توصل لها، واختار ساعة مناسبة على الأقل.",
    error: "حصلت مشكلة. جرّب تاني كمان شوية.",
    successEyebrow: "وصلنا طلبك",
    successTitle: "تمام، هنرتّب جلستك المجانية.",
    successBody: "شكرًا يا {name}. هنبعتلك على واتساب عشان نحدد معاد مع مدرّب يفهم هدفك ويقيّم مستواك لايف.",
    successNote: "بعد الجلسة، هتعرف مستوى البداية وهتاخد ترشيح شخصي للباقة المناسبة.",
    successStep1: "بنأكد معاك المعاد",
    successStep2: "بتقابل المدرّب مجانًا",
    successStep3: "بتختار الخطة الموصى بيها",
    planContext: "كنت بتشوف باقة {plan}. مش لازم تقرر دلوقتي—المدرّب هيأكد أنسب اختيار بعد الجلسة المجانية.",
    chooseGoal: "اختار هدفك",
  },
};

function getLabel(option, locale, key = "en") {
  return option?.[locale === "ar" ? "ar" : key] || option?.en || option?.value;
}

const EMPTY_FORM = {
  name: null,
  phone: null,
  email: "",
  goal: "",
  availabilitySlots: [],
  notes: "",
};
const SIGN_IN_DRAFT_KEY = "speexify-free-session-draft";
const CODE_COOLDOWN_SECONDS = 60;
const AUTH_TIMEOUT_MS = 45_000;

function localDigits(value) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) & 15));
}

function loadSignInDraft() {
  try {
    const stored = window.sessionStorage.getItem(SIGN_IN_DRAFT_KEY);
    window.sessionStorage.removeItem(SIGN_IN_DRAFT_KEY);
    if (!stored) return null;
    const { form, savedAt } = JSON.parse(stored);
    if (Date.now() - savedAt < 30 * 60_000) return form;
  } catch {
    // The learner can enter their details again if browser storage is unavailable.
  }
  return null;
}

export default function StarterSessionPage({ locale = "en" }) {
  const searchParams = useSearchParams();
  const { user, checking, refresh } = useAuth();
  const isArabic = locale === "ar";
  const copy = COPY[isArabic ? "ar" : "en"];
  const [verifyLead, verifyTail] = copy.verifyBody.split("{email}");
  const packageDict = useMemo(() => getDictionary(locale, "packages"), [locale]);
  const planId = useMemo(() => {
    const value = String(searchParams.get("plan") || "").trim();
    return /^[a-z0-9-]{1,40}$/i.test(value) ? value : "";
  }, [searchParams]);
  const selectedPlanLabel = planId
    ? packageDict[`plan_${planId}_title`] || ""
    : "";
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sentTo, setSentTo] = useState("");
  const pendingRef = useRef(false);
  const availabilityGridRef = useRef(null);
  const codeInputRef = useRef(null);
  const successHeadingRef = useRef(null);
  const name = form.name ?? user?.name ?? "";
  const phone = form.phone ?? user?.phone ?? "";
  const email = (user?.email ?? form.email).trim().toLowerCase();
  const resume = searchParams.get("resume") === "1";
  const bookHref = routeHref(APP_ROUTES.starterSession, locale);
  const loginHref = routeHref(APP_ROUTES.login, locale,
    `?next=${encodeURIComponent(`${bookHref}?resume=1${planId ? `&plan=${planId}` : ""}`)}`);

  useEffect(() => {
    if (!resume) return;
    const draft = loadSignInDraft();
    if (draft) setForm({ ...EMPTY_FORM, ...draft });
  }, [resume]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "verify") codeInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (result) successHeadingRef.current?.focus();
  }, [result]);

  function saveSignInDraft() {
    try {
      window.sessionStorage.setItem(SIGN_IN_DRAFT_KEY, JSON.stringify({
        form: { ...form, name, phone },
        savedAt: Date.now(),
      }));
    } catch {
      // Signing in is still available when browser storage is blocked.
    }
  }

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

  function reportError(err, operation) {
    const { status, data } = err?.response || {};
    if (status === 409) {
      setPassword("");
      setStep("details");
      setError(copy.emailInUse);
    } else if (data?.code === "INVALID_VERIFICATION_CODE") {
      setError(copy.codeInvalid);
    } else if (["VERIFICATION_EXPIRED", "VERIFICATION_ATTEMPTS_EXHAUSTED"].includes(data?.code)) {
      setError(copy.codeExpired);
    } else if (data?.code === "INVALID_PASSWORD") {
      setError(copy.passwordInvalid);
    } else if (status === 429) {
      setError(copy.rateLimit);
    } else if (status === 400 && operation === "send") {
      setError(copy.emailInvalid);
    } else {
      setError(copy.error);
    }
  }

  async function run(operation, work) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (err) {
      reportError(err, operation);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  function sendCode() {
    return run("send", async () => {
      await api.post("/auth/register/start", { email, locale }, { timeout: AUTH_TIMEOUT_MS });
      setSentTo(email);
      setCode("");
      setCooldown(CODE_COOLDOWN_SECONDS);
      setStep("verify");
      codeInputRef.current?.focus();
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (pendingRef.current || (checking && !user)) return;

    const cleanPhone = localDigits(phone.trim());
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (name.trim().length < 2 || !form.goal || !form.notes.trim() || !form.availabilitySlots.length) {
      setError(copy.required);
      return;
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15 || cleanPhone.length > 40) {
      setError(copy.phoneInvalid);
      return;
    }
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(copy.emailInvalid);
      return;
    }

    if (!user && step === "details") {
      if (email === sentTo && cooldown > 0) {
        setError("");
        setStep("verify");
        return;
      }
      await sendCode();
      return;
    }

    if (!user && !/^\d{6}$/.test(code)) {
      setError(copy.codeInvalid);
      return;
    }
    if (!user && (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password))) {
      setError(copy.passwordInvalid);
      return;
    }

    const trial = {
      goal: form.goal,
      availabilitySlots: form.availabilitySlots,
      notes: [
        form.notes.trim(),
        selectedPlanLabel ? `Package viewed before booking: ${selectedPlanLabel} (${planId})` : "",
      ].filter(Boolean).join("\n\n"),
      locale,
    };

    await run("submit", async () => {
      const contact = { name: name.trim(), phone: cleanPhone };
      const { data } = user
        ? await api.post("/free-session-requests/account", { ...contact, ...trial })
        : await api.post("/auth/register/complete-trial", {
            ...contact, email, code, password, trial,
          }, { timeout: AUTH_TIMEOUT_MS });

      if (!data?.requestId || (!user && !data?.user?.id)) throw new Error("Incomplete trial submission");
      setPassword("");
      setCode("");
      setResult({ accountCreated: !user, alreadyRequested: data.alreadyRequested, name: name.trim() });
      if (!user) {
        clearCsrfToken();
        void refresh();
      }
    });
  }

  if (result) {
    return (
      <main className="starter-page starter-page--success" dir={isArabic ? "rtl" : "ltr"}>
        <section className="starter-success" aria-live="polite">
          <div className="starter-success__icon"><CheckCircle2 size={34} aria-hidden="true" /></div>
          <p className="starter-kicker">{result.accountCreated ? copy.accountCreated : copy.successEyebrow}</p>
          <h1 ref={successHeadingRef} tabIndex={-1}>{result.alreadyRequested ? copy.alreadyTitle : copy.successTitle}</h1>
          <p>{result.alreadyRequested ? copy.alreadyBody : copy.successBody.replace("{name}", result.name)}</p>
          {!result.alreadyRequested && (
            <>
              <div className="starter-success__note"><MessageCircle size={18} aria-hidden="true" />{copy.successNote}</div>
              <div className="starter-success__steps">
                {[copy.successStep1, copy.successStep2, copy.successStep3].map((item, index) => (
                  <div key={item}><span>{index + 1}</span><strong>{item}</strong></div>
                ))}
              </div>
            </>
          )}
          <Link className="starter-button starter-button--secondary" href={routeHref(APP_ROUTES.dashboard, locale)}>
            {copy.dashboard}
          </Link>
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
            <div><span>1</span>{copy.journey1}</div>
            <div><span>2</span>{copy.journey2}</div>
            <div><span>3</span>{copy.journey3}</div>
          </div>
        </section>

        <section className="starter-card" aria-labelledby="starter-form-title">
          <div className="starter-card__topline"><span>01</span><span>{isArabic ? "خطوات بسيطة" : "A simple start"}</span></div>
          <div className="starter-card__heading">
            <div><h2 id="starter-form-title">{copy.formTitle}</h2><p>{copy.formSubtitle}</p></div>
            <span className="starter-free-pill">FREE</span>
          </div>
          {selectedPlanLabel && (
            <p className="starter-plan-context">
              {copy.planContext.replace("{plan}", selectedPlanLabel)}
            </p>
          )}

          <form onSubmit={submit} noValidate aria-busy={busy}>
            <fieldset className="starter-details" disabled={busy} hidden={step === "verify" && !user}>
              <div className="starter-form-section">
                <div className="starter-section-label"><span>1</span><div><strong>{copy.step1}</strong><small>{isArabic ? "محتاجين شوية بيانات عشان نتواصل معاك" : "Just the essentials"}</small></div></div>
                <div className="starter-fields starter-fields--two">
                  <label className="starter-field"><span>{copy.name} <em>*</em></span><input name="name" value={name} maxLength={120} onChange={(event) => update("name", event.target.value)} placeholder={copy.namePlaceholder} autoComplete="name" required /></label>
                  <label className="starter-field"><span>{copy.phone} <em>*</em></span><input name="phone" value={phone} maxLength={40} onChange={(event) => update("phone", event.target.value)} placeholder={copy.phonePlaceholder} autoComplete="tel" inputMode="tel" dir="ltr" required /></label>
                </div>
              </div>

              <div className="starter-form-section">
                <div className="starter-section-label"><span>2</span><div><strong>{copy.step2}</strong><small>{isArabic ? "عشان نخلي الجلسة مناسبة ليك" : "So we can make it useful"}</small></div></div>
                <fieldset className="starter-fieldset"><legend>{copy.goal} <em>*</em></legend><div className="starter-goal-grid" role="radiogroup" aria-label={copy.goal}>{GOAL_OPTIONS.map((option) => { const selected = form.goal === option.value; return <button type="button" role="radio" aria-checked={selected} className={`starter-choice starter-choice--goal ${selected ? "is-selected" : ""}`} key={option.value} onClick={() => update("goal", selected ? "" : option.value)}><span>{getLabel(option, locale)}</span><Check size={16} aria-hidden="true" /></button>; })}</div></fieldset>
                <label className="starter-field"><span>{copy.note} <em>*</em></span><textarea rows="3" maxLength={selectedPlanLabel ? 1000 : 1200} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notePlaceholder} required /></label>
              </div>

              <div className="starter-form-section">
                <div className="starter-section-label"><span>3</span><div><strong>{copy.step3}</strong><small>{isArabic ? "اختار الأيام والساعات اللي تناسبك" : "Choose the days and hours that suit you"}</small></div></div>
                <fieldset className="starter-fieldset"><legend>{copy.availability} <em>*</em></legend><p className="starter-fieldset__hint">{copy.availabilityHint}<span>{availabilitySummary}</span></p><div className="starter-availability-grid"><div className="starter-availability-toolbar"><span>{copy.availabilityInstruction}</span><div className="starter-availability-toolbar__actions"><button className="starter-availability-nav" type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: -420, behavior: "smooth" })} aria-label={isArabic ? "عرض الساعات السابقة" : "Show earlier hours"}>{isArabic ? "→" : "←"} {copy.availabilityEarlier}</button><button className="starter-availability-nav" type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: 420, behavior: "smooth" })} aria-label={isArabic ? "عرض الساعات التالية" : "Show later hours"}>{copy.availabilityLater} {isArabic ? "←" : <ArrowRight size={13} aria-hidden="true" />}</button><button type="button" onClick={clearAvailability} disabled={!form.availabilitySlots.length}>{copy.availabilityClear}</button></div></div><div className="starter-availability-scroll" ref={availabilityGridRef}><div className="starter-availability-head"><span />{AVAILABILITY_HOURS.map((hour) => <span key={hour}>{formatAvailabilityHour(hour, isArabic)}</span>)}</div>{AVAILABILITY_DAYS.map((day) => <div className="starter-availability-row" key={day.value}><strong>{isArabic ? day.shortAr : day.shortEn}</strong>{AVAILABILITY_HOURS.map((hour) => { const value = availabilitySlot(day.value, hour); const selected = form.availabilitySlots.includes(value); return <label className={selected ? "is-selected" : ""} key={value} title={`${getLabel(day, locale)} · ${formatAvailabilityHour(hour, isArabic)}`}><input type="checkbox" name="availabilitySlots" value={value} checked={selected} aria-label={`${getLabel(day, locale)} ${formatAvailabilityHour(hour, isArabic)}`} onChange={() => toggleAvailability(value)} /><span aria-hidden="true" /></label>; })}</div>)}</div></div><p className="starter-availability-summary">{availabilitySummary}</p></fieldset>
              </div>

              <div className="starter-form-section">
                <div className="starter-section-label">
                  <span>4</span>
                  <div><strong>{copy.account}</strong><small>{user ? copy.accountExisting : copy.accountNew}</small></div>
                </div>
                <label className="starter-field">
                  <span>{copy.email} {!user && <em>*</em>}</span>
                  <input name="email" type="email" value={user ? email : form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder={copy.emailPlaceholder} autoComplete="email" dir="ltr"
                    maxLength={254} required readOnly={Boolean(user)} />
                </label>
                {!user && <Link className="starter-account-link" href={loginHref} onClick={saveSignInDraft}>{copy.signIn}</Link>}
              </div>
            </fieldset>

            {step === "verify" && !user && (
              <div className="starter-form-section">
                <div className="starter-section-label">
                  <span>4</span>
                  <div>
                    <strong>{copy.verifyTitle}</strong>
                    <small role="status">
                      {verifyLead}<bdi>{sentTo}</bdi>{verifyTail}
                    </small>
                  </div>
                </div>
                <label className="starter-field">
                  <span>{copy.code} <em>*</em></span>
                  <input ref={codeInputRef} name="code" value={code}
                    onChange={(event) => setCode(localDigits(event.target.value).replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric" autoComplete="one-time-code" dir="ltr" required />
                </label>
                <label className="starter-field">
                  <span>{copy.password} <em>*</em></span>
                  <input name="password" type="password" value={password}
                    onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" dir="ltr"
                    aria-describedby="starter-password-hint" minLength={8} maxLength={200} required />
                  <small className="starter-account-hint" id="starter-password-hint">{copy.passwordHint}</small>
                </label>
                <div className="starter-account-actions">
                  <button className="starter-account-link" type="button" disabled={busy} onClick={() => {
                    setPassword("");
                    setCode("");
                    setError("");
                    setStep("details");
                  }}>{copy.editDetails}</button>
                  <button className="starter-account-link" type="button" disabled={busy || cooldown > 0} onClick={sendCode}>
                    {cooldown ? copy.resendWait.replace("{seconds}", cooldown) : copy.resend}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="starter-form-error" role="alert">{error}</p>}
            <div className="starter-submit-row">
              <button className="starter-button" type="submit" disabled={busy || (checking && !user)}>
                {user || step === "verify"
                  ? (busy ? copy.submitting : user ? copy.submit : copy.accountSubmit)
                  : (busy ? copy.sendingCode : copy.sendCode)}
              </button>
              <p><ShieldCheck size={15} aria-hidden="true" /><span>{copy.policyPrefix}{" "}
                <Link href={routeHref(APP_ROUTES.privacy, locale)}>{copy.privacyLink}</Link>
              </span></p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
