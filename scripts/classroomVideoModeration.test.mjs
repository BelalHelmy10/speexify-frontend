import test from "node:test";
import assert from "node:assert/strict";
import {
  isRemovalFor,
  moderationMuteFor,
  participantIdentityFrom,
  resolveModerationTarget,
} from "../lib/classroomVideoModeration.mjs";

const fromTeacher = { userId: 3, role: "teacher" };
const fromLearner = { userId: 8, role: "learner" };

test("learner mutes itself only for a server-stamped teacher request aimed at it", () => {
  const me = { localUserId: 7, isTeacher: false };
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all", _from: fromTeacher }, me), "audio");
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "video", targetUserId: 7, _from: fromTeacher }, me), "video");
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "audio", targetUserId: 9, _from: fromTeacher }, me), null);
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all", _from: fromLearner }, me), null);
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all" }, me), null);
  assert.equal(moderationMuteFor({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all", _from: fromTeacher }, { localUserId: 3, isTeacher: true }), null);
});

test("removal applies only to the targeted learner from a teacher", () => {
  const me = { localUserId: 7, isTeacher: false };
  assert.equal(isRemovalFor({ type: "MODERATION_REMOVE", targetUserId: 7, _from: fromTeacher }, me), true);
  assert.equal(isRemovalFor({ type: "MODERATION_REMOVE", targetUserId: 9, _from: fromTeacher }, me), false);
  assert.equal(isRemovalFor({ type: "MODERATION_REMOVE", targetUserId: 7, _from: fromLearner }, me), false);
});

test("identity is accepted only when it matches the server stamp", () => {
  assert.deepEqual(
    participantIdentityFrom({ type: "VIDEO_PARTICIPANT", participantId: "ab12", userId: 8, _from: fromLearner }),
    { participantId: "ab12", userId: 8 }
  );
  assert.equal(participantIdentityFrom({ type: "VIDEO_PARTICIPANT", participantId: "ab12", userId: 3, _from: fromLearner }), null);
  assert.equal(participantIdentityFrom({ type: "VIDEO_PARTICIPANT", participantId: "ab12", userId: 8 }), null);
});

test("target resolution prefers the authenticated mapping", () => {
  const identities = new Map([["ab12", 8]]);
  assert.equal(resolveModerationTarget({ participantId: "ab12", learnerUserId: 5, identities }), 8);
  assert.equal(resolveModerationTarget({ participantId: "zz", learnerUserId: 5, identities }), 5);
  assert.equal(resolveModerationTarget({ participantId: "zz", learnerUserId: null, identities }), null);
});
