import test from "node:test";
import assert from "node:assert/strict";
import {
  applyStrokeEvent,
  buildStrokeAddMessage,
  buildStrokeProgressMessage,
  createAnnotationStateAssembler,
  quantizePoint,
  shouldAppendPoint,
  splitAnnotationState,
} from "../lib/classroomAnnotationSync.mjs";

test("points are quantised and near-duplicates skipped", () => {
  assert.deepEqual(quantizePoint({ x: 0.123456789, y: 0.98765432, p: 1 }), { x: 0.1235, y: 0.9877, p: 1 });
  assert.equal(shouldAppendPoint(null, { x: 0, y: 0 }), true);
  assert.equal(shouldAppendPoint({ x: 0.1, y: 0.1 }, { x: 0.1002, y: 0.1 }), false);
  assert.equal(shouldAppendPoint({ x: 0.1, y: 0.1 }, { x: 0.102, y: 0.1 }), true);
});

test("a stroke streams live and finishes identically on the receiver", () => {
  const stroke = { id: "s1", tool: "pen", color: "#f00", page: 2, strokeWidth: 3, points: [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }] };
  let remote = [];
  remote = applyStrokeEvent(remote, buildStrokeProgressMessage({ resourceId: "r", stroke }));
  assert.deepEqual(remote, [{ id: "s1", tool: "pen", color: "#f00", page: 2, strokeWidth: 3, points: stroke.points }]);

  stroke.points.push({ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 });
  const delta = buildStrokeProgressMessage({ resourceId: "r", stroke, fromIndex: 2 });
  assert.equal(delta.points.length, 2);
  assert.equal(delta.meta, undefined);
  remote = applyStrokeEvent(remote, delta);
  assert.equal(remote[0].points.length, 4);

  // Shape correction can replace the points on finish.
  const finished = { ...stroke, points: [{ x: 0, y: 0 }, { x: 0.3, y: 0.3 }] };
  remote = applyStrokeEvent(remote, buildStrokeAddMessage({ resourceId: "r", stroke: finished }));
  assert.deepEqual(remote, [finished]);
});

test("late or out-of-order deltas never corrupt a stroke", () => {
  const base = [{ id: "s1", points: [{ x: 0, y: 0 }] }];
  // Missed the start of a stroke: ignored until the final ADD.
  assert.equal(applyStrokeEvent([], { type: "ANNOTATION_STROKE_PROGRESS", strokeId: "s2", fromIndex: 5, points: [{ x: 1, y: 1 }] }).length, 0);
  // Gap in the deltas: keep existing points.
  assert.equal(applyStrokeEvent(base, { type: "ANNOTATION_STROKE_PROGRESS", strokeId: "s1", fromIndex: 4, points: [{ x: 1, y: 1 }] }), base);
  // Garbage points are dropped.
  const cleaned = applyStrokeEvent([], { type: "ANNOTATION_STROKE_ADD", stroke: { id: "s3", points: [{ x: 1, y: 1 }, { x: "a" }, null] } });
  assert.deepEqual(cleaned[0].points, [{ x: 1, y: 1 }]);
  assert.equal(applyStrokeEvent(base, { type: "OTHER" }), base);
});

test("large snapshots are split and reassembled in any order", () => {
  const strokes = Array.from({ length: 400 }, (_, i) => ({ id: `s${i}`, points: Array.from({ length: 40 }, (_, j) => ({ x: i / 400, y: j / 40 })) }));
  const payload = { type: "ANNOTATION_STATE", resourceId: "r", strokes };
  const parts = splitAnnotationState(payload, 50_000, () => "snap1");
  assert.ok(parts.length > 1);
  for (const part of parts) assert.ok(JSON.stringify(part).length < 60_000);

  const assembler = createAnnotationStateAssembler();
  let result = null;
  for (const part of [...parts].reverse()) result = assembler.push(part) || result;
  assert.deepEqual(result, payload);

  // Small states are sent as-is.
  const small = { type: "ANNOTATION_STATE", resourceId: "r", strokes: [] };
  assert.deepEqual(splitAnnotationState(small), [small]);
  assert.equal(assembler.push({ type: "ANNOTATION_STATE_PART", snapshotId: "x", index: 3, total: 2, chunk: "" }), null);
});
