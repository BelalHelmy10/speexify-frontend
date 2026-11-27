import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { calendarFile, dayKey, groupSlots, normalizeTrialPhone, period, zonedDayBounds } from "../lib/trialBooking.mjs";

test("slots are grouped by the learner's date, including midnight boundaries", () => {
  const slots = [{ id: 1, startAt: "2027-01-02T23:30:00Z" }, { id: 2, startAt: "2027-01-03T01:00:00Z" }];
  assert.equal(groupSlots(slots, "Africa/Cairo").length, 1);
  assert.equal(groupSlots(slots, "UTC").length, 2);
  assert.equal(dayKey(slots[0].startAt, "Africa/Cairo"), "2027-01-03");
  assert.equal(period(slots[0].startAt, "Africa/Cairo"), "morning");
});
test("phone normalization accepts Arabic digits and international prefixes", () => {
  assert.equal(normalizeTrialPhone("٠٠٢٠ ١٠٠ ١٢٣ ٤٥٦٧"), "+201001234567");
  assert.equal(normalizeTrialPhone("+20 (100) 123-4567"), "+201001234567");
  assert.equal(normalizeTrialPhone("+۲۰۱۰۰۱۲۳۴۵۶۷"), "+201001234567");
});
test("calendar export uses UTC and contains no private management token or phone", () => {
  const booking = { id: "reference", phone: "+201001234567", slot: { startAt: "2027-01-02T16:00:00Z", endAt: "2027-01-02T16:30:00Z" } };
  const file = calendarFile(booking);
  assert.match(file, /DTSTART:20270102T160000Z/);
  assert.match(file, /DTEND:20270102T163000Z/);
  assert.ok(!file.includes(booking.phone));
  assert.match(file, /END:VCALENDAR\r\n$/);
});
test("English and Arabic booking copy expose identical translation keys", async () => {
  const load = async (name) => import(`data:text/javascript;base64,${Buffer.from(readFileSync(new URL(`../components/trial/${name}.js`, import.meta.url), "utf8")).toString("base64")}`);
  const { trialCopy } = await load("copy"); const { adminTrialCopy } = await load("adminCopy");
  for (const pair of [trialCopy, adminTrialCopy]) {
    assert.deepEqual(Object.keys(pair.en).sort(), Object.keys(pair.ar).sort());
    assert.deepEqual(Object.keys(pair.en.errors).sort(), Object.keys(pair.ar.errors).sort());
  }
});

test("today filters cover the complete Cairo day through DST transitions", () => {
  const spring = zonedDayBounds("2027-04-30", "Africa/Cairo");
  assert.equal(Date.parse(spring.to) - Date.parse(spring.from), 23 * 3600000);
  const autumn = zonedDayBounds("2027-10-28", "Africa/Cairo");
  assert.equal(Date.parse(autumn.to) - Date.parse(autumn.from), 25 * 3600000);
});

test("private management links are redacted from error monitoring", async () => {
  const { redactTrialTelemetry } = await import("../lib/redactTrialTelemetry.mjs");
  const token = "a".repeat(64);
  const event = { request: { url: `https://speexify.com/trial-booking#manage=${token}`, data: { token } }, breadcrumbs: [{ data: { to: `/ar/trial-booking#manage=${token}` } }], message: "ordinary error" };
  const clean = redactTrialTelemetry(event);
  assert.ok(!JSON.stringify(clean).includes(token));
  assert.equal(clean.message, "ordinary error");
  assert.ok(JSON.stringify(event).includes(token));
});
