"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { routeHref, APP_ROUTES } from "@/lib/routes";
import "@/styles/package-comparison.scss";

// Curated groups reference the semicolon-separated editorial features in
// lib/plans.js and both packages dictionaries. No string equality or assumed
// inheritance: an unspecified benefit is a question, never an exclusion.
const GROUPS = {
  individual: {
    fields: [],
    plans: {},
  },
  group: {
    fields: [],
    plans: {},
  },
  corporate: {
    fields: ["team", "delivery", "guidance", "reporting", "operations"],
    plans: {
      "corp-pilot": [[0], [1, 3], [2, 4], [5, 6], []],
      "corp-team": [[0], [1], [2, 4], [3, 5], [6, 7]],
      "corp-enterprise": [[0], [1], [2, 8], [3, 6, 7, 9], [4, 5]],
      "global-enterprise": [[0], [1], [2, 3, 9], [4, 7, 8], [5, 6]],
    },
  },
};

const COPY = {
  en: {
    eyebrow: "THE DETAILS THAT MATTER", title: "Find the right fit.",
    subtitle: "Compare sessions, coaching, and support. Choose what fits your goals.",
    individualSubtitle: "The same coaching experience. Compare session counts and choose the commitment that fits you.",
    individualNote: "Every one-on-one pack includes the same personal attention and support. The session count and price are what change.",
    groupSubtitle: "The same small-group coaching experience. Compare session counts and choose the commitment that fits you.",
    groupNote: "Every group pack includes the same coaching and support. The session count and price are what change.",
    corporateSubtitle: "Compare program scope, reporting, and support for your team.",
    shared: "In every pack", individual: "Live one-on-one coaching · Paid upfront in EGP",
    group: "Live practice in groups of 2–5 · Paid upfront in EGP",
    corporate: "Programs for teams · Pricing by proposal",
    first: "First package", second: "Compare with", detail: "Your experience",
    recommended: "Most chosen", total: "Pack total", perSession: "Per session",
    sessions: "Sessions", minutes: "min each", coach: "Your coach", scheduling: "Scheduling",
    practice: "Practice focus", feedback: "Feedback & resources", support: "Support",
    cohort: "Your group", community: "Community", team: "Team size", delivery: "Delivery",
    guidance: "Program support", reporting: "Reporting", operations: "Operations & integrations",
    ask: "Ask about this", view: "View pack", contact: "Discuss program",
    note: "Each cell shows the benefits listed for that pack. “Ask about this” means the detail needs confirmation, not that the benefit is excluded.",
    help: "Need a hand choosing?", helpLink: "Talk to us", caption: "Package comparison",
    loading: "Loading prices…", unavailable: "Price unavailable",
  },
  ar: {
    eyebrow: "التفاصيل اللي تفرق", title: "اختار الأنسب ليك.",
    subtitle: "قارن الجلسات والتدريب والدعم، واختار اللي يناسب أهدافك.",
    individualSubtitle: "نفس تجربة التدريب. قارن عدد الجلسات واختار الالتزام اللي يناسبك.",
    individualNote: "كل باقة فردية بتقدّم نفس الاهتمام الشخصي والدعم. الاختلاف في عدد الجلسات والسعر.",
    groupSubtitle: "نفس تجربة التدريب في مجموعة صغيرة. قارن عدد الجلسات واختار الالتزام اللي يناسبك.",
    groupNote: "كل باقة جماعية بتقدّم نفس التدريب والدعم. الاختلاف في عدد الجلسات والسعر.",
    corporateSubtitle: "قارن نطاق البرامج والتقارير والدعم لفريقك.",
    shared: "في كل باقة", individual: "تدريب فردي مباشر · الدفع مقدمًا بالجنيه المصري",
    group: "ممارسة مباشرة في مجموعات من 2–5 · الدفع مقدمًا بالجنيه المصري",
    corporate: "برامج للفرق · السعر حسب العرض",
    first: "الباقة الأولى", second: "قارن مع", detail: "تجربتك",
    recommended: "الأكثر اختيارًا", total: "إجمالي الباقة", perSession: "للجلسة",
    sessions: "الجلسات", minutes: "دقيقة للجلسة", coach: "مدرّبك", scheduling: "الجدولة",
    practice: "محور الممارسة", feedback: "الملاحظات والموارد", support: "الدعم",
    cohort: "مجموعتك", community: "المجتمع", team: "حجم الفريق", delivery: "طريقة التدريب",
    guidance: "دعم البرنامج", reporting: "التقارير", operations: "التشغيل والتكاملات",
    ask: "اسأل عن التفاصيل", view: "شوف الباقة", contact: "ناقش البرنامج",
    note: "كل خانة بتعرض المزايا المذكورة للباقة. «اسأل عن التفاصيل» معناها إن المعلومة محتاجة تأكيد، مش إن الميزة غير متاحة.",
    help: "محتاج مساعدة في الاختيار؟", helpLink: "كلّمنا", caption: "مقارنة الباقات",
    loading: "جارٍ تحميل الأسعار…", unavailable: "السعر غير متاح",
  },
};

export default function PackageComparison({ plans, kind, locale, prices, loading, ready }) {
  const c = COPY[locale] || COPY.en;
  const config = GROUPS[kind];
  const id = useId();
  const [selection, setPair] = useState(null);
  // The live catalog is empty on the first render. Derive the initial pair
  // once plans exist, and never render columns for missing packages.
  if (plans.length < 2) return null;
  const pair = selection?.every(i => plans[i]) ? selection : [0, Math.max(1, plans.findIndex(p => p.isPopular))];
  const pick = (slot, next) => {
    const previous = pair;
    const updated = [...previous];
    if (next === previous[1 - slot]) updated[1 - slot] = previous[slot];
    updated[slot] = next;
    setPair(updated);
  };
  const columnClass = (i) => plans[i].isPopular ? "pcx-featured" : "";
  const rows = kind === "corporate" ? config.fields : ["total", "perSession", "sessions", ...config.fields];
  const renderValue = (field, plan, i) => {
    if (field === "total" || field === "perSession") {
      if (!ready) return <span className="pcx-muted">{loading ? c.loading : c.unavailable}</span>;
      return <span className="pcx-price" dir="auto">{field === "total" ? prices[i]?.totalLabel : prices[i]?.perSessionLabel}</span>;
    }
    if (field === "sessions") return <><strong>{plan.sessionsPerPack}</strong><small>{plan.durationMin} {c.minutes}</small></>;
    const indices = config.plans[plan.id]?.[config.fields.indexOf(field)] || [];
    const features = (plan.featuresRaw || "").split(/;|\r?\n/).map(s => s.trim()).filter(Boolean);
    const values = indices.map(index => features[index]).filter(Boolean);
    return values.length ? values.map(value => <span className="pcx-benefit" key={value}>{value}</span>) : (
      <Link className="pcx-question" href={routeHref(APP_ROUTES.contact, locale)} aria-label={`${c.ask}: ${c[field]} — ${plan.title}`}>{c.ask}</Link>
    );
  };
  return (
    <section className="ecp__section pcx-section" id="packages-comparison" dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby={`${id}-title`}>
      <div className="ecp__container">
        <div className="pcx-heading">
          <div><p className="pcx-eyebrow">{c.eyebrow}</p><h2 id={`${id}-title`}>{c.title}</h2></div>
          <p>{c[`${kind}Subtitle`]}</p>
        </div>
        <div className="pcx-shared"><span aria-hidden="true">✓</span><strong>{c.shared}</strong><span>{c[kind]}</span></div>
        {kind !== "corporate" && <ul className="pcx-shared-benefits">{plans[0].featuresRaw.split(/;|\r?\n/).filter(Boolean).map(benefit => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}</ul>}
        <div className="pcx-selectors">
          {[0, 1].map(slot => <label key={slot} htmlFor={`${id}-${slot}`}>
            <span>{slot ? c.second : c.first}</span>
            <select id={`${id}-${slot}`} value={pair[slot]} onChange={e => pick(slot, Number(e.target.value))}>
              {plans.map((plan, i) => <option key={plan.id} value={i}>{plan.title}</option>)}
            </select>
          </label>)}
        </div>
        {[{ mode: "desktop", indices: plans.map((_, i) => i) }, { mode: "mobile", indices: pair }].map(({ mode, indices }) => (
        <div className={`pcx-table-wrap pcx-${mode}`} key={mode}>
          <table className="pcx-table">
            <caption className="pcx-sr-only">{c.caption}</caption>
            <thead><tr><th scope="col">{c.detail}</th>{indices.map(i => <th scope="col" key={plans[i].id} className={columnClass(i)}>
              <span className="pcx-plan-name">{plans[i].title}</span>{plans[i].isPopular && <span className="pcx-tag">{c.recommended}</span>}
            </th>)}</tr></thead>
            <tbody>{rows.map(field => <tr key={field}><th scope="row">{c[field]}</th>{indices.map(i => <td key={plans[i].id} className={columnClass(i)}>{renderValue(field, plans[i], i)}</td>)}</tr>)}</tbody>
            <tfoot><tr><th scope="row"><span className="pcx-sr-only">{c.view}</span></th>{indices.map(i => <td className={columnClass(i)} key={plans[i].id}>
              <a className="pcx-action" href={kind === "corporate" ? routeHref(APP_ROUTES.corporateTraining, locale, "#rfp") : `#package-${plans[i].id}`} aria-label={`${kind === "corporate" ? c.contact : c.view}: ${plans[i].title}`}>{kind === "corporate" ? c.contact : c.view}<span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span></a>
            </td>)}</tr></tfoot>
          </table>
        </div>
        ))}
        <div className="pcx-footnote"><p>{c[`${kind}Note`] || c.note}</p><p>{c.help} <Link href={routeHref(APP_ROUTES.contact, locale)}>{c.helpLink} <span aria-hidden="true">↗</span></Link></p></div>
      </div>
    </section>
  );
}
