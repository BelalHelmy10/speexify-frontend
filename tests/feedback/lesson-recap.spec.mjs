// The lesson recap on the session page: the learner reviews the report,
// practises it, then does the homework, and each step is ticked off.
import { test, expect } from "@playwright/test";
import { buildFeedbackHarness } from "./support/buildFeedbackHarness.mjs";

const lessonHarness = buildFeedbackHarness({ entry: "tests/feedback/support/lessonHarnessEntry.jsx" });
const feedbackHarness = buildFeedbackHarness();
const START = "[[SPEEXIFY_FEEDBACK_REPORT_V1]]";
const END = "[[/SPEEXIFY_FEEDBACK_REPORT_V1]]";

const REPORT = {
  summary: "Great session, Iñaki. Keep giving a reason after your opinion.",
  futureSteps: "Write a short paragraph with your opinion on remote work.",
  items: [
    { id: "a", type: "vocabulary", prompt: "convince", response: "To make someone believe something is true." },
    { id: "b", type: "grammar", prompt: "I *am agree* with you.", response: "I *agree* with you.", note: "Agree is already a verb." },
    { id: "c", type: "pronunciation", prompt: "convince", response: "https://howjsay.com/how-to-pronounce-convince" },
  ],
};

function savedFeedback(report) {
  return {
    messageToLearner: report.summary,
    commentsOnSession: `Structured session recap\n${START}\n${JSON.stringify({ version: 1, ...report })}\n${END}`,
    futureSteps: report.futureSteps,
  };
}

async function mount(page, { harness = lessonHarness, role = "learner", props = {}, teacherFeedback = savedFeedback(REPORT), state = {} } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://feedback.test/**", (route) =>
    // Tests answer /api/ requests with their own routes.
    route.request().url().includes("/api/") ? route.fallback() : route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:system-ui"><div id="root"></div></body></html>',
    })
  );
  await page.addInitScript(
    ({ role, props, teacherFeedback, state }) => {
      const lesson = { reviewedAt: null, practisedAt: null, practiceItems: 3, homework: [], materials: [], teacher: false, ...state };
      const steps = () => {
        const review = { done: Boolean(lesson.reviewedAt) };
        const practise = lesson.practiceItems ? { done: Boolean(lesson.practisedAt) } : null;
        const submitted = lesson.homework.filter((status) => status === "SUBMITTED").length;
        const homework = lesson.homework.length
          ? { done: submitted === lesson.homework.length, total: lesson.homework.length, completed: submitted }
          : null;
        const next = [["review", review], ["practise", practise], ["homework", homework]].find(([, step]) => step && !step.done)?.[0] || null;
        return { review, practise, homework, next, done: next === null };
      };
      window.lessonState = lesson;
      window.feedbackTest = {
        role,
        props,
        pathname: "/dashboard/sessions/s1/feedback",
        posts: [],
        toasts: [],
        navigations: [],
        session: { _id: "s1", title: "Voicing your opinion", startAt: "2026-11-26T12:30:00Z", teacherFeedback },
        handle(method, url, body) {
          if (url.endsWith("/homework")) {
            return {
              assignments: lesson.homework.map((status, index) => ({
                id: `hw${index + 1}`, title: "Opinion writing", status, completedTasks: 0, taskCount: 4, dueAt: null,
              })),
            };
          }
          if (!url.endsWith("/lesson-progress")) return undefined;
          if (method === "post") {
            const field = body.step === "reviewed" ? "reviewedAt" : "practisedAt";
            lesson[field] = lesson[field] || new Date().toISOString();
          }
          const progress = { reviewedAt: lesson.reviewedAt, practisedAt: lesson.practisedAt, steps: steps() };
          const materials = lesson.materials;
          if (lesson.teacher) return { practiceItems: lesson.practiceItems, materials, learners: [{ id: 10, name: "Iñaki", ...progress }] };
          return { practiceItems: lesson.practiceItems, materials, progress };
        },
      };
    },
    { role, props, teacherFeedback, state }
  );
  await page.goto("http://feedback.test/");
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  return errors;
}

const stepItem = (page, name) => page.locator(".lesson-recap__head .lesson-steps__item", { hasText: name });
const progressPosts = (page) =>
  page.evaluate(() => window.feedbackTest.posts.filter((post) => post.url.endsWith("/lesson-progress")).map((post) => post.body.step));

test("a learner reviews, practises and reaches the homework step", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await mount(page, { props: { withHomework: true }, state: { homework: ["ASSIGNED"] } });

  await expect(stepItem(page, "Review")).toHaveClass(/is-next/);
  await expect(page.locator("#lesson-review .fb-report__row .fb-mark--wrong")).toHaveText(/am agree/);
  await expect(page.locator("#lesson-review .fb-report__row .fb-mark--right")).toHaveText(/agree/);
  await expect(page.locator("#lesson-review")).toContainText("Keep giving a reason after your opinion.");
  expect(await progressPosts(page)).toEqual([]);

  // Reading to the end of the report ticks the review step.
  await page.locator(".lesson-step__sentinel").first().scrollIntoViewIfNeeded();
  await expect(stepItem(page, "Review")).toHaveClass(/is-done/);
  await expect(stepItem(page, "Practise")).toHaveClass(/is-next/);

  // Answering every quiz question correctly ticks the practice step.
  const quiz = page.locator(".session-report-quiz");
  await quiz.getByRole("button", { name: "To make someone believe something is true." }).click();
  await quiz.getByRole("button", { name: "I agree with you.", exact: true }).click();
  await expect(stepItem(page, "Practise")).toHaveClass(/is-done/);
  await expect(stepItem(page, "Homework")).toHaveClass(/is-next/);
  await expect(stepItem(page, "Homework")).toContainText("0 of 1 submitted");
  await expect(page.locator("#lesson-homework .test-homework")).toBeVisible();
  expect(await progressPosts(page)).toEqual(["reviewed", "practised"]);
  await expect(page.locator(".lesson-recap__done")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a finished lesson shows the done banner", async ({ page }) => {
  await mount(page, {
    props: { withHomework: true },
    state: { reviewedAt: "2026-11-26T15:00:00Z", practisedAt: "2026-11-26T15:10:00Z", homework: ["SUBMITTED"] },
  });
  await expect(page.locator(".lesson-recap__done")).toContainText("You finished this lesson");
  await expect(page.locator(".lesson-recap__head .lesson-steps__item--done")).toHaveClass(/is-done/);
  await expect(page.getByRole("button", { name: /Practice done/ })).toBeDisabled();
});

test("the practice button works without the quiz and the next button moves on", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: /Next: practise/ }).click();
  await expect(stepItem(page, "Review")).toHaveClass(/is-done/);
  await page.getByRole("button", { name: "I've practised" }).click();
  await expect(stepItem(page, "Practise")).toHaveClass(/is-done/);
  // No homework was set, so the lesson is complete.
  await expect(page.locator(".lesson-recap__done")).toBeVisible();
  await expect(page.locator("#lesson-homework")).toHaveCount(0);
});

test("the teacher sees each learner's progress and never ticks steps", async ({ page }) => {
  await mount(page, {
    role: "teacher",
    props: { canTeach: true, withHomework: true },
    state: { teacher: true, reviewedAt: "2026-11-26T15:00:00Z" },
  });
  await expect(page.getByRole("link", { name: "Edit feedback" })).toHaveAttribute("href", "/dashboard/sessions/42/feedback");
  const learner = page.locator(".lesson-recap__learners li", { hasText: "Iñaki" });
  await expect(learner.locator(".lesson-steps__item", { hasText: "Review" })).toHaveClass(/is-done/);
  await expect(learner.locator(".lesson-steps__item", { hasText: "Practise" })).toHaveClass(/is-next/);
  await page.locator(".lesson-step__sentinel").first().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "To make someone believe something is true." }).click();
  await page.waitForTimeout(300);
  expect(await progressPosts(page)).toEqual([]);
  // Teachers can still assign homework from the recap.
  await expect(page.locator("#lesson-homework .test-homework")).toBeVisible();
});

test("older plain-text feedback still shows, with no practice step", async ({ page }) => {
  await mount(page, {
    teacherFeedback: { messageToLearner: "Good work today.", commentsOnSession: "We covered opinions.", futureSteps: "Read one article." },
    state: { practiceItems: 0 },
  });
  await expect(page.locator(".lesson-legacy")).toContainText("Good work today.");
  await expect(page.locator(".lesson-legacy")).toContainText("We covered opinions.");
  await expect(page.locator("#lesson-practise")).toHaveCount(0);
  await expect(stepItem(page, "Practise")).toHaveCount(0);
});

test("Arabic learners get the recap in Arabic, with the lesson words untouched", async ({ page }) => {
  const errors = await mount(page, { props: { locale: "ar" } });
  await expect(page.getByRole("heading", { name: "حصتك خطوة بخطوة" })).toBeVisible();
  await expect(page.locator(".fb-report__row").nth(1)).toContainText("خطأ");
  await expect(page.locator(".fb-report__row").nth(1).locator(".fb-mark--wrong")).toHaveText(/am agree/);
  await expect(page.getByRole("heading", { name: "اختبار مراجعة قصير" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the recap fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page, { props: { withHomework: true }, state: { homework: ["ASSIGNED"] } });
  await expect(page.locator(".lesson-recap")).toBeVisible();
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll(".lesson-recap *")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > innerWidth + 1;
      })
      .map((element) => element.className)
      .slice(0, 5)
  );
  expect(overflow).toEqual([]);
});

test("learners opening the old feedback link land on the lesson page", async ({ page }) => {
  await mount(page, { harness: feedbackHarness, role: "learner" });
  await expect.poll(() => page.evaluate(() => window.feedbackTest.navigations)).toEqual(["/dashboard/sessions/s1#lesson"]);
  await expect(page.locator(".fb-editor")).toHaveCount(0);
});

for (const role of ["learner", "teacher"]) {
  test(`the recap links to the lesson's course unit (${role})`, async ({ page }) => {
    await page.route("http://feedback.test/api/curriculum/units", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          resources: { "r4-sheet": "unit-04", "r5-sheet": "unit-05" },
          units: {
            "unit-04": { _id: "unit-04", title: "Unit 4 · Confident Travel", order: 4 },
            "unit-05": { _id: "unit-05", title: "Unit 5 · Money in Real Life", order: 5 },
          },
        }),
      })
    );
    const errors = await mount(page, {
      role,
      props: { canTeach: role === "teacher" },
      state: {
        teacher: role === "teacher",
        materials: [
          { id: "r5-sheet", firstOpenedAt: "2026-11-26T12:40:00.000Z" },
          { id: "r4-sheet", firstOpenedAt: "2026-11-26T12:35:00.000Z" },
        ],
      },
    });
    const chip = page.locator(".lesson-unit-chip");
    await expect(chip).toHaveText("Unit 4 · Confident Travel");
    await expect(chip).toHaveAttribute("href", role === "teacher" ? "/dashboard/units/unit-04?learner=10" : "/dashboard/units/unit-04");
    expect(errors).toEqual([]);
  });
}

test("a lesson with no course materials shows no unit link", async ({ page }) => {
  await mount(page);
  await expect(page.locator(".lesson-recap__head")).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator(".lesson-unit-chip")).toHaveCount(0);
});

const layoutHarness = buildFeedbackHarness({ entry: "tests/feedback/support/sessionLayoutEntry.jsx" });

for (const role of ["learner", "teacher"]) {
  test(`the session page puts the recap first and homework inside it (${role})`, async ({ page }) => {
    const errors = await mount(page, { harness: layoutHarness, role, state: { teacher: role === "teacher", homework: ["ASSIGNED"] } });
    await expect(page.locator("#lesson")).toBeVisible();
    const order = await page.evaluate(() => [...document.querySelectorAll(".sd-main > *")].map((element) => element.id || "panel"));
    expect(order.indexOf("lesson")).toBe(role === "teacher" ? 1 : 0);
    await expect(page.locator("#lesson-homework .hw-session")).toBeVisible();
    // The old separate feedback box is gone once feedback exists.
    await expect(page.getByText("No teacher feedback yet")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
