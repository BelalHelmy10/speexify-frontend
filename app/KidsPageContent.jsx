"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/styles/kids.scss";
import { APP_ROUTES, routeHref } from "@/lib/routes";

function useSectionObserver() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const KIDS_AR = {
  hero: {
    badge: "تدريب إنجليزي للأطفال من سن 6 إلى 18",
    titleMain: "طفلك عنده",
    titleAccent: "حاجة يقولها.",
    sub:
      "تدريب مباشر مع كوتش يساعد طفلك يبني ثقة حقيقية في الكلام، مش درجات امتحانات بس. جلسات لايف، كوتشز متخصصين، وتقدم يظهر في المدرسة والبيت وكل موقف يحتاج إنجليزي.",
    primaryCta: "احجز جلسة تجربة مجانية",
    secondaryCta: "اعرف الطريقة",
    stats: ["طفل اتدربوا", "رضا أولياء الأمور", "مراحل عمرية"],
    alt: "طفل من الشرق الأوسط في جلسة تدريب إنجليزي مباشرة أونلاين",
    floats: ["جلسة لايف مع كوتش", "برافو يا عمر!", "تصحيح في نفس اللحظة"],
  },
  trustAria: "لماذا يثق أولياء الأمور في Speexify Kids",
  trustItems: [
    {
      title: "كوتشز متخصصين مع الأطفال",
      text: "بنختار الكوتش حسب عمر طفلك وشخصيته وهدفه.",
      tone: "coral",
    },
    {
      title: "متابعة واضحة بعد كل جلسة",
      text: "تعرف إيه اتحسن وإيه الخطوة الجاية.",
      tone: "teal",
    },
    {
      title: "أول جلسة مجانية",
      text: "جرّبوا الكوتش وطريقة الجلسة قبل أي قرار.",
      tone: "gold",
    },
    {
      title: "من غير ضغط أداء",
      text: "الثقة بتيجي قبل التصحيح.",
      tone: "navy",
    },
  ],
  firstSession: {
    eyebrow: "جلسة التجربة المجانية",
    title: "من أول جلسة هتعرفوا هل ده مناسب لطفلكم.",
    sub:
      "أول جلسة مصممة عشان تكون دافية وسهلة وآمنة. إحنا مش بنقيس طفلك على كتاب. بنشوف بيتكلم إزاي، بيتردد فين، وأي نوع من الكوتشز يقدر يطلّع أفضل ما عنده.",
    cta: "احجز جلسة التجربة",
    cardLabel: "شكل أول جلسة",
    pill: "30 دقيقة",
    parentNoteLabel: "ملاحظة للأهل",
    parentNoteTitle: "بعد التجربة، توصلكم توصية واضحة.",
    parentNoteText: "أنسب نوع جلسات، عدد المرات المقترح، والخطوة الجاية لطفلك.",
    steps: [
      {
        time: "0-5 دقايق",
        title: "بيبدأ بهدوء.",
        text: "الكوتش يبدأ بحاجة سهلة: الاسم، الهوايات، المدرسة، والحاجات اللي بيحبها. من غير اختبار أو توتر.",
      },
      {
        time: "5-20 دقيقة",
        title: "يتكلم بجد.",
        text: "قصة قصيرة، صورة، أو سؤال لطيف يخليه يتكلم بجمل كاملة وبطريقة طبيعية.",
      },
      {
        time: "20-30 دقيقة",
        title: "يخرج بحاجة كسبها.",
        text: "الكوتش يعطيه تصحيح بسيط، ملاحظة تشجعه، وحاجة واحدة يدرّب عليها بعد الجلسة.",
      },
    ],
  },
  manifestoItems: [
    "كوتشز حقيقيين.",
    "محادثات حقيقية.",
    "ثقة حقيقية.",
    "من غير حفظ.",
    "من غير سكريبت.",
    "طفلك، كوتش، ولغة بيستخدمها.",
    "من 6 إلى 18 سنة.",
    "محادثة ورا التانية.",
  ],
  problem: {
    eyebrow: "الفجوة اللي قليل بيتكلم عنها",
    titleLineOne: "بيدرسوا إنجليزي كل يوم.",
    titleLineTwo: "بس لما نطلب منهم يتكلموا، بيتجمدوا.",
    bodyOne:
      "لحظة السكوت لما ييجي دورهم يجاوبوا. التردد قبل ما يقولوا أي جملة. والترجمة في دماغهم بدل ما الكلام يطلع طبيعي.",
    bodyTwo:
      "دي مش مشكلة لغة بس. دي مشكلة ممارسة. وSpeexify هو المكان اللي بتتحل فيه، محادثة حقيقية ورا التانية.",
    before: "قبل",
    silence: "السكوت ده.",
    arrow: "←",
    after: "بعد Speexify",
    quote: "My name is Omar and I want to tell you about my weekend...",
  },
  demo: {
    eyebrow: "جوا الجلسة",
    headingLineOne: "شوفوا إيه اللي بيحصل",
    headingLineTwo: "لما طفلك يكون مع كوتش حقيقي.",
    sub:
      "مش لعبة. مش فيديو متسجل. جلسة لايف فيها الكوتش يبني الثقة محادثة بعد محادثة.",
    aria: "عرض متحرك لجلسة تدريب إنجليزي للأطفال على Speexify",
    coachName: "Miss Sarah",
    coachRole: "كوتش إنجليزي للأطفال",
    live: "LIVE",
    question: "Tell me about your weekend!",
    correctionLabel: "محاولة حلوة! تعديل صغير:",
    correctionHint: "(زمن الماضي)",
    note: "Perfect! You got it. Keep going, Omar!",
    floats: ["نجمة جديدة!", "برافو يا عمر!"],
    features: [
      "تصحيح لطيف ومشجع",
      "جلسات لايف 1-on-1 من غير ضغط",
      "متابعة واضحة للأهل",
      "كوتشز فاهمين تطور الأطفال",
    ],
  },
  reassurance: {
    eyebrow: "راحة بال للأهل",
    title: "دافي للأطفال. واضح للأهل.",
    sub:
      "الطفل لازم يحس إنه متشاف، مش متحاكم عليه. والأهل لازم يعرفوا إيه اللي حصل في الجلسة وهل الكوتش مناسب فعلًا.",
    items: [
      {
        title: "للأطفال الخجولة",
        text: "أول هدف هو الراحة. الكوتش يبني ثقة الأول، وبعدها يطلب إجابات أطول.",
      },
      {
        title: "جلسات آمنة على الشاشة",
        text: "كوتش حقيقي يقود الجلسة. من غير غرباء عشوائيين، ولا شات عام، ولا ممارسة من غير إشراف.",
      },
      {
        title: "اختيار الكوتش المناسب",
        text: "بنطابق حسب العمر، الشخصية، الهدف، وهل طفلك محتاج دعم هادي أو تحدي أكبر.",
      },
      {
        title: "تقدم واضح",
        text: "بعد الجلسات، الأهل يستلموا ملاحظات بسيطة عشان التقدم مايبقاش مستخبي جوه مكالمة فيديو.",
      },
    ],
  },
  ageGroups: {
    eyebrow: "المراحل العمرية",
    title: "مصمم لكل مرحلة في نمو طفلك.",
    sub:
      "كل سن محتاج طريقة مختلفة. إحنا نبني كل جلسة حول مكان طفلك الحالي، مش المكان اللي الكتاب بيقول إنه المفروض يكون فيه.",
    groups: [
      {
        range: "6-10 سنوات",
        name: "المستكشفين الصغيرين",
        tagline: "نبني عادة الكلام بالإنجليزي.",
        mod: "coral",
        image: "/images/Kids%20Young%20Explorers.jpg",
        alt: "أطفال من الشرق الأوسط يتدربون على الإنجليزي من خلال نشاط قصصي",
        focus: [
          "الحكي والخيال",
          "الأغاني والإيقاع والصوت",
          "الثقة في المشاركة",
          "محادثات يومية بسيطة",
        ],
      },
      {
        range: "11-14 سنة",
        name: "النجوم الصاعدة",
        tagline: "نساعدهم يلاقوا صوتهم في المدرسة.",
        mod: "teal",
        image: "/images/Kids%20Rising%20Stars.jpg",
        alt: "طالب من الشرق الأوسط يقدم فكرة بالإنجليزي في فصل حديث",
        focus: [
          "عروض المدرسة",
          "الثقة الاجتماعية",
          "القراءة بصوت عال من غير خوف",
          "التعبير عن الرأي بوضوح",
        ],
      },
      {
        range: "15-18 سنة",
        name: "قادة المستقبل",
        tagline: "جاهزين للخطوة الجاية.",
        mod: "gold",
        image: "/images/Kids%20Future%20Leaders.jpg",
        alt: "مراهق من الشرق الأوسط يتدرب على مقابلة أو عرض جامعي بالإنجليزي",
        focus: [
          "الجامعة والمقابلات",
          "التواصل القيادي",
          "كتابة أقوى وأكثر وضوحًا",
          "إنجليزي عالمي بطلاقة",
        ],
      },
    ],
  },
  why: {
    eyebrow: "ليه الطريقة دي بتشتغل",
    title: "مختلف عن أي حصة إنجليزي جربوها قبل كده.",
    cards: [
      {
        title: "كوتشز متدربين للأطفال، مش للكبار بس.",
        text: "كوتشز الأطفال عندنا فاهمين نفسية الطفل، مدة تركيزه، وإزاي يخلو الإنجليزي إحساسه اكتشاف مش واجب.",
      },
      {
        title: "تقدم تقدر تشوفه فعلًا.",
        text: "بعد كل جلسة، توصلك ملاحظة قصيرة: اتدربنا على إيه، إيه اتحسن، وإيه الخطوة الجاية.",
      },
      {
        title: "جلسات مناسبة لجدول البيت الحقيقي.",
        text: "30 أو 45 دقيقة، مرة أو مرتين في الأسبوع. قصيرة كفاية للتركيز، ومنتظمة كفاية للتقدم.",
      },
      {
        title: "التشجيع قبل التصحيح. دائمًا.",
        text: "بنرفع الثقة قبل ما نصحح. أول ما الطفل يحس إن الغلط آمن، يبدأ يتعلم بجد.",
      },
      {
        title: "جلسات جروب للأطفال اللي بيتعلموا من الجو.",
        text: "جروبات صغيرة من 4 إلى 6 أطفال، فيها الكلام بيطلع طبيعي. ثقة اجتماعية ما تتبنيش لوحده.",
        stat: { label: "أطفال في الجروب كحد أقصى" },
      },
      {
        title: "الخطة مبنية حول طفلك.",
        text: "مدرسة دولية؟ سفر للدراسة؟ مقابلات؟ نبني الخطة من حياة طفلك الحقيقية، مش من كتاب ثابت.",
      },
    ],
  },
  how: {
    eyebrow: "الطريقة",
    title: "3 خطوات لنوع مختلف من الثقة.",
    steps: [
      {
        num: "01",
        label: "احكِ لنا عن طفلك",
        title: "احكِ لنا عن طفلك.",
        text: "مكالمة قصيرة. نسمع احتياجه في المدرسة، مع أصحابه، ولمستقبله. وبعدها نبني خطة تدريب مناسبة.",
      },
      {
        num: "02",
        label: "قابلوا الكوتش",
        title: "قابلوا الكوتش.",
        text: "بنطابق طفلك مع كوتش مناسب لعمره وهدفه وشخصيته. مش اختيار عشوائي. اختيار مقصود.",
      },
      {
        num: "03",
        label: "شوفوه وهو بيتطور",
        title: "شوفوه وهو بيتطور.",
        text: "جلسات لايف مرة أو مرتين في الأسبوع. وملاحظة للأهل بعد كل جلسة. خلال شهر، هتسمعوا الفرق.",
      },
    ],
    primaryCta: "احجز جلسة تجربة مجانية",
    secondaryCta: "اسألنا أي حاجة",
  },
  sessions: {
    eyebrow: "أنواع الجلسات",
    title: "فردي أو جروب. على حسب إيقاع طفلك واحتياجه.",
    soloTag: "1-on-1",
    soloTitle: "جلسات فردية.",
    soloText:
      "100% من تركيز الكوتش على طفلك. تقدم أسرع، تركيز أعمق، وعلاقة ثقة بتتبني مع الوقت.",
    soloAlt: "طفل من الشرق الأوسط في جلسة تدريب إنجليزي فردية أونلاين",
    soloList: [
      "خطة تدريب مخصصة بالكامل",
      "مواعيد مرنة",
      "30 أو 45 دقيقة للجلسة",
      "ملاحظات للأهل بعد كل جلسة",
    ],
    soloCta: "احجز تجربة فردية مجانية",
    groupTag: "جروب",
    groupTitle: "جلسات جروب.",
    groupText:
      "من 4 إلى 6 أطفال مع كوتش واحد. محادثات حقيقية بين أطفال في نفس المرحلة، وثقة اجتماعية بتطلع من الكلام وسط الجروب.",
    groupAlt: "أطفال من الشرق الأوسط يتدربون على الإنجليزي في جلسة جروب صغيرة",
    groupList: [
      "جروبات صغيرة، 4 إلى 6 أطفال كحد أقصى",
      "أطفال في مراحل عمرية متقاربة",
      "ميعاد أسبوعي ثابت",
      "أهداف مشتركة ونمو فردي",
    ],
    groupCta: "انضم لجروب",
  },
  sticky: {
    aria: "احجز جلسة تجربة مجانية",
    title: "تجربة مجانية",
    sub: "من غير التزام",
    cta: "احجز التجربة",
  },
  testimonials: {
    eyebrow: "من أولياء الأمور",
    title: "إيه اللي بيقولوه بعد ما يشوفوا الفرق.",
    sub: "تحولات حقيقية في أطفال حقيقيين، يلاحظها أقرب ناس ليهم.",
    items: [
      {
        quote:
          "بنتي كانت بترفض تتكلم إنجليزي بره المدرسة. بعد 6 جلسات، بقت تصحح لي أنا لما أقول حاجة غلط. فرق الثقة كان واضح.",
        author: "دينا ر.",
        role: "والدة طفلة 9 سنوات",
        metric: "6 جلسات",
        metricLabel: "لتحول واضح",
      },
      {
        quote:
          "ابني كان مرعوب من بريزنتيشن المدرسة. عملنا 3 جلسات تدريب. جاب الدرجة النهائية. الأهم إنه دخل من غير الخوف القديم.",
        author: "أحمد م.",
        role: "والد طفل 13 سنة",
        metric: "3 جلسات",
        metricLabel: "قبل اليوم المهم",
      },
      {
        quote:
          "جربنا تطبيقات ومدرسين. ما فيش حاجة اشتغلت بالشكل ده. الكوتش حسّسنا إنها مهتمة بليلى نفسها، مش بتشرح إنجليزي وخلاص.",
        author: "منى ك.",
        role: "والدة طفلة 11 سنة",
        metric: "شهر واحد",
        metricLabel: "لتقدم حقيقي",
      },
    ],
  },
  coaches: {
    eyebrow: "الكوتشز",
    title: "كوتشز طفلك هيحترمهم ويحب يتعلم منهم.",
    sub:
      "كل كوتش في Speexify Kids اشتغل مع أطفال قبل كده. مش في تعليم اللغة بس، لكن في فصول حقيقية، مدارس حقيقية، ومواقف ضغط حقيقية.",
    note: "كل الكوتشز يدخلوا عملية مطابقة خاصة بالأطفال. مافيش اختيار عشوائي.",
    items: [
      {
        name: "نادية إ.",
        role: "متخصصة أطفال · من 6 إلى 12 سنة",
        bio: "7 سنوات في تعليم الأطفال داخل مدارس دولية. تعرف إزاي تخلي الطفل الخجول يحس بالأمان ويتكلم.",
        image: "/images/Kids%20Nadia.jpg",
        alt: "كوتش إنجليزي للأطفال من الشرق الأوسط في بورتريه داخل فصل راق",
      },
      {
        name: "كريم أ.",
        role: "كوتش مراهقين · من 12 إلى 18 سنة",
        bio: "عمل كمرشد مدرسي قبل تدريب اللغة. يساعد المراهقين يلاقوا صوتهم بالإنجليزي وبثقة.",
        image: "/images/Kids%20Karim.jpg",
        alt: "كوتش إنجليزي للمراهقين من الشرق الأوسط في بورتريه داخل مكتبة راقية",
      },
      {
        name: "ليلى س.",
        role: "كوتش جلسات الجروب",
        bio: "متخصصة في ديناميكية الجروبات. تدير جلسات يخلي كل طفل فيها يحس إنه متشاف، مش بس الطفل الأعلى صوتًا.",
        image: "/images/Kids%20Leila.jpg",
        alt: "كوتش جلسات جروب إنجليزي من الشرق الأوسط في بورتريه داخل فصل راق",
      },
    ],
  },
  faq: {
    eyebrow: "قبل الحجز",
    title: "أسئلة الأهل بيسألوها الأول.",
    items: [
      {
        q: "طفلي لازم يكون عنده كام سنة؟",
        a: "بنشتغل مع الأطفال من 6 إلى 18 سنة. كل مرحلة عمرية لها كوتشز وطريقة مناسبة: المستكشفين الصغيرين 6-10، النجوم الصاعدة 11-14، وقادة المستقبل 15-18.",
      },
      {
        q: "لو طفلي خجول أو بيتردد يتكلم؟",
        a: "ده بالضبط من أهم أسباب وجود البرنامج. الكوتشز عندنا يتدربوا يبنوا الثقة قبل الطلاقة. أول جلسة هدفها إن طفلك يحس بالأمان، مش إنه يتحاكم عليه.",
      },
      {
        q: "الجلسة مدتها قد إيه وبتتكرر كام مرة؟",
        a: "30 أو 45 دقيقة، مرة أو مرتين في الأسبوع. قصيرة كفاية عشان التركيز، ومنتظمة كفاية عشان تشوفوا تقدم حقيقي خلال شهر.",
      },
      {
        q: "هعرف إيه اللي حصل في كل جلسة؟",
        a: "أيوه. بعد كل جلسة، توصلكم ملاحظة قصيرة: اتدربنا على إيه، إيه كان كويس، وإيه الخطوة الجاية. مش هتفضلوا تخمنوا هل في تقدم ولا لأ.",
      },
      {
        q: "ده مختلف عن مدرس إنجليزي عادي؟",
        a: "جدا. المدرس يشرح. الكوتش يدرّب. جلساتنا مش واجب وقواعد بس؛ هي تدريب على الثقة واستخدام اللغة في مواقف حقيقية.",
      },
    ],
  },
  cta: {
    eyebrow: "ابدأوا",
    titleLineOne: "أول جلسة",
    titleLineTwo: "علينا.",
    sub:
      "احجزوا جلسة تجربة مجانية. من غير التزام. شوفوا بنفسكم إيه اللي يقدر يعمله كوتش حقيقي مع طفل عنده مساحة آمنة يتدرب فيها.",
    primary: "احجز الجلسة المجانية",
    secondary: "اسألنا أي حاجة",
  },
};

const getKidsCopy = (locale) => (locale === "ar" ? KIDS_AR : null);

export default function KidsPageContent() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  useSectionObserver();

  return (
    <main className="kids-page" dir={locale === "ar" ? "rtl" : "ltr"}>
      <KidsHero locale={locale} />
      <KidsTrustStrip locale={locale} />
      <KidsFirstSession locale={locale} />
      <KidsManifesto locale={locale} />
      <KidsProblem locale={locale} />
      <KidsLiveDemo locale={locale} />
      <KidsParentReassurance locale={locale} />
      <KidsAgeGroups locale={locale} />
      <KidsWhyItWorks locale={locale} />
      <KidsHowItWorks locale={locale} />
      <KidsSessionTypes locale={locale} />
      <KidsTestimonials locale={locale} />
      <KidsCoaches locale={locale} />
      <KidsFAQ locale={locale} />
      <KidsCTA locale={locale} />
    </main>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function KidsHero({ locale }) {
  const copy = getKidsCopy(locale)?.hero;

  return (
    <section className="kids-hero">
      <div className="kids-hero__bg" aria-hidden="true">
        <div className="kids-hero__gradient" />
        <div className="kids-hero__grid-lines" />
        <div className="kids-hero__deco kids-hero__deco--circle-1" />
        <div className="kids-hero__deco kids-hero__deco--circle-2" />
        <div className="kids-hero__deco kids-hero__deco--dot-grid" />
      </div>

      <div className="kids-container kids-hero__grid">
        <div className="kids-hero__copy" data-reveal>
          <span className="kids-hero__badge">
            <span className="kids-hero__badge-dot" aria-hidden="true" />
            {copy?.badge || "English coaching for ages 6–18"}
          </span>

          <h1 className="kids-hero__title">
            {copy?.titleMain || "Your child has"}<br />
            <span className="kids-hero__title-accent">
              {copy?.titleAccent || "something to say."}
            </span>
          </h1>

          <p className="kids-hero__sub">
            {copy?.sub ||
              "One-on-one coaching that builds real confidence — not just test scores. Live sessions. Real coaches. The kind of progress that shows at school, at home, and everywhere in between."}
          </p>

          <div className="kids-hero__cta">
            <Link
              className="kids-btn kids-btn--primary"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              <span>{copy?.primaryCta || "Book a free trial session"}</span>
            </Link>
            <a className="kids-btn kids-btn--ghost" href="#kids-how">
              {copy?.secondaryCta || "See how it works"}
            </a>
          </div>

          <div className="kids-hero__stats">
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">500+</span>
              <span className="kids-hero__stat-label">
                {copy?.stats[0] || "Kids coached"}
              </span>
            </div>
            <div className="kids-hero__stat-sep" aria-hidden="true" />
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">98%</span>
              <span className="kids-hero__stat-label">
                {copy?.stats[1] || "Parent satisfaction"}
              </span>
            </div>
            <div className="kids-hero__stat-sep" aria-hidden="true" />
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">3</span>
              <span className="kids-hero__stat-label">
                {copy?.stats[2] || "Age groups"}
              </span>
            </div>
          </div>
        </div>

        <div className="kids-hero__media">
          <div className="kids-hero__img-wrap">
            <img
              className="kids-hero__img"
              src="/images/Kids%20Hero%20Image.jpg"
              alt={copy?.alt || "Middle Eastern child in a live online English coaching session"}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="kids-hero__img-overlay" />
          </div>
          <div className="kids-hero__float kids-hero__float--a" aria-hidden="true">
            <span className="kids-hero__float-dot" />
            {copy?.floats[0] || "Live with a coach"}
          </div>
          <div className="kids-hero__float kids-hero__float--b" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {copy?.floats[1] || "Great job, Omar!"}
          </div>
          <div className="kids-hero__float kids-hero__float--c" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v1.2M6.5 10.3v1.2M1.5 6.5h1.2M10.3 6.5h1.2M3.2 3.2l.85.85M8.95 8.95l.85.85M3.2 9.8l.85-.85M8.95 4.05l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {copy?.floats[2] || "Real-time feedback"}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TRUST STRIP
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  {
    title: "Vetted kids coaches",
    text: "Matched by age, goals, and personality.",
    tone: "coral",
  },
  {
    title: "Parent notes every time",
    text: "You always know what improved and what is next.",
    tone: "teal",
  },
  {
    title: "Free first session",
    text: "Try the coach, the flow, and the fit first.",
    tone: "gold",
  },
  {
    title: "No pressure to perform",
    text: "Confidence comes before correction.",
    tone: "navy",
  },
];

function KidsTrustDoodle({ tone }) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (tone === "teal") {
    // Open notebook with squiggle "parent notes" + a heart sticker
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <g {...s}>
          <path d="M12 11h28a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" />
          <circle cx="16" cy="17" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="24" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="31" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="38" r="1.1" fill="currentColor" stroke="none" />
          <path d="M21 18c2-1 4 1 6 0s4-1 6 0" />
          <path d="M21 25c2-1 4 1 6 0s4-1 5 0" />
          <path d="M21 32c2-1 4 1 6 0" />
          <path d="M30 36c0-1.6 2-2.4 3-1 1-1.4 3-.6 3 1 0 2-3 4-3 4s-3-2-3-4Z" />
        </g>
      </svg>
    );
  }

  if (tone === "gold") {
    // Wobbly star + sparkles — "the gift / the freebie"
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <g {...s}>
          <path d="M26 10 L 30 21 L 41 21 L 32 28 L 35 39 L 26 32 L 17 39 L 20 28 L 11 21 L 22 21 Z" />
          <path d="M44 12v3.5M44 12v-3.5M44 12h3.5M44 12h-3.5" />
          <path d="M9 41v2.5M9 41v-2.5M9 41h2.5M9 41h-2.5" />
          <path d="M45 35v2.5M45 35v-2.5M45 35h2.5M45 35h-2.5" />
        </g>
      </svg>
    );
  }

  if (tone === "navy") {
    // Relaxed face with closed-eye smile + breath waves — "no pressure"
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <g {...s}>
          <path d="M11 28c0-8 7-15 15-15s15 7 15 15-7 15-15 15-15-7-15-15Z" />
          <path d="M17 25c1.6-1.6 4.4-1.6 6 0" />
          <path d="M29 25c1.6-1.6 4.4-1.6 6 0" />
          <path d="M20 33c2 2 8 2 10 0" />
          <path d="M14 8c1.6 1.4 4 1.4 5.5 0" />
          <path d="M22 6c1.6 1.4 4 1.4 5.5 0" />
          <path d="M30 8c1.6 1.4 4 1.4 5.5 0" />
        </g>
      </svg>
    );
  }

  // coral (default) — coach face with whistle + check badge
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
      <g {...s}>
        <path d="M10 22c0-7 6-13 13-13s13 6 13 13-6 13-13 13-13-6-13-13Z" />
        <path d="M18 11c1-2 4-2.5 6-1.5" />
        <circle cx="19" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="27" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <path d="M18 25c1.5 2 7 2 9 0" />
        <path d="M33 30c3 3 5 6.5 5 10" />
        <rect x="35" y="40" width="9" height="5" rx="1.6" />
        <path d="M44 41v3" />
        <circle cx="41" cy="14" r="6" />
        <path d="M38.5 14l2 2 3-4" />
      </g>
    </svg>
  );
}

function KidsTrustStrip({ locale }) {
  const pageCopy = getKidsCopy(locale);
  const items = pageCopy?.trustItems || TRUST_ITEMS;

  return (
    <section
      className="kids-trust"
      aria-label={pageCopy?.trustAria || "Why parents trust Speexify kids"}
    >
      <div className="kids-container">
        <div className="kids-trust__grid" data-reveal>
          {items.map((item) => (
            <div
              key={item.title}
              className={`kids-trust__item kids-trust__item--${item.tone}`}
            >
              <span className="kids-trust__doodle" aria-hidden="true">
                <KidsTrustDoodle tone={item.tone} />
              </span>
              <div className="kids-trust__body">
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FIRST SESSION
───────────────────────────────────────────── */
const FIRST_SESSION_STEPS = [
  {
    time: "0-5 min",
    title: "They settle in.",
    text: "The coach starts with something easy: name, hobbies, school, favorite things. No test. No cold start.",
  },
  {
    time: "5-20 min",
    title: "They speak for real.",
    text: "A short story, picture prompt, or playful question gets them talking in complete thoughts.",
  },
  {
    time: "20-30 min",
    title: "They leave with a win.",
    text: "The coach gives one small correction, one confidence note, and one thing to practice next.",
  },
];

function KidsFirstSession({ locale }) {
  const copy = getKidsCopy(locale)?.firstSession;
  const steps = copy?.steps || FIRST_SESSION_STEPS;

  return (
    <section className="kids-first">
      <div className="kids-container kids-first__grid">
        <div className="kids-first__copy" data-reveal>
          <span className="kids-first__eyebrow">
            {copy?.eyebrow || "The free trial"}
          </span>
          <h2 className="kids-first__title">
            {copy?.title || "You will know in one session if this is right for them."}
          </h2>
          <p className="kids-first__sub">
            {copy?.sub ||
              "The first session is designed to feel warm, easy, and safe. We are not measuring your child against a textbook. We are watching how they speak, where they hesitate, and what kind of coach will bring them out."}
          </p>
          <Link
            className="kids-btn kids-btn--primary"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            {copy?.cta || "Book the free trial"}
          </Link>
        </div>

        <div className="kids-first__card" data-reveal>
          <div className="kids-first__card-top">
            <span className="kids-first__card-label">
              {copy?.cardLabel || "First session flow"}
            </span>
            <span className="kids-first__card-pill">{copy?.pill || "30 min"}</span>
          </div>
          <div className="kids-first__steps">
            {steps.map((step, i) => (
              <div key={step.time} className="kids-first__step">
                <span className="kids-first__step-dot" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <span className="kids-first__step-time">{step.time}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="kids-first__parent-note">
            <span aria-hidden="true">{copy?.parentNoteLabel || "Parent note"}</span>
            <strong>
              {copy?.parentNoteTitle ||
                "After the trial, you get a clear recommendation."}
            </strong>
            <p>
              {copy?.parentNoteText ||
                "Best session type, suggested frequency, and what your child needs next."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MANIFESTO STRIP
───────────────────────────────────────────── */
function KidsManifesto({ locale }) {
  const items = getKidsCopy(locale)?.manifestoItems || [
    "Real coaches.",
    "Real conversations.",
    "Real confidence.",
    "No drills.",
    "No scripts.",
    "Just your child, a coach, and a language.",
    "Ages 6–18.",
    "One conversation at a time.",
  ];

  return (
    <div className="kids-manifesto" aria-hidden="true">
      <div className="kids-manifesto__track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="kids-manifesto__item">
            {item}
            <span className="kids-manifesto__sep">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROBLEM SECTION
───────────────────────────────────────────── */
function KidsProblem({ locale }) {
  const copy = getKidsCopy(locale)?.problem;

  return (
    <section className="kids-problem">
      <div className="kids-container">
        <div className="kids-problem__inner">
          <div className="kids-problem__text" data-reveal>
            <span className="kids-problem__eyebrow">
              {copy?.eyebrow || "The gap no one talks about"}
            </span>
            <h2 className="kids-problem__title">
              {copy?.titleLineOne || "They study English every day."}
              <br />
              {copy?.titleLineTwo || "But ask them to speak it — and they freeze."}
            </h2>
            <p className="kids-problem__body">
              {copy?.bodyOne ||
                "That moment of silence when it's their turn to answer. The hesitation before they say something. Translating in their head instead of just talking."}
            </p>
            <p className="kids-problem__body">
              {copy?.bodyTwo ||
                "That's not a language problem. That's a practice problem. And Speexify is where it gets solved — one real conversation at a time."}
            </p>
          </div>

          <div className="kids-problem__visual" aria-hidden="true" data-reveal>
            <div className="kids-problem__card kids-problem__card--before">
              <div className="kids-problem__card-label">{copy?.before || "Before"}</div>
              <div className="kids-problem__card-silence">
                <span>. . .</span>
                <span className="kids-problem__card-note">
                  {copy?.silence || "That silence."}
                </span>
              </div>
            </div>
            <div className="kids-problem__arrow" aria-hidden="true">
              {copy?.arrow || "→"}
            </div>
            <div className="kids-problem__card kids-problem__card--after">
              <div className="kids-problem__card-label">
                {copy?.after || "After Speexify"}
              </div>
              <div className="kids-problem__card-quote">
                &ldquo;{copy?.quote || "My name is Omar and I want to tell you about my weekend…"}&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   KIDS LIVE SESSION DEMO  (CSS cinema)
───────────────────────────────────────────── */
function KidsLiveDemo({ locale }) {
  const copy = getKidsCopy(locale)?.demo;
  const waveBars = [
    { h: 20, d: "0s" },
    { h: 45, d: "0.1s" },
    { h: 60, d: "0.2s" },
    { h: 30, d: "0.05s" },
    { h: 70, d: "0.15s" },
    { h: 50, d: "0.08s" },
    { h: 75, d: "0.18s" },
    { h: 38, d: "0.12s" },
    { h: 55, d: "0.22s" },
    { h: 25, d: "0.06s" },
    { h: 65, d: "0.16s" },
    { h: 42, d: "0.28s" },
  ];

  return (
    <section className="kids-demo">
      <div className="kids-demo__glow" aria-hidden="true" />
      <div className="kids-container">
        <div className="kids-demo__header" data-reveal>
          <span className="kids-demo__eyebrow">
            <span className="kids-demo__eyebrow-dot" aria-hidden="true" />
            {copy?.eyebrow || "Inside a session"}
          </span>
          <h2 className="kids-demo__heading">
            {copy?.headingLineOne || "See what happens when"}<br />
            {copy?.headingLineTwo || "your child has a real coach."}
          </h2>
          <p className="kids-demo__sub">
            {copy?.sub ||
              "Not a game. Not a video. A live session where coaches build confidence one conversation at a time."}
          </p>
        </div>

        <div className="kids-demo__scene">
          <div
            className="kids-demo__window"
            role="img"
            aria-label={copy?.aria || "Animated preview of a Speexify kids coaching session"}
          >
            {/* Browser chrome */}
            <div className="kids-demo__chrome">
              <div className="kids-demo__dots">
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </div>
              <div className="kids-demo__url">speexify.com/session</div>
              <div className="kids-demo__timer">18:42</div>
            </div>

            {/* Session body */}
            <div className="kids-demo__body">
              {/* Coach row */}
              <div className="kids-demo__coach-row kdemo-in-1">
                <div className="kids-demo__coach-avatar">
                  <span>MS</span>
                  <span className="kids-demo__live-dot" aria-hidden="true" />
                </div>
                <div className="kids-demo__coach-info">
                  <div className="kids-demo__coach-name">
                    {copy?.coachName || "Miss Sarah"}
                  </div>
                  <div className="kids-demo__coach-role">
                    {copy?.coachRole || "Kids English Coach"}
                  </div>
                </div>
                <div className="kids-demo__live-badge">{copy?.live || "LIVE"}</div>
              </div>

              <div className="kids-demo__sep" aria-hidden="true" />

              {/* Coach question */}
              <div className="kids-demo__coach-msg kdemo-in-2">
                <div className="kids-demo__coach-bubble">
                  {copy?.question || "Tell me about your weekend!"}
                </div>
              </div>

              {/* Child response */}
              <div className="kids-demo__student-msg kdemo-in-3">
                <div className="kids-demo__student-bubble">
                  I{" "}
                  <mark className="kids-demo__err">go</mark>{" "}
                  to the park with my dad.
                </div>
              </div>

              {/* Waveform */}
              <div className="kids-demo__wave kdemo-wave-show" aria-hidden="true">
                {waveBars.map((bar, i) => (
                  <span
                    key={i}
                    className="kids-demo__wave-bar"
                    style={{
                      "--bar-h": `${bar.h}%`,
                      "--bar-delay": bar.d,
                    }}
                  />
                ))}
              </div>

              {/* Correction panel */}
              <div className="kids-demo__correction kdemo-in-4">
                <div className="kids-demo__correction-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="kids-demo__correction-content">
                  <div className="kids-demo__correction-label">
                    {copy?.correctionLabel || "Nice try! Small fix:"}
                  </div>
                  <div className="kids-demo__correction-row">
                    <span className="kids-demo__corr-before">go</span>
                    <span className="kids-demo__corr-arrow">→</span>
                    <span className="kids-demo__corr-after">went</span>
                    <span className="kids-demo__corr-hint">
                      {copy?.correctionHint || "(past tense)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corrected child text */}
              <div className="kids-demo__corrected-msg kdemo-in-5">
                <div className="kids-demo__student-bubble">
                  I{" "}
                  <mark className="kids-demo__corrected-word">went</mark>{" "}
                  to the park with my dad.
                </div>
              </div>

              {/* Coach note */}
              <div className="kids-demo__note kdemo-in-6">
                <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1.5l1.4 2.8 3.1.45-2.25 2.2.53 3.1L7 8.6l-2.78 1.45.53-3.1L2.5 4.75l3.1-.45L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
                {copy?.note || "Perfect! You got it. Keep going, Omar!"}
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="kids-demo__float kids-demo__float--a">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1l1.3 2.65 2.93.43-2.12 2.07.5 2.92L6.5 7.7 3.89 9.07l.5-2.92L2.27 4.08l2.93-.43L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            {copy?.floats[0] || "1 star earned!"}
          </div>
          <div className="kids-demo__float kids-demo__float--b">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {copy?.floats[1] || "Great job, Omar!"}
          </div>
        </div>

        <div className="kids-demo__features" data-reveal>
          {(copy?.features || [
            "Gentle, encouraging corrections",
            "Live 1-on-1 sessions, no pressure",
            "Progress reports for parents",
            "Coaches trained in child development",
          ]).map((f, i) => (
            <div key={i} className="kids-demo__feature">
              <span className="kids-demo__feature-dot" aria-hidden="true" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PARENT REASSURANCE
───────────────────────────────────────────── */
const REASSURANCE_ITEMS = [
  {
    title: "For shy kids",
    text: "The first goal is comfort. Coaches build trust before they ask for longer answers.",
  },
  {
    title: "Screen-safe sessions",
    text: "A real coach leads the room. No random peers, no public chat, no unsupervised practice.",
  },
  {
    title: "Coach matching",
    text: "We match by age, personality, goals, and whether your child needs gentle support or a bigger challenge.",
  },
  {
    title: "Visible progress",
    text: "Parents receive simple notes after sessions, so progress is not hidden inside a video call.",
  },
];

function KidsParentReassurance({ locale }) {
  const copy = getKidsCopy(locale)?.reassurance;
  const items = copy?.items || REASSURANCE_ITEMS;

  return (
    <section className="kids-reassure">
      <div className="kids-container">
        <div className="kids-reassure__header" data-reveal>
          <span className="kids-reassure__eyebrow">
            {copy?.eyebrow || "Parent peace of mind"}
          </span>
          <h2 className="kids-reassure__title">
            {copy?.title || "Warm for kids. Clear for parents."}
          </h2>
          <p className="kids-reassure__sub">
            {copy?.sub ||
              "A child should feel seen, not judged. A parent should never wonder what happened in the session or whether the coach is the right fit."}
          </p>
        </div>

        <div className="kids-reassure__grid">
          {items.map((item, i) => (
            <div key={item.title} className="kids-reassure__card" data-reveal>
              <span className="kids-reassure__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   AGE GROUPS
───────────────────────────────────────────── */
const AGE_GROUPS = [
  {
    range: "Ages 6 – 10",
    name: "Young Explorers",
    tagline: "Building the habit of speaking.",
    mod: "coral",
    image: "/images/Kids%20Young%20Explorers.jpg",
    alt: "Young Middle Eastern children practicing English through a story activity",
    focus: [
      "Storytelling & imagination",
      "Songs, rhythm, and sound",
      "Confidence to speak up",
      "Simple everyday conversations",
    ],
  },
  {
    range: "Ages 11 – 14",
    name: "Rising Stars",
    tagline: "Finding their voice at school.",
    mod: "teal",
    image: "/images/Kids%20Rising%20Stars.jpg",
    alt: "Middle Eastern pre-teen student presenting in a modern classroom",
    focus: [
      "School presentations",
      "Social confidence",
      "Reading aloud without fear",
      "Expressing opinions clearly",
    ],
  },
  {
    range: "Ages 15 – 18",
    name: "Future Leaders",
    tagline: "Ready for what is next.",
    mod: "gold",
    image: "/images/Kids%20Future%20Leaders.jpg",
    alt: "Middle Eastern teenager practicing an English interview with a coach",
    focus: [
      "University and interview prep",
      "Leadership communication",
      "Writing that gets noticed",
      "Global English fluency",
    ],
  },
];

function KidsAgeGroups({ locale }) {
  const copy = getKidsCopy(locale)?.ageGroups;
  const groups = copy?.groups || AGE_GROUPS;

  return (
    <section className="kids-ages">
      <div className="kids-container">
        <div className="kids-ages__header" data-reveal>
          <span className="kids-ages__eyebrow">
            {copy?.eyebrow || "Age groups"}
          </span>
          <h2 className="kids-ages__title">
            {copy?.title || "Built for every stage of growing up."}
          </h2>
          <p className="kids-ages__sub">
            {copy?.sub ||
              "Different ages need different approaches. We build each session around where your child is — not where a textbook says they should be."}
          </p>
        </div>

        <div className="kids-ages__grid">
          {groups.map((g, i) => (
            <div
              key={i}
              className={`kids-ages__card kids-ages__card--${g.mod}`}
              data-reveal
            >
              <div className="kids-ages__card-stripe" aria-hidden="true" />
              <div className="kids-ages__card-top">
                <span className="kids-ages__card-range">{g.range}</span>
              </div>
              <div className="kids-ages__img-placeholder">
                <img
                  className="kids-ages__img"
                  src={g.image}
                  alt={g.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="kids-ages__card-name">{g.name}</h3>
              <p className="kids-ages__card-tagline">{g.tagline}</p>
              <ul className="kids-ages__card-focus">
                {g.focus.map((item, j) => (
                  <li key={j} className="kids-ages__card-focus-item">
                    <span className="kids-ages__card-check" aria-hidden="true">
                      <svg viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   WHY IT WORKS  (award-winning bento)
───────────────────────────────────────────── */
const whyCards = [
  {
    num: "01",
    title: "Coaches trained for children, not adults.",
    text: "Our kids coaches know child psychology, attention spans, and how to make English feel like discovery — not homework.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 1.5 3 4 3s4-1 4-3v-5" />
      </svg>
    ),
    accent: "coral",
    hasImage: true,
  },
  {
    num: "02",
    title: "Progress you can actually see.",
    text: "After every session, parents get a short note: what was practiced, what improved, what is next.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <path d="M18 9l-4 4-3-3-3 3" />
      </svg>
    ),
    accent: "teal",
  },
  {
    num: "03",
    title: "Sessions that fit real schedules.",
    text: "30 or 45 minutes, once or twice a week. Short enough to keep focus. Consistent enough to feel real progress.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "gold",
  },
  {
    num: "04",
    title: "Encouragement first. Always.",
    text: "We build confidence before we correct. The moment a child feels safe to make mistakes is when they start to truly learn.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    accent: "coral",
  },
  {
    num: "05",
    title: "Group sessions for the ones who learn from the room.",
    text: "Small groups of 4–6 kids where conversations happen naturally. The kind of social confidence that cannot be built alone.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    accent: "teal",
    stat: { num: "4–6", label: "kids per group, maximum" },
  },
  {
    num: "06",
    title: "Built around your child.",
    text: "Preparing for an international school? Studying abroad? We build the plan from your child's real life — not a textbook.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    accent: "coral",
    dark: true,
  },
];

function KidsWhyItWorks({ locale }) {
  const copy = getKidsCopy(locale)?.why;
  const cards = copy?.cards
    ? whyCards.map((card, i) => {
        const localCard = copy.cards[i] || {};
        return {
          ...card,
          ...localCard,
          stat:
            card.stat || localCard.stat
              ? { ...(card.stat || {}), ...(localCard.stat || {}) }
              : undefined,
        };
      })
    : whyCards;

  return (
    <section className="kids-why">
      {/* Floating doodles in background */}
      <span className="kids-why__doodle kids-why__doodle--star" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5 C10.3 5.5, 8 8, 4.5 8.5 C8 9, 10.3 11.5, 10 15.5 C9.7 11.5, 12 9, 15.5 8.5 C12 8, 9.7 5.5, 10 1.5Z" />
        </svg>
      </span>
      <span className="kids-why__doodle kids-why__doodle--zigzag" aria-hidden="true">
        <svg width="36" height="16" viewBox="0 0 24 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5 L5 1.5 L8 8.5 L11 1.5 L14 8.5 L17 1.5 L20 5" />
        </svg>
      </span>
      <span className="kids-why__doodle kids-why__doodle--circle" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="10" cy="10" r="8" />
        </svg>
      </span>
      <span className="kids-why__doodle kids-why__doodle--spiral" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5 C16 5, 18 8, 18 11.5 C18 15, 15.5 17.5, 12 17.5 C9.5 17.5, 8 16, 8 14.5 C8 13, 9.5 11.5, 12 11.5 C13.5 11.5, 14.5 12.3, 14.5 13.3 C14.5 14.3, 13.5 15, 12 15" />
        </svg>
      </span>

      <div className="kids-container">
        <div className="kids-why__header">
          <span className="kids-why__eyebrow">
            {copy?.eyebrow || "Why it works"}
          </span>
          <h2 className="kids-why__title">
            {copy?.title || "Different from every class they have had."}
          </h2>
        </div>

        <div className="kids-why__bento">
          {/* Large image card */}
          <div className="kids-why__card kids-why__card--lg" data-reveal>
            <div className="kids-why__card-icon kids-why__card-icon--coral">
              {cards[0].icon}
            </div>
            <span className="kids-why__num">{cards[0].num}</span>
            <h3 className="kids-why__card-title">{cards[0].title}</h3>
            <p className="kids-why__card-text">{cards[0].text}</p>
            <div className="kids-why__card-img">
              <img
                className="kids-why__img"
                src="/images/Kids%20Why%20It%20Works.jpg"
                alt="Kids English coach encouraging a Middle Eastern child during a speaking activity"
                loading="lazy"
                decoding="async"
              />
              {/* Playful doodle decorations on the image */}
              <span className="kids-why__img-doodle kids-why__img-doodle--heart" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </span>
              <span className="kids-why__img-doodle kids-why__img-doodle--dot" aria-hidden="true" />
            </div>
          </div>

          {/* Cards 2 & 3 */}
          <div className="kids-why__card" data-reveal>
            <div className={`kids-why__card-icon kids-why__card-icon--${cards[1].accent}`}>
              {cards[1].icon}
            </div>
            <span className="kids-why__num">{cards[1].num}</span>
            <h3 className="kids-why__card-title">{cards[1].title}</h3>
            <p className="kids-why__card-text">{cards[1].text}</p>
          </div>

          <div className="kids-why__card" data-reveal>
            <div className={`kids-why__card-icon kids-why__card-icon--${cards[2].accent}`}>
              {cards[2].icon}
            </div>
            <span className="kids-why__num">{cards[2].num}</span>
            <h3 className="kids-why__card-title">{cards[2].title}</h3>
            <p className="kids-why__card-text">{cards[2].text}</p>
          </div>

          {/* Card 4 */}
          <div className="kids-why__card" data-reveal>
            <div className={`kids-why__card-icon kids-why__card-icon--${cards[3].accent}`}>
              {cards[3].icon}
            </div>
            <span className="kids-why__num">{cards[3].num}</span>
            <h3 className="kids-why__card-title">{cards[3].title}</h3>
            <p className="kids-why__card-text">{cards[3].text}</p>
          </div>

          {/* Wide card 5 */}
          <div className="kids-why__card" data-reveal>
            <div className={`kids-why__card-icon kids-why__card-icon--${cards[4].accent}`}>
              {cards[4].icon}
            </div>
            <span className="kids-why__num">{cards[4].num}</span>
            <h3 className="kids-why__card-title">{cards[4].title}</h3>
            <p className="kids-why__card-text">{cards[4].text}</p>
            <div className="kids-why__stat">
              <span className="kids-why__stat-num">{cards[4].stat.num}</span>
              <span className="kids-why__stat-label">{cards[4].stat.label}</span>
            </div>
          </div>

          {/* Dark card 6 */}
          <div className="kids-why__card kids-why__card--dark" data-reveal>
            <div className={`kids-why__card-icon kids-why__card-icon--${cards[5].accent}`}>
              {cards[5].icon}
            </div>
            <span className="kids-why__num">{cards[5].num}</span>
            <h3 className="kids-why__card-title">{cards[5].title}</h3>
            <p className="kids-why__card-text">{cards[5].text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────── */
const HOW_STEPS = [
  {
    num: "01",
    label: "Tell us about your child",
    title: "Tell us about your child.",
    text: "A short call. We listen for what they need — at school, with friends, for their future. Then we shape a practice plan around that.",
  },
  {
    num: "02",
    label: "Meet their coach",
    title: "Meet their coach.",
    text: "We match your child with a coach who fits their age, their goals, and their personality. Not random. Chosen.",
  },
  {
    num: "03",
    label: "Watch them grow",
    title: "Watch them grow.",
    text: "Live sessions, once or twice a week. A parent note after every one. Within a month, you will hear the difference.",
  },
];

function KidsHowItWorks({ locale }) {
  const copy = getKidsCopy(locale)?.how;
  const steps = copy?.steps || HOW_STEPS;

  return (
    <section className="kids-how" id="kids-how">
      <div className="kids-container">
        <div className="kids-how__header" data-reveal>
          <span className="kids-how__eyebrow">
            {copy?.eyebrow || "How it works"}
          </span>
          <h2 className="kids-how__title">
            {copy?.title || "Three steps to a different kind of confidence."}
          </h2>
        </div>

        <div className="kids-how__steps">
          {steps.map((step, i) => (
            <div key={i} className="kids-how__step" data-reveal>
              <div className="kids-how__step-num">{step.num}</div>
              <div className="kids-how__step-line" aria-hidden="true" />
              <div className="kids-how__step-body">
                <span className="kids-how__step-label">{step.label}</span>
                <h3 className="kids-how__step-title">{step.title}</h3>
                <p className="kids-how__step-text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="kids-how__cta" data-reveal>
          <Link
            className="kids-btn kids-btn--primary"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            {copy?.primaryCta || "Book a free trial session"}
          </Link>
          <Link
            className="kids-btn kids-btn--ghost"
            href={routeHref(APP_ROUTES.contact, locale)}
          >
            {copy?.secondaryCta || "Ask us anything"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SESSION TYPES
───────────────────────────────────────────── */
function KidsSessionTypes({ locale }) {
  const copy = getKidsCopy(locale)?.sessions;

  return (
    <section className="kids-sessions">
      <div className="kids-container">
        <div className="kids-sessions__header" data-reveal>
          <span className="kids-sessions__eyebrow">
            {copy?.eyebrow || "Session types"}
          </span>
          <h2 className="kids-sessions__title">
            {copy?.title || "One-on-one or group. Your child's pace, your call."}
          </h2>
        </div>

        <div className="kids-sessions__grid">
          <div className="kids-sessions__card kids-sessions__card--solo" data-reveal>
            <div className="kids-sessions__tag">{copy?.soloTag || "1-on-1"}</div>
            <h3 className="kids-sessions__card-title">
              {copy?.soloTitle || "Private sessions."}
            </h3>
            <p className="kids-sessions__card-text">
              {copy?.soloText ||
                "100% of the coach's attention on your child. Faster progress, deeper focus, and a relationship that builds over time."}
            </p>
            <div className="kids-sessions__image-wrap">
              <img
                className="kids-sessions__img"
                src="/images/Kids%20One%20On%20One.jpg"
                alt={copy?.soloAlt || "Middle Eastern child in a private online English coaching session"}
                loading="lazy"
                decoding="async"
              />
            </div>
            <ul className="kids-sessions__list">
              {(copy?.soloList || [
                "Fully personalised practice plan",
                "Flexible scheduling",
                "30 or 45 minutes per session",
                "Parent progress notes after every session",
              ]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              className="kids-btn kids-btn--primary kids-btn--full"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              {copy?.soloCta || "Book free 1-on-1 trial"}
            </Link>
          </div>

          <div className="kids-sessions__card kids-sessions__card--group" data-reveal>
            <div className="kids-sessions__tag kids-sessions__tag--group">
              {copy?.groupTag || "Group"}
            </div>
            <h3 className="kids-sessions__card-title">
              {copy?.groupTitle || "Group sessions."}
            </h3>
            <p className="kids-sessions__card-text">
              {copy?.groupText ||
                "4–6 kids, one coach. Real conversations between real peers. The social confidence that only comes from speaking in a room."}
            </p>
            <div className="kids-sessions__image-wrap">
              <img
                className="kids-sessions__img"
                src="/images/Kids%20Groups.jpg"
                alt={copy?.groupAlt || "Middle Eastern kids practicing English together in a small group session"}
                loading="lazy"
                decoding="async"
              />
            </div>
            <ul className="kids-sessions__list">
              {(copy?.groupList || [
                "Small groups — 4 to 6 kids maximum",
                "Age-matched peers",
                "Fixed weekly schedule",
                "Shared goals, individual growth",
              ]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              className="kids-btn kids-btn--outline kids-btn--full"
              href={routeHref(APP_ROUTES.contact, locale)}
            >
              {copy?.groupCta || "Join a group"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function KidsStickyCTA({ locale }) {
  const copy = getKidsCopy(locale)?.sticky;

  return (
    <Link
      className="kids-sticky-cta"
      href={routeHref(APP_ROUTES.register, locale)}
      aria-label={copy?.aria || "Book a free trial session"}
    >
      <span>
        <strong>{copy?.title || "Free trial"}</strong>
        <small>{copy?.sub || "No commitment"}</small>
      </span>
      <b>{copy?.cta || "Book free trial"}</b>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   PARENT TESTIMONIALS
───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:
      "My daughter used to refuse to speak English outside of school. After six sessions, she corrects ME when I say something wrong. The confidence shift was real.",
    author: "Dina R.",
    role: "Mother of a 9-year-old",
    metric: "6 sessions",
    metricLabel: "to a visible shift",
  },
  {
    quote:
      "My son had a school presentation he was terrified of. We did three practice sessions. He got full marks. But more than that — he walked in without the fear.",
    author: "Ahmed M.",
    role: "Father of a 13-year-old",
    metric: "3 sessions",
    metricLabel: "before the big one",
  },
  {
    quote:
      "We tried apps, we tried tutors. Nothing worked like this. The coach felt like she actually cared about Layla specifically — not just teaching English in general.",
    author: "Mona K.",
    role: "Mother of an 11-year-old",
    metric: "1 month",
    metricLabel: "to real progress",
  },
];

function KidsTestimonials({ locale }) {
  const copy = getKidsCopy(locale)?.testimonials;
  const items = copy?.items || TESTIMONIALS;

  return (
    <section className="kids-testi">
      <div className="kids-container">
        <div className="kids-testi__header" data-reveal>
          <span className="kids-testi__eyebrow">
            {copy?.eyebrow || "From parents"}
          </span>
          <h2 className="kids-testi__title">
            {copy?.title || "What parents say, after."}
          </h2>
          <p className="kids-testi__sub">
            {copy?.sub ||
              "Real shifts. In real kids. Noticed by the people watching closest."}
          </p>
        </div>

        <div className="kids-testi__grid">
          {items.map((item, i) => (
            <div key={i} className="kids-testi__card" data-reveal>
              <div className="kids-testi__metric">
                <span className="kids-testi__metric-num">{item.metric}</span>
                <span className="kids-testi__metric-label">{item.metricLabel}</span>
              </div>
              <blockquote className="kids-testi__quote">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="kids-testi__author">
                <div className="kids-testi__avatar">
                  {item.author
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div>
                  <div className="kids-testi__name">{item.author}</div>
                  <div className="kids-testi__role">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   COACHES
───────────────────────────────────────────── */
const COACHES = [
  {
    name: "Nadia E.",
    role: "Kids Specialist · Ages 6–12",
    bio: "Seven years teaching children in international schools. Knows exactly how to make a shy kid feel brave enough to speak.",
    image: "/images/Kids%20Nadia.jpg",
    alt: "Middle Eastern female kids English coach in a premium classroom portrait",
  },
  {
    name: "Karim A.",
    role: "Teen Coach · Ages 12–18",
    bio: "Former school counsellor turned language coach. Helps teenagers find their voice — in English and beyond.",
    image: "/images/Kids%20Karim.jpg",
    alt: "Middle Eastern male teen English coach in a premium library portrait",
  },
  {
    name: "Leila S.",
    role: "Group Session Coach",
    bio: "Specialises in group dynamics. Runs sessions where every child feels seen — not just the loudest ones.",
    image: "/images/Kids%20Leila.jpg",
    alt: "Middle Eastern female group-session English coach in a premium classroom portrait",
  },
];

function KidsCoaches({ locale }) {
  const copy = getKidsCopy(locale)?.coaches;
  const coaches = copy?.items || COACHES;

  return (
    <section className="kids-coaches">
      <div className="kids-container">
        <div className="kids-coaches__header" data-reveal>
          <span className="kids-coaches__eyebrow">
            {copy?.eyebrow || "The coaches"}
          </span>
          <h2 className="kids-coaches__title">
            {copy?.title || "Coaches your child will actually look up to."}
          </h2>
          <p className="kids-coaches__sub">
            {copy?.sub ||
              "Every Speexify kids coach has worked with children before. Not just in language teaching — in real classrooms, real schools, real pressure situations."}
          </p>
        </div>

        <div className="kids-coaches__grid">
          {coaches.map((c, i) => (
            <div key={i} className="kids-coaches__card" data-reveal>
              <div className="kids-coaches__image-wrap">
                <img
                  className="kids-coaches__img"
                  src={c.image}
                  alt={c.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="kids-coaches__name">{c.name}</h3>
              <p className="kids-coaches__role">{c.role}</p>
              <p className="kids-coaches__bio">{c.bio}</p>
            </div>
          ))}
        </div>

        <p className="kids-coaches__note" data-reveal>
          {copy?.note ||
            "All coaches go through our kids-specific matching process. No random assignments."}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FAQ
───────────────────────────────────────────── */
const FAQS = [
  {
    q: "What age does my child need to be?",
    a: "We work with kids from 6 to 18. Each age group has coaches trained specifically for that stage — Young Explorers (6–10), Rising Stars (11–14), and Future Leaders (15–18).",
  },
  {
    q: "What if my child is shy or hesitant to speak?",
    a: "Good. That is exactly who this is for. Our coaches are trained to build trust before they build fluency. The first session is always about making your child feel safe, not evaluated.",
  },
  {
    q: "How long is each session and how often?",
    a: "30 or 45 minutes, once or twice a week. Short enough to keep their focus. Consistent enough to feel real progress inside a month.",
  },
  {
    q: "Will I know what happened in each session?",
    a: "Yes. After every session, you get a short note: what was practiced, what went well, and what is coming next. You will never wonder if it is working.",
  },
  {
    q: "Is this different from a regular English tutor?",
    a: "Very. Tutors teach. Coaches practice. Our sessions are not about grammar drills or homework help — they are about building the confidence to actually use the language in the real world.",
  },
];

function KidsFAQ({ locale }) {
  const [open, setOpen] = useState(null);
  const copy = getKidsCopy(locale)?.faq;
  const items = copy?.items || FAQS;

  return (
    <section className="kids-faq">
      <div className="kids-container">
        <div className="kids-faq__header" data-reveal>
          <span className="kids-faq__eyebrow">
            {copy?.eyebrow || "Before you book"}
          </span>
          <h2 className="kids-faq__title">
            {copy?.title || "Questions parents ask first."}
          </h2>
        </div>

        <div className="kids-faq__list" data-reveal>
          {items.map((faq, i) => (
            <div
              key={i}
              className={`kids-faq__item${open === i ? " kids-faq__item--open" : ""}`}
            >
              <button
                className="kids-faq__question"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{faq.q}</span>
                <span className="kids-faq__toggle" aria-hidden="true">
                  {open === i ? "−" : "+"}
                </span>
              </button>
              <div className="kids-faq__answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────── */
function KidsCTA({ locale }) {
  const copy = getKidsCopy(locale)?.cta;

  return (
    <section className="kids-cta">
      <div className="kids-cta__bg" aria-hidden="true">
        <div className="kids-cta__gradient" />
      </div>
      <div className="kids-container">
        <div className="kids-cta__inner" data-reveal>
          <span className="kids-cta__eyebrow">
            {copy?.eyebrow || "Get started"}
          </span>
          <h2 className="kids-cta__title">
            {copy?.titleLineOne || "The first session"}<br />
            {copy?.titleLineTwo || "is on us."}
          </h2>
          <p className="kids-cta__sub">
            {copy?.sub ||
              "Book a free trial session. No commitment. See for yourself what a real coach — and a child who has been given a place to practice — can do."}
          </p>
          <div className="kids-cta__buttons">
            <Link
              className="kids-btn kids-btn--cta"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              {copy?.primary || "Book their free session"}
            </Link>
            <Link
              className="kids-btn kids-btn--cta-ghost"
              href={routeHref(APP_ROUTES.contact, locale)}
            >
              {copy?.secondary || "Ask us anything"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
