import test from "node:test";
import assert from "node:assert/strict";
import { getEventTone, getEventToneLabelKey } from "../lib/calendarSessionStatus.mjs";

const NOW = Date.parse("2026-11-28T12:00:00Z");
const hour = 60 * 60 * 1000;
const session = (startOffsetHours, overrides = {}) => {
  const start = new Date(NOW + startOffsetHours * hour);
  const end = new Date(start.getTime() + hour);
  return { status: "scheduled", start, end, endsAtMs: end.getTime(), ...overrides };
};

test("upcoming, live, needs feedback, feedback written and cancelled", () => {
  assert.equal(getEventTone(session(24), NOW), "scheduled");
  assert.equal(getEventTone(session(0.1), NOW), "live"); // opens 15 minutes early
  assert.equal(getEventTone(session(-0.5), NOW), "live");
  assert.equal(getEventTone(session(-24), NOW), "needs-feedback");
  assert.equal(getEventTone(session(-24, { hasFeedback: true }), NOW), "done");
  assert.equal(getEventTone(session(-24, { status: "canceled" }), NOW), "canceled");
  assert.equal(getEventTone(session(24, { status: "canceled" }), NOW), "canceled");
});

test("a session marked completed is finished, even while its time slot runs", () => {
  assert.equal(getEventTone(session(-0.5, { status: "completed" }), NOW), "needs-feedback");
  assert.equal(getEventTone(session(-0.5, { status: "completed", hasFeedback: true }), NOW), "done");
});

test("a finished training never waits for learner feedback", () => {
  assert.equal(getEventTone(session(-24, { isTraining: true }), NOW), "done");
  assert.equal(getEventToneLabelKey({ isTraining: true }, "done"), "event_completed");
});

test("a group session's color follows its status, not its kind", () => {
  assert.equal(getEventTone(session(24, { isGroup: true }), NOW), "scheduled");
  assert.equal(getEventTone(session(-24, { isGroup: true }), NOW), "needs-feedback");
});

test("teachers and learners read amber differently", () => {
  assert.equal(getEventToneLabelKey({ viewerTeaches: true }, "needs-feedback"), "event_needs_feedback");
  assert.equal(getEventToneLabelKey({ viewerTeaches: false }, "needs-feedback"), "event_feedback_coming");
  assert.equal(getEventToneLabelKey({}, "done"), "event_feedback_written");
});
