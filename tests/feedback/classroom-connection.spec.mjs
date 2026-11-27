// The classroom's live connection notices when it has died without closing
// (a network change, a laptop waking up) and reconnects by itself. A fake
// server stands in for the backend so the test controls what it answers.
import { test, expect } from "@playwright/test";
import { buildFeedbackHarness } from "./support/buildFeedbackHarness.mjs";

const harness = buildFeedbackHarness({ entry: "tests/feedback/support/channelEntry.jsx" });

async function mount(page, { answersPings = true } = {}) {
  const server = { sockets: [], answersPings, silent: false };
  await page.route("http://feedback.test/**", (route) => {
    if (route.request().url().endsWith("/ws-config")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ classroomWsUrl: "ws://feedback.test/ws/classroom" }) });
    }
    return route.fulfill({ contentType: "text/html", body: '<!doctype html><html><body><div id="root"></div></body></html>' });
  });
  await page.routeWebSocket(/\/ws\/classroom/, (ws) => {
    const socket = { ws, silent: false };
    server.sockets.push(socket);
    ws.onMessage((raw) => {
      if (socket.silent || server.silent) return;
      const msg = JSON.parse(String(raw));
      if (msg.type === "join") ws.send(JSON.stringify({ type: "joined", roomId: msg.roomId }));
      if (msg.type === "ping" && server.answersPings) ws.send(JSON.stringify({ type: "pong", ts: msg.ts }));
    });
  });
  await page.addInitScript(() => {
    window.feedbackTest = {
      role: "learner",
      props: {},
      posts: [],
      toasts: [],
      navigations: [],
      session: {},
      handle(method, url) {
        if (url === "/auth/ws-token") return { token: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString() };
        return undefined;
      },
    };
  });
  await page.goto("http://feedback.test/");
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator(".probe")).toHaveAttribute("data-ready", "true");
  return server;
}

// What happens when the network drops without the socket closing: the old
// socket stays open but nothing comes back through it.
function goQuiet(server) {
  server.sockets.forEach((socket) => {
    socket.silent = true;
  });
}

test("a connection that goes quiet is replaced by a new one", async ({ page }) => {
  test.setTimeout(60000);
  const server = await mount(page);
  goQuiet(server);
  await expect.poll(() => server.sockets.length, { timeout: 40000 }).toBe(2);
  await expect(page.locator(".probe")).toHaveAttribute("data-ready", "true");
});

test("coming back online checks the connection straight away", async ({ page }) => {
  const server = await mount(page);
  await page.waitForTimeout(500);
  goQuiet(server);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  // The probe waits 5 seconds for an answer, then reconnects (about 1 s).
  await expect.poll(() => server.sockets.length, { timeout: 12000 }).toBe(2);
  await expect(page.locator(".probe")).toHaveAttribute("data-ready", "true");
});

test("a healthy connection is left alone", async ({ page }) => {
  test.setTimeout(60000);
  const server = await mount(page);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(30000);
  expect(server.sockets.length).toBe(1);
  await expect(page.locator(".probe")).toHaveAttribute("data-ready", "true");
});

test("an older server that never answers pings does not cause reconnects", async ({ page }) => {
  test.setTimeout(60000);
  const server = await mount(page, { answersPings: false });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(30000);
  expect(server.sockets.length).toBe(1);
});
