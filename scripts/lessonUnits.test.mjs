import test from "node:test";
import assert from "node:assert/strict";
import { groupLessonsIntoUnits, mainUnitOf, materialIds, unitTopic } from "../lib/lessonUnits.mjs";

const unit = (id, order, band = "band-a2") => ({
  _id: id,
  title: `Unit ${order} · Topic ${order}`,
  order,
  bookLevel: { _id: band, title: band === "band-a2" ? "A2.1" : "B1.1", order: band === "band-a2" ? 4 : 6, book: { title: "English for Life", order: 1 } },
});

const LOOKUP = {
  resources: { r4a: "u4", r4b: "u4", r5a: "u5", r5b: "u5", r6a: "u6" },
  units: { u4: unit("u4", 4), u5: unit("u5", 5), u6: unit("u6", 1, "band-b1") },
};

const done = { review: { done: true }, practise: { done: true }, homework: null, next: null, done: true };
const open = { review: { done: false }, practise: null, homework: null, next: "review", done: false };
const none = { review: null, practise: null, homework: null, next: null, done: false };

const lesson = (id, day, materials, steps = done, extra = {}) => ({
  id,
  startAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  materials: materials.map((m, index) => (typeof m === "string" ? { id: m, firstOpenedAt: null, index } : m)),
  steps,
  items: [],
  homework: [],
  ...extra,
});

test("a lesson belongs to the unit most of its materials came from", () => {
  assert.equal(mainUnitOf(lesson(1, 1, ["r4a", "r5a", "r5b"]), LOOKUP.resources), "u5");
  assert.equal(mainUnitOf(lesson(1, 1, ["upload", "unknown"]), LOOKUP.resources), null);
});

test("on a tie the unit of the first material opened wins", () => {
  const tied = lesson(1, 1, [
    { id: "r5a", firstOpenedAt: "2026-11-01T10:20:00Z" },
    { id: "r4a", firstOpenedAt: "2026-11-01T10:05:00Z" },
  ]);
  assert.equal(mainUnitOf(tied, LOOKUP.resources), "u4");
  assert.equal(mainUnitOf(lesson(1, 1, ["r5a", "r4a"]), LOOKUP.resources), "u5");
});

test("lessons without curriculum materials go under other lessons, newest first", () => {
  const result = groupLessonsIntoUnits([lesson(1, 1, []), lesson(2, 2, ["upload"]), lesson(3, 3, ["r4a"])], LOOKUP);
  assert.deepEqual(result.other.map((l) => l.id), [2, 1]);
  assert.deepEqual(result.units.map((u) => u.id), ["u4"]);
});

test("a unit is finished once its lessons are done and the learner moved on", () => {
  const result = groupLessonsIntoUnits(
    [lesson(1, 1, ["r4a"]), lesson(2, 3, ["r4b"]), lesson(3, 5, ["r5a"], open)],
    LOOKUP
  );
  const [u4, u5] = result.units;
  assert.equal(u4.status, "finished");
  assert.equal(u4.completed, 2);
  assert.equal(u5.status, "current");
  assert.equal(result.current.id, "u5");
});

test("a unit stays in progress while a lesson is open, even after moving on", () => {
  const result = groupLessonsIntoUnits([lesson(1, 1, ["r4a"], open), lesson(2, 3, ["r5a"])], LOOKUP);
  assert.equal(result.units.find((u) => u.id === "u4").status, "in_progress");
});

test("the latest unit is never finished until the learner starts the next one", () => {
  const result = groupLessonsIntoUnits([lesson(1, 1, ["r4a"]), lesson(2, 2, ["r4b"])], LOOKUP);
  assert.equal(result.units[0].status, "current");
  assert.equal(result.units[0].completed, 2);
});

test("lessons with no feedback or homework don't count toward progress", () => {
  const result = groupLessonsIntoUnits([lesson(1, 1, ["r4a"]), lesson(2, 2, ["r4b"], none), lesson(3, 3, ["r5a"])], LOOKUP);
  const u4 = result.units.find((u) => u.id === "u4");
  assert.equal(u4.tracked, 1);
  assert.equal(u4.status, "finished");
});

test("units are ordered by level then unit number, and grouped by level", () => {
  const result = groupLessonsIntoUnits([lesson(1, 1, ["r6a"]), lesson(2, 2, ["r5a"]), lesson(3, 3, ["r4a"])], LOOKUP);
  assert.deepEqual(result.units.map((u) => u.id), ["u4", "u5", "u6"]);
  assert.deepEqual(result.levels.map((l) => [l.band, l.units.length]), [["A2.1", 2], ["B1.1", 1]]);
  assert.equal(result.units[0].topic, "Topic 4");
});

test("report rows and homework from every lesson are gathered with unique ids", () => {
  const item = { id: "a", type: "vocabulary", prompt: "convince", response: "To persuade." };
  const result = groupLessonsIntoUnits(
    [
      lesson(1, 1, ["r4a"], done, { items: [item], homework: [{ id: "hw1", status: "SUBMITTED" }] }),
      lesson(2, 2, ["r4b"], done, { items: [item] }),
    ],
    LOOKUP
  );
  assert.deepEqual(result.units[0].items.map((i) => i.id), ["1:a", "2:a"]);
  assert.deepEqual(result.units[0].homework, [{ id: "hw1", status: "SUBMITTED", lessonId: 1 }]);
});

test("helpers", () => {
  assert.equal(unitTopic("Unit 4 · Confident Travel"), "Confident Travel");
  assert.deepEqual(materialIds([lesson(1, 1, ["r4a", "r4b"]), lesson(2, 2, ["r4a"])]), ["r4a", "r4b"]);
});
