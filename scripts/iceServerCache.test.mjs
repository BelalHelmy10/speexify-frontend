import test from "node:test";
import assert from "node:assert/strict";
import { createIceServerCache, DEFAULT_ICE_SERVERS } from "../lib/iceServerCache.mjs";

const TURN = [{ urls: ["turn:relay.example.test:3478"], username: "u", credential: "c" }];

test("a successful answer is reused until it should be refreshed", async () => {
  let time = 0;
  let calls = 0;
  const cache = createIceServerCache({
    now: () => time,
    load: async () => {
      calls += 1;
      return { iceServers: TURN, refreshAfterSeconds: 60 };
    },
  });
  assert.deepEqual(await cache.get(), TURN);
  time = 59_000;
  await cache.get();
  assert.equal(calls, 1);
  time = 61_000;
  await cache.get();
  assert.equal(calls, 2, "refreshes before the credentials expire");
});

test("a failed fetch falls back once and is retried next time", async () => {
  let fail = true;
  let calls = 0;
  const cache = createIceServerCache({
    load: async () => {
      calls += 1;
      if (fail) throw new Error("offline");
      return { iceServers: TURN };
    },
  });
  assert.deepEqual(await cache.get(), DEFAULT_ICE_SERVERS);
  fail = false;
  assert.deepEqual(await cache.get(), TURN);
  assert.equal(calls, 2);
});

test("a failed refresh keeps the last good servers", async () => {
  let time = 0;
  let fail = false;
  const cache = createIceServerCache({
    now: () => time,
    load: async () => {
      if (fail) throw new Error("offline");
      return { iceServers: TURN, refreshAfterSeconds: 10 };
    },
  });
  await cache.get();
  time = 20_000;
  fail = true;
  assert.deepEqual(await cache.get(), TURN);
});

test("simultaneous connections share one request", async () => {
  let calls = 0;
  const cache = createIceServerCache({
    load: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { iceServers: TURN };
    },
  });
  await Promise.all([cache.get(), cache.get(), cache.get()]);
  assert.equal(calls, 1);
});
