import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleAuthErrorKey } from "../lib/googleAuth.js";

test("Google OAuth maps backend downtime to a recoverable localized state", () => {
  assert.equal(getGoogleAuthErrorKey(new Error("The server took too long to respond.")), "googleUnavailable");
  assert.equal(getGoogleAuthErrorKey({ response: { status: 503 } }), "googleUnavailable");
});

test("Google OAuth keeps credential and provider failures user-recoverable", () => {
  assert.equal(getGoogleAuthErrorKey(new Error("credential missing")), "googleNoCredential");
  assert.equal(getGoogleAuthErrorKey(new Error("popup failed")), "googleFailed");
});
