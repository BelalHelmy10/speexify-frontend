import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeEventProperties,
  trackConversionEvent,
} from "../lib/analytics.js";

test("analytics drops direct identifiers before an event is sent", () => {
  assert.deepEqual(
    sanitizeEventProperties({
      email: "person@example.com",
      phone: "+20100000000",
      userId: 42,
      sessionId: "session-123",
      source: "contact_form",
      app_locale: "ar",
      has_company: true,
      invalidObject: { secret: true },
    }),
    {
      source: "contact_form",
      app_locale: "ar",
      has_company: true,
    },
  );
});

test("conversion events carry the normalized Arabic locale", () => {
  const previousWindow = globalThis.window;
  const previousMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  try {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    globalThis.window = {};

    assert.equal(
      trackConversionEvent("generate_lead", "ar", { source: "contact_form" }),
      true,
    );

    const queued = Array.from(globalThis.window.dataLayer[0]);
    assert.equal(queued[0], "event");
    assert.equal(queued[1], "generate_lead");
    assert.deepEqual(queued[2], {
      source: "contact_form",
      app_locale: "ar",
    });
  } finally {
    if (previousMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previousMeasurementId;
    }

    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
