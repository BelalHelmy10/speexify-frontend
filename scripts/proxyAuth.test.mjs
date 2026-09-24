import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_STATE,
  buildLoginRedirect,
  fetchSessionUser,
} from "../lib/proxy-auth.mjs";

function response(status, data = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
  };
}

test("expired sessions redirect state for 401 and 403 only", async () => {
  for (const status of [401, 403]) {
    const result = await fetchSessionUser({
      cookieHeader: "speexify.sid=session",
      apiBase: "https://api.example.com",
      fetchImpl: async () => response(status),
    });
    assert.deepEqual(result, {state: AUTH_STATE.UNAUTHENTICATED, user: null});
  }
});

test("backend downtime is recoverable instead of looking unauthenticated", async () => {
  const transientFailures = [
    {
      name: "timeout",
      fetchImpl: () => new Promise(() => {}),
      timeoutMs: 20,
    },
    {
      name: "network error",
      fetchImpl: async () => { throw new Error("backend unreachable"); },
    },
    {
      name: "server error",
      fetchImpl: async () => response(503),
    },
  ];

  for (const failure of transientFailures) {
    const result = await fetchSessionUser({
      cookieHeader: "speexify.sid=session",
      apiBase: "https://api.example.com",
      ...failure,
    });
    assert.equal(result.state, AUTH_STATE.UNAVAILABLE, failure.name);
  }
});

test("healthy auth responses still identify the user", async () => {
  const result = await fetchSessionUser({
    cookieHeader: "speexify.sid=session",
    apiBase: "https://api.example.com",
    fetchImpl: async () => response(200, {user: {id: 7, role: "learner"}}),
  });
  assert.deepEqual(result, {
    state: AUTH_STATE.AUTHENTICATED,
    user: {id: 7, role: "learner"},
  });
});

test("login redirects preserve the original destination and query", () => {
  const redirect = buildLoginRedirect("https://speexify.com/dashboard?tab=upcoming", {
    pathname: "/dashboard",
    searchParams: new URLSearchParams("tab=upcoming"),
    isArabic: false,
  });

  assert.equal(redirect.pathname, "/login");
  assert.equal(redirect.searchParams.get("next"), "/dashboard?tab=upcoming");
});
