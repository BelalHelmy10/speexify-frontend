const MEASUREMENT_ID_PATTERN = /^[A-Z0-9-]+$/i;
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

// Keep analytics useful without sending direct identifiers or sensitive
// workflow data to a third-party provider.
const PRIVATE_PROPERTY_KEYS = new Set([
  "email",
  "email_address",
  "name",
  "phone",
  "phone_number",
  "credential",
  "password",
  "token",
  "message",
  "userId",
  "user_id",
  "learnerId",
  "learner_id",
  "sessionId",
  "session_id",
  "orderId",
  "order_id",
  "transactionId",
  "transaction_id",
  "firstName",
  "lastName",
  "first_name",
  "last_name",
  "customer",
]);

function getMeasurementId() {
  const value = String(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "").trim();
  return value && MEASUREMENT_ID_PATTERN.test(value) ? value : null;
}

function sanitizeValue(value) {
  if (typeof value === "string") return value.slice(0, 100);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

export function sanitizeEventProperties(properties = {}) {
  return Object.entries(properties).reduce((safe, [key, value]) => {
    if (PRIVATE_PROPERTY_KEYS.has(key)) return safe;

    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) safe[key] = sanitized;
    return safe;
  }, {});
}

export function getAnalyticsMeasurementId() {
  return getMeasurementId();
}

function ensureGtagQueue() {
  if (typeof window === "undefined") return null;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  return window.gtag;
}

export function trackEvent(name, properties = {}) {
  if (typeof window === "undefined") return false;

  const eventName = String(name || "").trim();
  if (!EVENT_NAME_PATTERN.test(eventName)) return false;

  const safeProperties = sanitizeEventProperties(properties);

  // In development, the console remains the quickest way to verify the
  // funnel without polluting production analytics.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[analytics]", eventName, safeProperties);
  }

  const measurementId = getMeasurementId();
  if (!measurementId) return false;

  const gtag = ensureGtagQueue();
  if (!gtag) return false;

  gtag("event", eventName, safeProperties);
  return true;
}

export function trackConversionEvent(name, locale, properties = {}) {
  return trackEvent(name, {
    ...properties,
    app_locale: locale === "ar" ? "ar" : "en",
  });
}

export function trackPageView({ pathname, locale }) {
  if (typeof window === "undefined") return false;

  const pageUrl = new URL(window.location.href);
  pageUrl.search = "";
  pageUrl.hash = "";

  return trackEvent("page_view", {
    page_path: pathname || window.location.pathname,
    page_location: pageUrl.toString(),
    page_title: document.title,
    app_locale: locale === "ar" ? "ar" : "en",
  });
}
