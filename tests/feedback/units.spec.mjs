// Unit pages: a learner's lessons grouped into the course units they covered,
// and one unit with its lessons, review, homework and materials.
import { test, expect } from "@playwright/test";
import { buildFeedbackHarness } from "./support/buildFeedbackHarness.mjs";

const harness = buildFeedbackHarness({ entry: "tests/feedback/support/unitsHarnessEntry.jsx" });

const band = { _id: "band-a21", title: "A2.1", order: 4, book: { _id: "book-life", title: "English for Life", order: 1 } };
const UNITS = {
  "unit-04": {
    _id: "unit-04",
    title: "Unit 4 · Confident Travel",
    slug: "speexify-life-a2-1-04",
    summary: "Book trips, ask for directions and sort out problems on the road.",
    order: 4,
    bookLevel: band,
    materials: [
      { _id: "r4-sheet", title: "Travel worksheet", kind: "worksheet" },
      { _id: "r4-audio", title: "At the airport", kind: "audio" },
      { _id: "r4-test", title: "Unit 4 test", kind: "quiz" },
    ],
  },
  "unit-05": {
    _id: "unit-05",
    title: "Unit 5 · Money in Real Life",
    slug: "speexify-life-a2-1-05",
    summary: "Talk about prices, budgets and paying for things.",
    order: 5,
    bookLevel: band,
    materials: [{ _id: "r5-sheet", title: "Money worksheet", kind: "worksheet" }],
  },
};
const RESOURCES = { "r4-sheet": "unit-04", "r4-audio": "unit-04", "r4-test": "unit-04", "r5-sheet": "unit-05" };

const done = { review: { done: true }, practise: { done: true }, homework: null, next: null, done: true };
const DONE_WITH_HOMEWORK = { ...done, homework: { done: true, total: 1, completed: 1 } };
const REVIEW_NEXT = { review: { done: false }, practise: { done: false }, homework: null, next: "review", done: false };

const LESSONS = [
  {
    id: 101,
    title: "Booking a trip",
    startAt: "2026-11-10T12:00:00.000Z",
    teacherName: "Sara",
    hasFeedback: true,
    materials: [{ id: "r4-sheet", firstOpenedAt: "2026-11-10T12:05:00.000Z" }],
    items: [
      { id: "a", type: "vocabulary", prompt: "itinerary", response: "A plan of a journey." },
      { id: "b", type: "grammar", prompt: "I *have went* there.", response: "I *have been* there." },
    ],
    homework: [{ id: "hw1", title: "Plan your trip", status: "SUBMITTED", dueAt: null, completedTasks: 4, taskCount: 4 }],
    steps: DONE_WITH_HOMEWORK,
  },
  {
    id: 102,
    title: "Problems on the road",
    startAt: "2026-11-14T12:00:00.000Z",
    teacherName: "Sara",
    hasFeedback: true,
    materials: [{ id: "r4-audio", firstOpenedAt: "2026-11-14T12:05:00.000Z" }, { id: "r5-sheet", firstOpenedAt: "2026-11-14T12:40:00.000Z" }],
    items: [
      { id: "a", type: "vocabulary", prompt: "delay", response: "When something happens later than planned." },
      { id: "c", type: "pronunciation", prompt: "luggage", response: "" },
    ],
    homework: [],
    steps: done,
  },
  {
    id: 103,
    title: "Paying for things",
    startAt: "2026-11-20T12:00:00.000Z",
    teacherName: "Sara",
    hasFeedback: true,
    materials: [{ id: "r5-sheet", firstOpenedAt: "2026-11-20T12:05:00.000Z" }],
    items: [{ id: "a", type: "vocabulary", prompt: "budget", response: "The money you plan to spend." }],
    homework: [{ id: "hw2", title: "Monthly budget", status: "ASSIGNED", dueAt: "2026-11-28T18:00:00.000Z", completedTasks: 0, taskCount: 3 }],
    steps: REVIEW_NEXT,
  },
  {
    id: 104,
    title: "Free conversation",
    startAt: "2026-11-22T12:00:00.000Z",
    teacherName: "Sara",
    hasFeedback: false,
    materials: [],
    items: [],
    homework: [],
    steps: { review: null, practise: null, homework: null, next: null, done: false },
  },
];

async function mount(page, { props = {}, lessons = LESSONS, lookupFails = false, role = "learner" } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://feedback.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:system-ui"><div id="root"></div></body></html>',
    })
  );
  await page.route("http://feedback.test/api/curriculum/units", async (route) => {
    const { ids } = route.request().postDataJSON();
    if (lookupFails) return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    const resources = Object.fromEntries(ids.map((id) => [id, RESOURCES[id] || null]));
    const units = Object.fromEntries(Object.values(resources).filter(Boolean).map((id) => [id, UNITS[id]]));
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ resources, units }) });
  });
  await page.addInitScript(
    ({ props, lessons, role }) => {
      window.feedbackTest = {
        role,
        props,
        pathname: "/dashboard/units",
        posts: [],
        toasts: [],
        navigations: [],
        gets: [],
        session: {},
        handle(method, url) {
          if (method === "get") window.feedbackTest.gets.push(url);
          if (url === "/me/lesson-history") return { lessons };
          if (url === "/learners/10/lesson-history") return { learner: { id: 10, name: "Nour" }, lessons };
          return undefined;
        },
      };
    },
    { props, lessons, role }
  );
  await page.goto("http://feedback.test/");
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  return errors;
}

test("the overview puts the current unit first and groups units by level", async ({ page }) => {
  const errors = await mount(page);
  const current = page.locator("section", { has: page.getByRole("heading", { name: "Current unit" }) });
  await expect(current.locator(".unit-card")).toContainText("Money in Real Life");
  await expect(current.locator(".unit-card")).toContainText("0 of 1 lessons complete");

  const level = page.locator("section", { has: page.getByRole("heading", { name: "English for Life · A2.1" }) });
  await expect(level.locator(".unit-card")).toHaveCount(2);
  const travel = level.locator(".unit-card", { hasText: "Confident Travel" });
  await expect(travel.locator(".unit-status")).toHaveText("Finished");
  await expect(travel).toContainText("2 of 2 lessons complete");
  await expect(travel.locator("a")).toHaveAttribute("href", "/dashboard/units/unit-04");

  // The lesson with no course materials sits under other lessons.
  const other = page.locator("section", { has: page.getByRole("heading", { name: "Other lessons" }) });
  await expect(other).toContainText("Free conversation");
  await expect(other).toContainText("Waiting for your teacher's feedback");
  expect(errors).toEqual([]);
});

test("a unit page shows its lessons, review, homework and materials", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors = await mount(page, { props: { unitId: "unit-04" } });

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Confident Travel");
  await expect(page.locator(".unit-hero")).toContainText("English for Life · A2.1");
  await expect(page.locator(".unit-hero")).toContainText("2 of 2 lessons complete");
  await expect(page.locator(".unit-finished")).toContainText("You finished this unit");

  const lessons = page.locator(".unit-lesson");
  await expect(lessons).toHaveCount(2);
  await expect(lessons.first().locator("a")).toHaveAttribute("href", "/dashboard/sessions/101#lesson");
  await expect(lessons.first().locator(".unit-dots__dot.is-done")).toHaveCount(3);

  // Everything taught in the unit, together: words, mistakes, pronunciation, quiz.
  const review = page.locator(".units-block--review");
  await expect(review.locator(".fb-report__row")).toHaveCount(4);
  await expect(review.locator(".fb-report__row .fb-mark--wrong")).toHaveText(/have went/);
  await expect(review.locator(".fb-report__row .fb-mark--right")).toHaveText(/have been/);
  await expect(review.locator(".session-report-quiz")).toBeVisible();
  await expect(review.getByRole("heading", { name: /Pronunciation/ })).toBeVisible();

  await expect(page.locator(".unit-homework")).toContainText("Plan your trip");
  await expect(page.locator(".unit-homework")).toContainText("Submitted");
  await expect(page.locator(".unit-homework a")).toHaveAttribute("href", "/dashboard/homework/hw1");

  const materials = page.locator(".unit-materials li");
  await expect(materials).toHaveCount(3);
  await expect(materials.filter({ hasText: "Used in class" })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Open the unit materials" })).toHaveAttribute(
    "href",
    "/resources/units/speexify-life-a2-1-04"
  );
  expect(errors).toEqual([]);
});

test("the current unit is not finished and lists its open homework", async ({ page }) => {
  await mount(page, { props: { unitId: "unit-05" } });
  await expect(page.locator(".unit-hero .unit-status")).toHaveText("Current");
  await expect(page.locator(".unit-finished")).toHaveCount(0);
  await expect(page.locator(".unit-homework")).toContainText("Not started");
  await expect(page.locator(".unit-homework")).toContainText("Due Nov 28, 2026");
});

test("a teacher opens a learner's units and every link keeps the learner", async ({ page }) => {
  await mount(page, { role: "teacher", props: { learnerId: "10" } });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nour's units");
  expect(await page.evaluate(() => window.feedbackTest.gets)).toEqual(["/learners/10/lesson-history"]);
  await expect(page.locator(".unit-card a").first()).toHaveAttribute("href", /\?learner=10$/);
});

test("a failed curriculum lookup shows a retry", async ({ page }) => {
  await mount(page, { lookupFails: true });
  await expect(page.getByRole("alert")).toContainText("couldn't load your units");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a learner with no lessons sees what to expect", async ({ page }) => {
  await mount(page, { lessons: [] });
  await expect(page.locator(".units-page__state")).toContainText("after your first lesson with course materials");
});

test("Arabic learners get the unit pages in Arabic", async ({ page }) => {
  const errors = await mount(page, { props: { locale: "ar", unitId: "unit-04" } });
  await expect(page.locator(".unit-hero .unit-status")).toHaveText("مكتملة");
  await expect(page.locator(".unit-hero")).toContainText("الحصص المكتملة: 2 من 2");
  await expect(page.getByRole("link", { name: "كل الوحدات" })).toHaveAttribute("href", "/ar/dashboard/units");
  await expect(page.locator(".unit-lesson a").first()).toHaveAttribute("href", "/ar/dashboard/sessions/101#lesson");
  expect(errors).toEqual([]);
});

for (const unitId of [null, "unit-04"]) {
  test(`the ${unitId ? "unit page" : "overview"} fits a phone screen`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mount(page, { props: { unitId } });
    await expect(page.locator(".unit-card, .unit-hero").first()).toBeVisible();
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll(".units-page *")]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.right > innerWidth + 1;
        })
        .map((element) => element.className)
        .slice(0, 5)
    );
    expect(overflow).toEqual([]);
  });
}
