export const APP_ROUTES = Object.freeze({
  home: "/",
  individualTraining: "/individual-training",
  corporateTraining: "/corporate-training",
  kidsTraining: "/kids",
  packages: "/packages",
  whySpeexify: "/why-speexify",
  assessment: "/assessment",
  memberStories: "/member-stories",
  businessEnglish: "/business-english-training-companies",
  presentationCoaching: "/english-presentation-coaching",
  conversationPractice: "/online-english-conversation-practice",
  corporateEnglishEgypt: "/corporate-english-training-egypt",
  about: "/about",
  contact: "/contact",
  careers: "/careers",
  blog: "/blog",
  guides: "/guides",
  helpCenter: "/help-center",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  onboarding: "/onboarding",
  checkout: "/checkout",
  manualPayment: "/manual-payment",
});

export function getLocalePrefix(locale) {
  return locale === "ar" ? "/ar" : "";
}

export function localizePath(path, locale = "en") {
  if (!path || path === APP_ROUTES.home) {
    return locale === "ar" ? "/ar" : APP_ROUTES.home;
  }

  if (/^(https?:|mailto:|tel:|#)/.test(path)) {
    return path;
  }

  if (locale !== "ar") {
    return path === "/ar" ? APP_ROUTES.home : path;
  }

  if (path.startsWith("/ar")) {
    return path;
  }

  return `/ar${path.startsWith("/") ? path : `/${path}`}`;
}

export function routeHref(path, locale = "en", suffix = "") {
  return `${localizePath(path, locale)}${suffix}`;
}
