import test from "node:test";
import assert from "node:assert/strict";
import { getStarterSessionHref } from "../lib/routes.js";

test("all individual starter-session CTAs share the truthful request path", () => {
  assert.equal(getStarterSessionHref("en"), "/individual-training#trial");
  assert.equal(getStarterSessionHref("ar"), "/ar/individual-training#trial");
});
