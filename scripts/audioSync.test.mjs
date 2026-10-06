import assert from "node:assert/strict";
import test from "node:test";
import {
  getAudioTargetTime,
  planAudioSync,
  shouldApplyAudioState,
} from "../app/resources/prep/audioSync.mjs";

test("steady playback does not seek or replay on frequent clock updates", () => {
  const action = planAudioSync({
    playing: true,
    paused: false,
    currentTime: 42.3,
    targetTime: 42.55,
    readyState: 4,
  });
  assert.deepEqual(action, { seek: false, play: false, pause: false });
});

test("a real seek, play transition, and pause transition are applied", () => {
  assert.deepEqual(planAudioSync({
    playing: true, paused: false, currentTime: 12, targetTime: 40,
    readyState: 4,
  }), { seek: true, play: false, pause: false });
  assert.deepEqual(planAudioSync({
    playing: true, paused: true, currentTime: 0, targetTime: 40,
    readyState: 4,
  }), { seek: true, play: true, pause: false });
  assert.deepEqual(planAudioSync({
    playing: false, paused: false, currentTime: 40, targetTime: 40,
    readyState: 4,
  }), { seek: false, play: false, pause: true });
});

test("a buffered stream is not repeatedly sought while stalled", () => {
  assert.deepEqual(planAudioSync({
    playing: true, paused: false, currentTime: 12, targetTime: 18,
    readyState: 1,
  }), { seek: false, play: false, pause: false });
});

test("an inaccurate device clock cannot jump the learner far ahead", () => {
  assert.equal(getAudioTargetTime({
    baseTime: 30, sentAt: 1000, playing: true, now: 301000,
  }), 31.5);
  assert.equal(getAudioTargetTime({
    baseTime: 30, sentAt: 301000, playing: true, now: 1000,
  }), 30);
  assert.equal(getAudioTargetTime({
    baseTime: 30, sentAt: 1000, playing: false, now: 301000,
  }), 30);
});

test("fresh teacher playback survives a page reload that resets its sequence", () => {
  assert.equal(shouldApplyAudioState({
    seq: 1, sentAt: 2000, lastSeq: 365, lastSentAt: 1000,
  }), true);
  assert.equal(shouldApplyAudioState({
    seq: 364, sentAt: 900, lastSeq: 365, lastSentAt: 1000,
  }), false);
  assert.equal(shouldApplyAudioState({
    seq: 365, sentAt: 1000, lastSeq: 365, lastSentAt: 1000,
  }), false);
});
