import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUnreadCount,
  getUnreadChatLabel,
  normalizeUnreadCount,
} from "../lib/classroomChatUnread.mjs";

test("normalizes unread counts defensively", () => {
  assert.equal(normalizeUnreadCount(undefined), 0);
  assert.equal(normalizeUnreadCount(-4), 0);
  assert.equal(normalizeUnreadCount(Number.NaN), 0);
  assert.equal(normalizeUnreadCount(2.9), 2);
  assert.equal(normalizeUnreadCount("7"), 7);
});

test("keeps the visual badge compact while preserving the exact accessible count", () => {
  assert.equal(formatUnreadCount(1), "1");
  assert.equal(formatUnreadCount(99), "99");
  assert.equal(formatUnreadCount(100), "99+");
  assert.equal(getUnreadChatLabel(1), "1 unread chat message");
  assert.equal(getUnreadChatLabel(125), "125 unread chat messages");
});
