import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseGoogleAuthOnCurrentOrigin,
  getGoogleAuthErrorKey,
} from "../lib/googleAuth.js";

test("Google OAuth maps backend downtime to a recoverable localized state", () => {
  assert.equal(getGoogleAuthErrorKey(new Error("The server took too long to respond.")), "googleUnavailable");
  assert.equal(getGoogleAuthErrorKey({ response: { status: 503 } }), "googleUnavailable");
});

test("Google OAuth keeps credential and provider failures user-recoverable", () => {
  assert.equal(getGoogleAuthErrorKey(new Error("credential missing")), "googleNoCredential");
  assert.equal(getGoogleAuthErrorKey(new Error("popup failed")), "googleFailed");
});

test("Google OAuth can be explicitly enabled on localhost with the primary client", () => {
  const previousWindow = globalThis.window;
  const previousClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const previousLocalClientId = process.env.NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID;
  const previousAllowLocalhost = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST;

  try {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "client-id.apps.googleusercontent.com";
    delete process.env.NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST = "true";
    globalThis.window = { location: { hostname: "localhost" } };

    assert.equal(canUseGoogleAuthOnCurrentOrigin(), true);
  } finally {
    if (previousClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = previousClientId;
    if (previousLocalClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID = previousLocalClientId;
    if (previousAllowLocalhost === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST;
    else process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST = previousAllowLocalhost;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
