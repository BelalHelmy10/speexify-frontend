const SITE_URL = "https://speexify.com";
const SITE_NAME = "Speexify";
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
    title: "Speexify - Personalized English & Communication Coaching",
    arTitle: "Speexify - تدريب شخصي على الإنجليزية والتواصل",
    description:
      "Speexify helps professionals and teams speak English with more fluency, clarity, and confidence through live personalized coaching.",
    arDescription:
      "تساعد Speexify المحترفين والفرق على التحدث بالإنجليزية بطلاقة ووضوح وثقة أكبر من خلال تدريب مباشر ومخصص.",
    keywords: [
      "Speexify",
      "English coaching",
      "communication coaching",
      "business English",
      "professional English training",
    ],
  },
  about: {
    path: "/about",
    arPath: "/ar/about",
    title: "About Speexify",
    arTitle: "عن Speexify",
    description:
      "Learn about Speexify, our coaching philosophy, our team, and how we help learners build real communication confidence.",
    arDescription:
      "تعرف على Speexify وفلسفتنا في التدريب وفريقنا وكيف نساعد المتعلمين على بناء ثقة حقيقية في التواصل.",
    keywords: ["about Speexify", "language coaching team", "English coaches"],
  },
  individual: {
    path: "/individual-training",
    arPath: "/ar/individual-training",
    title: "Individual English Coaching",
    arTitle: "تدريب إنجليزي فردي",
    description:
      "Personalized one-on-one English coaching for career growth, interviews, presentations, travel, and everyday fluency.",
    arDescription:
      "تدريب إنجليزي فردي مخصص للتطور المهني والمقابلات والعروض والسفر والطلاقة اليومية.",
    keywords: ["individual English coaching", "one-on-one English lessons", "English speaking coach"],
  },
  corporate: {
    path: "/corporate-training",
    arPath: "/ar/corporate-training",
    title: "Corporate English & Communication Training",
    arTitle: "تدريب الشركات على الإنجليزية والتواصل",
    description:
      "English and communication coaching programs for teams, managers, customer-facing roles, and global workplace communication.",
    arDescription:
      "برامج تدريب على الإنجليزية والتواصل للفرق والمديرين والأدوار التي تتعامل مع العملاء والتواصل في بيئات العمل العالمية.",
    keywords: ["corporate English training", "business communication training", "team English coaching"],
  },
  packages: {
    path: "/packages",
    arPath: "/ar/packages",
    title: "English Coaching Packages",
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
    keywords: ["why Speexify", "English fluency coaching", "communication confidence"],
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

  return {
    title,
    description,
    keywords: page.keywords,
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
    "Personalized language and communication coaching for professionals and teams.",
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
