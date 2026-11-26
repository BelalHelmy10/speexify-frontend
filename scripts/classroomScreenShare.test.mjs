import test from "node:test";
import assert from "node:assert/strict";
import {
  canShareScreen,
  normalizeContentSharingIds,
  resolveScreenShareState,
} from "../lib/classroomScreenShare.mjs";

test("normalizes the Jitsi contentSharingParticipantsChanged payload", () => {
  assert.deepEqual(normalizeContentSharingIds({ data: ["c58469ab"] }), ["c58469ab"]);
  assert.deepEqual(normalizeContentSharingIds({ data: [] }), []);
  assert.deepEqual(normalizeContentSharingIds(["a", "a", " ", null, 7]), ["a", "7"]);
  assert.deepEqual(normalizeContentSharingIds({ sharingParticipantIds: ["x"] }), ["x"]);
  assert.deepEqual(normalizeContentSharingIds(undefined), []);
});

test("a remote sharer is named from the Jitsi participant list", () => {
  const participants = new Map([["t1", "Teacher Mona"]]);
  assert.deepEqual(
    resolveScreenShareState({ sharingIds: ["t1"], localId: "l1", participants }),
    { isLocalSharer: false, remoteSharer: { id: "t1", name: "Teacher Mona" } }
  );
  assert.deepEqual(
    resolveScreenShareState({ sharingIds: ["zz"], localId: "l1", participants }).remoteSharer,
    { id: "zz", name: "Someone" }
  );
});

test("the local client is never shown as its own remote sharer", () => {
  assert.deepEqual(
    resolveScreenShareState({ sharingIds: ["l1"], localId: "l1" }),
    { isLocalSharer: true, remoteSharer: null }
  );
  assert.deepEqual(
    resolveScreenShareState({ sharingIds: [], localId: "l1", localSharing: true }),
    { isLocalSharer: true, remoteSharer: null }
  );
  assert.deepEqual(resolveScreenShareState({}), { isLocalSharer: false, remoteSharer: null });
});

test("screen sharing is offered only where browsers support it", () => {
  const desktop = { navigator: { mediaDevices: { getDisplayMedia() {} }, userAgent: "Mozilla/5.0 (Macintosh) Chrome/131", maxTouchPoints: 0 } };
  const ipad = { navigator: { mediaDevices: { getDisplayMedia() {} }, userAgent: "Mozilla/5.0 (Macintosh) Safari/605", maxTouchPoints: 5 } };
  const android = { navigator: { mediaDevices: { getDisplayMedia() {} }, userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile Chrome/131" } };
  const old = { navigator: { mediaDevices: {}, userAgent: "Mozilla/5.0 (Windows NT 10.0)" } };
  assert.equal(canShareScreen(desktop), true);
  assert.equal(canShareScreen(ipad), false);
  assert.equal(canShareScreen(android), false);
  assert.equal(canShareScreen(old), false);
  assert.equal(canShareScreen({}), false);
});
