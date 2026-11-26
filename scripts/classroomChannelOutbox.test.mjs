import test from "node:test";
import assert from "node:assert/strict";
import {
  chunkEventsForSend,
  enqueueOutboxEvent,
  isEphemeralClassroomEvent,
} from "../lib/classroomChannelOutbox.mjs";

test("transient events are not queued while disconnected", () => {
  let box = [];
  box = enqueueOutboxEvent(box, { type: "TEACHER_POINTER_MOVE", x: 1 });
  box = enqueueOutboxEvent(box, { type: "CHAT_TYPING" });
  box = enqueueOutboxEvent(box, { type: "MODERATION_MUTE", targetUserId: 4 });
  assert.deepEqual(box, []);
  assert.equal(isEphemeralClassroomEvent({ type: "CAPTION" }), true);
  assert.equal(isEphemeralClassroomEvent({ type: "SET_RESOURCE" }), false);
});

test("only the newest state event is kept, per resource", () => {
  let box = [];
  box = enqueueOutboxEvent(box, { type: "REQUEST_RESOURCE" });
  box = enqueueOutboxEvent(box, { type: "PDF_SCROLL", resourceId: "a", y: 1 });
  box = enqueueOutboxEvent(box, { type: "PDF_SCROLL", resourceId: "b", y: 5 });
  box = enqueueOutboxEvent(box, { type: "PDF_SCROLL", resourceId: "a", y: 2 });
  box = enqueueOutboxEvent(box, { type: "REQUEST_RESOURCE" });
  box = enqueueOutboxEvent(box, { type: "CHAT_MESSAGE", id: "m1" });
  box = enqueueOutboxEvent(box, { type: "CHAT_MESSAGE", id: "m2" });
  assert.deepEqual(box, [
    { type: "PDF_SCROLL", resourceId: "b", y: 5 },
    { type: "PDF_SCROLL", resourceId: "a", y: 2 },
    { type: "REQUEST_RESOURCE" },
    { type: "CHAT_MESSAGE", id: "m1" },
    { type: "CHAT_MESSAGE", id: "m2" },
  ]);
});

test("the outbox is bounded and ignores malformed events", () => {
  let box = [];
  for (let i = 0; i < 130; i += 1) box = enqueueOutboxEvent(box, { type: "CHAT_MESSAGE", id: String(i) });
  assert.equal(box.length, 100);
  assert.equal(box[0].id, "30");
  assert.equal(enqueueOutboxEvent(box, null), box);
  assert.equal(enqueueOutboxEvent(box, { nope: true }), box);
});

test("bursts are split into frames under the server size limit", () => {
  const big = { type: "ANNOTATION_STATE", data: "x".repeat(90) };
  const frames = chunkEventsForSend([big, big, big, { type: "A" }], 250);
  assert.equal(frames.length, 3);
  assert.deepEqual(frames.flat().length, 4);
  for (const frame of frames) {
    assert.ok(JSON.stringify(frame).length <= 250 + 10 || frame.length === 1);
  }
  assert.deepEqual(chunkEventsForSend([]), []);
});
