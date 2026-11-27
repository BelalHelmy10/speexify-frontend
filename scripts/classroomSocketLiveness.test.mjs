import test from "node:test";
import assert from "node:assert/strict";
import { createSocketLiveness } from "../lib/classroomSocketLiveness.mjs";

// A fake clock: timers run when time is advanced.
function fakeClock() {
  let time = 0;
  let nextId = 1;
  const timers = new Map();
  const clock = {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, at: time + ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    setInterval(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, at: time + ms, every: ms });
      return id;
    },
    clearInterval(id) {
      timers.delete(id);
    },
  };
  const advance = (ms) => {
    const end = time + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      time = timer.at;
      if (timer.every) timer.at += timer.every;
      else timers.delete(id);
      timer.fn();
    }
    time = end;
  };
  return { clock, advance, now: () => time };
}

function setup(options = {}) {
  const { clock, advance, now } = fakeClock();
  const pings = [];
  const stale = [];
  const liveness = createSocketLiveness({
    sendPing: () => pings.push(now()),
    onStale: (reason) => stale.push(reason),
    intervalMs: 8000,
    timeoutMs: 20000,
    probeTimeoutMs: 5000,
    clock,
    now,
    ...options,
  });
  return { liveness, advance, pings, stale };
}

test("a server that keeps answering stays alive", () => {
  const { liveness, advance, pings, stale } = setup();
  liveness.start();
  for (let i = 0; i < 10; i += 1) {
    advance(8000);
    liveness.heard("pong");
  }
  assert.equal(stale.length, 0);
  assert.ok(pings.length >= 10);
});

test("silence after answering marks the socket stale within the deadline", () => {
  const { liveness, advance, stale } = setup();
  liveness.start();
  liveness.heard("pong");
  advance(24000);
  assert.deepEqual(stale, ["heartbeat_timeout"]);
  assert.equal(liveness.running, false);
  advance(60000);
  assert.equal(stale.length, 1, "fires once");
});

test("any server message counts as alive", () => {
  const { liveness, advance, stale } = setup();
  liveness.start();
  liveness.heard("pong");
  for (let i = 0; i < 6; i += 1) {
    advance(7000);
    liveness.heard("signal");
  }
  assert.equal(stale.length, 0);
});

test("an older server that never answers pings is not treated as dead", () => {
  const { liveness, advance, stale } = setup();
  liveness.start();
  advance(120000);
  liveness.probe();
  advance(10000);
  assert.equal(stale.length, 0);
});

test("a probe that goes unanswered reconnects quickly", () => {
  const { liveness, advance, stale } = setup();
  liveness.start();
  liveness.heard("pong");
  advance(3000);
  liveness.probe();
  advance(5001);
  assert.deepEqual(stale, ["probe_timeout"]);
});

test("a probe that is answered changes nothing", () => {
  const { liveness, advance, stale } = setup();
  liveness.start();
  liveness.heard("pong");
  liveness.probe();
  advance(1000);
  liveness.heard("pong");
  advance(5000);
  assert.equal(stale.length, 0);
});

test("stop cancels everything", () => {
  const { liveness, advance, stale, pings } = setup();
  liveness.start();
  liveness.heard("pong");
  liveness.stop();
  const sent = pings.length;
  advance(100000);
  assert.equal(stale.length, 0);
  assert.equal(pings.length, sent);
});
