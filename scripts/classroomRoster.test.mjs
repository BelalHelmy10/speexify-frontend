import test from "node:test";
import assert from "node:assert/strict";
import { buildClassroomRoster } from "../lib/classroomRoster.mjs";

const nameOf = (learner) => learner.name;

test("a learner sharing the teacher's name is shown in the call by account", () => {
  const roster = buildClassroomRoster({
    teacherName: "Belal Helmy",
    learners: [{ id: 10, name: "Belal Helmy" }],
    learnerName: nameOf,
    liveParticipants: [{ id: "tile-10", displayName: "Belal Helmy" }],
    identities: new Map([["tile-10", 10]]),
    selfInCall: true,
    viewerIsTeacher: true,
  });
  assert.equal(roster.teacherLive, true);
  assert.equal(roster.learnerRows[0].inCall, true);
  assert.equal(roster.learnerRows[0].liveParticipant.id, "tile-10");
  assert.equal(roster.inCallCount, 2);
  assert.deepEqual(roster.unmatched, []);
});

test("two learners with the same name: only the one in the call shows in the call", () => {
  const roster = buildClassroomRoster({
    teacherName: "Ahmed",
    learners: [{ id: 10, name: "Belal Helmy" }, { id: 11, name: "Belal Helmy" }],
    learnerName: nameOf,
    liveParticipants: [{ id: "tile-11", displayName: "Belal Helmy" }],
    identities: new Map([["tile-11", 11]]),
    selfInCall: true,
    viewerIsTeacher: true,
  });
  assert.deepEqual(roster.learnerRows.map((row) => row.inCall), [false, true]);
});

test("an ambiguous name is never guessed before the tile is identified", () => {
  const roster = buildClassroomRoster({
    teacherName: "Belal Helmy",
    learners: [{ id: 10, name: "Belal Helmy" }],
    learnerName: nameOf,
    liveParticipants: [{ id: "tile-x", displayName: "Belal Helmy" }],
    identities: new Map(),
    selfInCall: true,
    viewerIsTeacher: true,
  });
  // The teacher's own row stays right; the unidentified tile is listed apart.
  assert.equal(roster.teacherLive, true);
  assert.equal(roster.learnerRows[0].inCall, false);
  assert.deepEqual(roster.unmatched.map((p) => p.id), ["tile-x"]);
});

test("unique names still match before identities arrive", () => {
  const roster = buildClassroomRoster({
    teacherName: "Ahmed Yasser",
    learners: [{ id: 10, name: "Belal Helmy" }],
    learnerName: nameOf,
    liveParticipants: [{ id: "tile-x", displayName: "belal  helmy" }],
    selfInCall: true,
    viewerIsTeacher: true,
  });
  assert.equal(roster.learnerRows[0].inCall, true);
});

test("a learner viewing sees themselves and the teacher correctly", () => {
  const roster = buildClassroomRoster({
    teacherName: "Ahmed Yasser",
    learners: [{ id: 10, name: "Belal Helmy" }],
    learnerName: nameOf,
    liveParticipants: [{ id: "teacher-tile", displayName: "Ahmed Yasser" }],
    selfInCall: true,
    viewerIsTeacher: false,
    viewerUserId: 10,
  });
  assert.equal(roster.teacherLive, true);
  assert.equal(roster.learnerRows[0].inCall, true);
  assert.equal(roster.inCallCount, 2);
});
