// web/src/lib/analytics.js

// Simple, safe analytics wrapper.
// Right now it just logs in dev. Later you can plug Plausible/PostHog/etc.

export function trackEvent(name, properties = {}) {
  if (typeof window === "undefined") return;

  // In development, just log so you can see it's firing
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[analytics]", name, properties);
  }

  // Example: if you later add Plausible, you can do:
  // if (window.plausible) {
  //   window.plausible(name, { props: properties });
  // }
}
