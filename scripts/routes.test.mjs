import test from "node:test";
import assert from "node:assert/strict";
import {
  getPrimaryConversionHref,
  getStarterSessionHref,
} from "../lib/routes.js";

test("adult conversion CTAs start with the free live session", () => {
  assert.equal(getPrimaryConversionHref("en"), "/book-free-session");
  assert.equal(getPrimaryConversionHref("ar"), "/ar/book-free-session");
});

test("a package viewed before onboarding is kept as non-binding context", () => {
  assert.equal(
    getPrimaryConversionHref("en", {
      planId: "1on1-12",
    }),
    "/book-free-session?plan=1on1-12",
  );
});

test("audience-specific free-session requests keep their dedicated path", () => {
  assert.equal(getStarterSessionHref("en"), "/book-free-session");
  assert.equal(getStarterSessionHref("ar"), "/ar/book-free-session");
});
