import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedClassroomEvent } from "../lib/classroomEventTrust.mjs";

test("rejects teacher-only events stamped as learner", () => {
  assert.equal(isTrustedClassroomEvent({ type: "CLASSROOM_LOCK", _from: { role: "learner" } }), false);
  assert.equal(isTrustedClassroomEvent({ type: "SET_RESOURCE", _from: { role: "learner" } }), false);
});

test("accepts teacher/admin control events and ordinary learner events", () => {
  assert.equal(isTrustedClassroomEvent({ type: "CLASSROOM_LOCK", _from: { role: "teacher" } }), true);
  assert.equal(isTrustedClassroomEvent({ type: "SET_RESOURCE", _from: { role: "admin" } }), true);
  assert.equal(isTrustedClassroomEvent({ type: "RAISE_HAND", _from: { role: "learner" } }), true);
});

test("accepts unstamped events for backward compatibility, rejects malformed", () => {
  assert.equal(isTrustedClassroomEvent({ type: "CLASSROOM_LOCK" }), true);
  assert.equal(isTrustedClassroomEvent(null), false);
  assert.equal(isTrustedClassroomEvent({ type: 1 }), false);
});
