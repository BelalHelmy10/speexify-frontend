import {
  BRAND_CATEGORY,
  BRAND_DESCRIPTION,
  BRAND_SITE_TITLE,
} from "@/lib/brand";

export const SITE_URL = "https://speexify.com";
export const SITE_NAME = "Speexify";

const DEFAULT_OG_IMAGE = "/opengraph-image";
const DEFAULT_TWITTER_IMAGE = "/twitter-image";

const GOOGLE_BOT = {
  index: true,
  follow: true,
  "max-video-preview": -1,
  "max-image-preview": "large",
  "max-snippet": -1,
};

export const seoPages = {
  home: {
    path: "",
    arPath: "/ar",
    title: `${BRAND_SITE_TITLE} | ${BRAND_CATEGORY}`,
    arTitle: "Speexify — تكلّمها. لا تدرسها. | تدريب تحدث إنجليزي",
    description: BRAND_DESCRIPTION,
    arDescription:
      "تدريب إنجليزي فردي يحول ما تعرفه بالفعل إلى ثقة حقيقية — للمقابلات والاجتماعات وكل لحظة مهمة.",
    keywords: [
      "Speexify",
      "English speaking coaching",
      "English coaching Egypt",
      "1-on-1 English coaching",
      "English speaking confidence",
      "interview English coaching",
      "business English Egypt",
    ],
    arKeywords: [
      "Speexify",
      "تدريب انجليزي مصر",
      "تدريب محادثة انجليزي",
      "ثقة في التحدث بالانجليزية",
      "تدريب انجليزي للمقابلات",
    ],
  },
  about: {
    path: "/about",
    arPath: "/ar/about",
    title: "About Speexify",
    arTitle: "عن Speexify",
    description:
      "Learn about Speexify, our coaching philosophy, our team, and how we help members build real communication confidence.",
    arDescription:
      "تعرف على Speexify وفلسفتنا في التدريب وفريقنا وكيف نساعد الأعضاء على بناء ثقة حقيقية في التواصل.",
    keywords: ["about Speexify", "language coaching team", "English coaches"],
  },
  individual: {
    path: "/individual-training",
    arPath: "/ar/individual-training",
    title: "1-on-1 English Speaking Coaching for Professionals",
    arTitle: "تدريب محادثة إنجليزية فردي للمحترفين",
    description:
      "Personalized one-on-one English coaching for career growth, interviews, presentations, travel, and real everyday conversations.",
    arDescription:
      "تدريب إنجليزي فردي مخصص للتطور المهني والمقابلات والعروض والسفر والمحادثات اليومية الواقعية.",
    keywords: ["individual English coaching", "one-on-one English sessions", "English speaking coach"],
  },
  corporate: {
    path: "/corporate-training",
    arPath: "/ar/corporate-training",
    title: "Corporate English Training for Teams and Companies",
    arTitle: "تدريب إنجليزي للشركات والفرق",
    description:
      "English and communication coaching programs for teams, managers, customer-facing roles, and global workplace communication.",
    arDescription:
      "برامج تدريب على الإنجليزية والتواصل للفرق والمديرين والأدوار التي تتعامل مع العملاء والتواصل في بيئات العمل العالمية.",
    keywords: ["corporate English training", "business communication training", "team English coaching"],
  },
  packages: {
    path: "/packages",
    arPath: "/ar/packages",
    title: "English Coaching Packages and Pricing",
    arTitle: "باقات تدريب الإنجليزية",
    description:
      "Compare Speexify coaching packages for individuals, groups, and companies, and choose the plan that fits your goals.",
    arDescription:
      "قارن باقات التدريب في Speexify للأفراد والمجموعات والشركات واختر الخطة المناسبة لأهدافك.",
    keywords: ["English coaching packages", "Speexify pricing", "business English packages"],
  },
  why: {
    path: "/why-speexify",
    arPath: "/ar/why-speexify",
    title: "Why Choose Speexify",
    arTitle: "لماذا Speexify",
    description:
      "See why Speexify focuses on live coaching, practical speaking confidence, measurable progress, and real-world communication outcomes.",
    arDescription:
      "اكتشف لماذا تركز Speexify على التدريب المباشر والثقة العملية في التحدث والتقدم القابل للقياس ونتائج التواصل الواقعية.",
    keywords: ["why Speexify", "English speaking coaching", "communication confidence"],
  },
  contact: {
    path: "/contact",
    arPath: "/ar/contact",
    title: "Contact Speexify",
    arTitle: "تواصل مع Speexify",
    description:
      "Contact Speexify to ask about individual coaching, corporate training, partnerships, support, or custom English programs.",
    arDescription:
      "تواصل مع Speexify للاستفسار عن التدريب الفردي أو تدريب الشركات أو الشراكات أو الدعم أو البرامج المخصصة.",
    keywords: ["contact Speexify", "English training consultation", "corporate English inquiry"],
  },
  careers: {
    path: "/careers",
    arPath: "/ar/careers",
    title: "Careers at Speexify",
    arTitle: "وظائف Speexify",
    description:
      "Explore career opportunities at Speexify and help build better language and communication coaching experiences.",
    arDescription:
      "استكشف فرص العمل في Speexify وساهم في بناء تجارب أفضل للتدريب على اللغة والتواصل.",
    keywords: ["Speexify careers", "language coaching jobs", "English coach jobs"],
  },
  privacy: {
    path: "/privacy",
    arPath: "/ar/privacy",
    title: "Privacy Policy",
    arTitle: "سياسة الخصوصية",
    description:
      "Read the Speexify privacy policy, including how we collect, use, protect, and manage personal information.",
    arDescription:
      "اقرأ سياسة الخصوصية في Speexify وكيف نجمع المعلومات الشخصية ونستخدمها ونحميها ونديرها.",
    keywords: ["Speexify privacy policy", "privacy", "data protection"],
  },
  terms: {
    path: "/terms",
    arPath: "/ar/terms",
    title: "Terms of Service",
    arTitle: "شروط الخدمة",
    description:
      "Read the Speexify terms of service for using our coaching platform, sessions, packages, and services.",
    arDescription:
      "اقرأ شروط خدمة Speexify الخاصة باستخدام منصة التدريب والجلسات والباقات والخدمات.",
    keywords: ["Speexify terms", "terms of service", "coaching terms"],
  },
  refund: {
    path: "/refund-policy",
    arPath: "/ar/refund-policy",
    title: "Refund Policy",
    arTitle: "سياسة الاسترداد",
    description:
      "Read the Speexify refund policy for coaching packages, payments, cancellations, and account credits.",
    arDescription:
      "اقرأ سياسة الاسترداد في Speexify الخاصة بالباقات والمدفوعات والإلغاءات والأرصدة.",
    keywords: ["Speexify refund policy", "refund policy", "coaching refunds"],
  },
  blog: {
    path: "/blog",
    arPath: "/ar/blog",
    title: "English Speaking and Communication Coaching Blog",
    arTitle: "مدونة التدريب على التحدث والإنجليزية",
    description:
      "Practical articles from Speexify on English speaking confidence, business communication, presentations, interviews, and learning momentum.",
    arDescription:
      "مقالات عملية من Speexify عن الثقة في التحدث بالإنجليزية، التواصل المهني، العروض، المقابلات، والاستمرارية.",
    keywords: ["English speaking blog", "business English tips", "communication coaching articles"],
  },
  guides: {
    path: "/guides",
    arPath: "/ar/guides",
    title: "English Speaking Guides for Professionals",
    arTitle: "أدلة التحدث بالإنجليزية للمحترفين",
    description:
      "Step-by-step Speexify guides for choosing English coaching, improving spoken confidence, preparing presentations, and building workplace confidence.",
    arDescription:
      "أدلة عملية من Speexify لاختيار تدريب الإنجليزية وتحسين الثقة في التحدث والتحضير للعروض وبناء الثقة في العمل.",
    keywords: ["English speaking guides", "business English guide", "presentation English guide"],
  },
  helpCenter: {
    path: "/help-center",
    arPath: "/ar/help-center",
    title: "Speexify Help Center",
    arTitle: "مركز مساعدة Speexify",
    description:
      "Learn how Speexify sessions, packages, placement, scheduling, classroom tools, payments, and support work.",
    arDescription:
      "تعرف على طريقة عمل جلسات Speexify والباقات وتحديد المستوى والجدولة والفصل والمدفوعات والدعم.",
    keywords: ["Speexify help", "Speexify support", "English coaching help center"],
  },
  speakingCoachEgypt: {
    path: "/english-speaking-coach-egypt",
    arPath: "/ar/english-speaking-coach-egypt",
    title: "English Speaking Coach in Egypt",
    arTitle: "مدرب محادثة إنجليزية في مصر",
    description:
      "Work with a Speexify English speaking coach in Egypt through live 1-on-1 sessions focused on confidence and real conversations.",
    arDescription:
      "تدرّب مع مدرب محادثة إنجليزية في مصر من Speexify من خلال جلسات مباشرة فردية تركز على الثقة والمحادثات الواقعية.",
    keywords: ["English speaking coach Egypt", "English conversation coach Egypt", "English coach Cairo"],
    arKeywords: ["مدرب محادثة انجليزي في مصر", "كورس محادثة انجليزي", "تدريب انجليزي اونلاين مصر"],
  },
  businessEnglishTrainingCompanies: {
    path: "/business-english-training-companies",
    arPath: "/ar/business-english-training-companies",
    title: "Business English Training for Companies",
    arTitle: "تدريب إنجليزي أعمال للشركات",
    description:
      "Business English training for companies that need clearer meetings, presentations, customer conversations, and confident global communication.",
    arDescription:
      "تدريب إنجليزي أعمال للشركات التي تحتاج إلى اجتماعات أوضح وعروض أقوى وتواصل أفضل مع العملاء والفرق العالمية.",
    keywords: ["business English training companies", "corporate English training", "English training for employees"],
  },
  onlineEnglishConversationPractice: {
    path: "/online-english-conversation-practice",
    arPath: "/ar/online-english-conversation-practice",
    title: "Online English Conversation Practice",
    arTitle: "تدريب محادثة إنجليزية أونلاين",
    description:
      "Practice English conversation online with real coaches, structured feedback, speaking goals, and live sessions built around your daily life.",
    arDescription:
      "تمرّن على المحادثة الإنجليزية أونلاين مع مدربين حقيقيين وملاحظات منظمة وأهداف تحدث وجلسات مباشرة تناسب حياتك اليومية.",
    keywords: ["online English conversation practice", "English speaking practice online", "live English conversation"],
  },
  englishPresentationCoaching: {
    path: "/english-presentation-coaching",
    arPath: "/ar/english-presentation-coaching",
    title: "English Presentation Coaching",
    arTitle: "تدريب العروض التقديمية بالإنجليزية",
    description:
      "Prepare English presentations with coaching on structure, delivery, pronunciation, confidence, and handling questions professionally.",
    arDescription:
      "استعد للعروض التقديمية بالإنجليزية مع تدريب على التنظيم والإلقاء والنطق والثقة والتعامل مع الأسئلة باحتراف.",
    keywords: ["English presentation coaching", "presentation skills English", "business presentation coach"],
  },
  corporateEnglishTrainingEgypt: {
    path: "/corporate-english-training-egypt",
    arPath: "/ar/corporate-english-training-egypt",
    title: "Corporate English Training in Egypt",
    arTitle: "تدريب إنجليزي للشركات في مصر",
    description:
      "Corporate English training in Egypt for teams that need measurable speaking confidence and practical communication outcomes.",
    arDescription:
      "تدريب إنجليزي للشركات في مصر للفرق التي تحتاج إلى ثقة قابلة للقياس في التحدث ونتائج تواصل واضحة.",
    keywords: ["corporate English training Egypt", "business English Egypt", "English training companies Egypt"],
  },
};

function absoluteUrl(path = "") {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function metadataRobots(index = true) {
  if (!index) {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: GOOGLE_BOT,
  };
}

function ogImageAlt(title) {
  return title.startsWith(SITE_NAME) ? title : `${SITE_NAME} - ${title}`;
}

export function pageMetadata(key, locale = "en") {
  const page = seoPages[key];
  if (!page) {
    throw new Error(`Unknown SEO page key: ${key}`);
  }

  const isArabic = locale === "ar";
  const path = isArabic ? page.arPath : page.path;
  const canonical = absoluteUrl(path);
  const englishUrl = absoluteUrl(page.path);
  const arabicUrl = absoluteUrl(page.arPath);
  const title = isArabic ? page.arTitle : page.title;
  const description = isArabic ? page.arDescription : page.description;
  const keywords = isArabic && page.arKeywords ? page.arKeywords : page.keywords;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        en: englishUrl,
        ar: arabicUrl,
        "x-default": englishUrl,
      },
    },
    openGraph: {
      type: "website",
      locale: isArabic ? "ar_EG" : "en_US",
      alternateLocale: isArabic ? ["en_US"] : ["ar_EG"],
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: ogImageAlt(title),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@speexify",
      images: [DEFAULT_TWITTER_IMAGE],
    },
    robots: metadataRobots(true),
  };
}

export function noIndexMetadata(title, path, locale = "en") {
  const isArabic = locale === "ar";
  const normalizedPath = isArabic && !path.startsWith("/ar") ? `/ar${path}` : path;

  return {
    title,
    alternates: {
      canonical: absoluteUrl(normalizedPath),
    },
    robots: metadataRobots(false),
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: "Speexify English Coaching",
  url: SITE_URL,
  logo: absoluteUrl("/images/speexify-logo.png"),
  description:
    BRAND_DESCRIPTION,
  sameAs: [
    "https://www.linkedin.com/company/speexify/",
    "https://www.facebook.com/profile.php?id=61560942134964",
    "https://www.youtube.com/@Speexify",
    "https://www.tiktok.com/@speexify",
    "https://x.com/speexify",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@speexify.com",
      availableLanguage: ["English", "Arabic"],
    },
  ],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["en", "ar"],
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
};

export function absoluteSiteUrl(path = "") {
  return absoluteUrl(path);
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serviceJsonLd({
  name,
  description,
  path,
  serviceType = "English coaching",
  areaServed = ["Egypt", "Middle East", "Online"],
  audience = "Professionals and teams",
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType,
    url: absoluteUrl(path),
    areaServed,
    audience: {
      "@type": "Audience",
      audienceType: audience,
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absoluteUrl(path),
      availableLanguage: ["English", "Arabic"],
    },
  };
}

export function faqJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function collectionPageJsonLd({ name, description, path }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
