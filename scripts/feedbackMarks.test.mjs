import assert from "node:assert/strict";
import test from "node:test";
import {
  getMistakeSegments,
  hasUnpairedMark,
  parseMarkedText,
  splitCorrectionAndExplanation,
  stripMarks,
  toggleMarkAroundSelection,
} from "../lib/feedbackMarks.mjs";

const render = (segments) => segments.map((s) => (s.marked ? `[${s.text}]` : s.text)).join("");

test("words between asterisks are marked", () => {
  assert.equal(render(parseMarkedText("Let me *to check* the order.")), "Let me [to check] the order.");
  assert.equal(render(parseMarkedText("*Is* important")), "[Is] important");
  assert.equal(render(parseMarkedText("Two *marks* in *one* line")), "Two [marks] in [one] line");
});

test("a stray asterisk stays as text and is reported", () => {
  assert.equal(render(parseMarkedText("I am *agree with you.")), "I am *agree with you.");
  assert.equal(hasUnpairedMark("I am *agree with you."), true);
  assert.equal(hasUnpairedMark("I *am agree* with you."), false);
});

test("asterisks never leak into plain text", () => {
  assert.equal(stripMarks("I *agree* with you."), "I agree with you.");
});

test("Arabic text is marked the same way", () => {
  assert.equal(render(parseMarkedText("هذه رحلة *ممتع*.")), "هذه رحلة [ممتع].");
});

test("mistake rows use asterisks when present", () => {
  const { source, before, after } = getMistakeSegments("I apologize *about* the delay.", "I apologize *for* the delay.");
  assert.equal(source, "marks");
  assert.equal(render(before), "I apologize [about] the delay.");
  assert.equal(render(after), "I apologize [for] the delay.");
});

test("mistake rows without asterisks find the changed words", () => {
  const { source, before, after } = getMistakeSegments("Let me to check the order.", "Let me check the order.");
  assert.equal(source, "auto");
  assert.equal(render(before), "Let me [to] check the order.");
  assert.equal(render(after), "Let me check the order.");

  const insert = getMistakeSegments("We will look the issue.", "We will look into the issue.");
  assert.equal(render(insert.after), "We will look [into] the issue.");
});

test("identical sentences are not highlighted", () => {
  assert.equal(getMistakeSegments("Same words.", "Same words.").source, "plain");
});

test("the mark shortcut wraps and unwraps the selection", () => {
  const text = "I am agree with you.";
  const wrapped = toggleMarkAroundSelection(text, 2, 11);
  assert.equal(wrapped.value, "I *am agree* with you.");
  const unwrapped = toggleMarkAroundSelection(wrapped.value, wrapped.start, wrapped.end);
  assert.equal(unwrapped.value, text);
  // Selecting only the inner words also unwraps.
  assert.equal(toggleMarkAroundSelection(wrapped.value, 3, 11).value, text);
});

test("the mark shortcut keeps edge spaces outside and marks the word under the cursor", () => {
  assert.equal(toggleMarkAroundSelection("I am agree with", 1, 5).value, "I *am* agree with");
  assert.equal(toggleMarkAroundSelection("I am agree with", 7, 7).value, "I am *agree* with");
});

test("older corrections keep their explanation after a bar", () => {
  assert.deepEqual(splitCorrectionAndExplanation("I agree with you. | Agree is already a verb."), {
    correction: "I agree with you.",
    explanation: "Agree is already a verb.",
  });
});
