// Notices when the classroom socket has died without closing (a network
// change, a router hiccup, a laptop waking up). Browsers can keep such a
// socket "open" for minutes while nothing arrives, so the page would show
// "connected" while chat and lesson updates silently stop.
//
// The page pings the server; the server answers "pong". Anything heard from
// the server counts as alive. If nothing is heard for `timeoutMs`, or a
// `probe()` (sent when the network returns or the tab wakes) goes
// unanswered for `probeTimeoutMs`, `onStale` fires once.
//
// The deadline only applies once the server has answered a ping at least
// once, so an older server that never answers does not cause reconnects.

export const LIVENESS_INTERVAL_MS = 8000;
export const LIVENESS_TIMEOUT_MS = 20000;
export const LIVENESS_PROBE_TIMEOUT_MS = 5000;

export function createSocketLiveness({
  sendPing,
  onStale,
  intervalMs = LIVENESS_INTERVAL_MS,
  timeoutMs = LIVENESS_TIMEOUT_MS,
  probeTimeoutMs = LIVENESS_PROBE_TIMEOUT_MS,
  clock = globalThis,
  now = () => Date.now(),
} = {}) {
  let running = false;
  let answersPings = false;
  let lastHeardAt = 0;
  let intervalId = null;
  let probeId = null;

  const stale = (reason) => {
    if (!running) return;
    stop();
    onStale?.(reason);
  };

  const ping = () => {
    try {
      sendPing?.();
    } catch {
      // A failing send means the socket is going away; onclose handles it.
    }
  };

  const tick = () => {
    if (!running) return;
    if (answersPings && now() - lastHeardAt > timeoutMs) {
      stale("heartbeat_timeout");
      return;
    }
    ping();
  };

  function start() {
    stop();
    running = true;
    answersPings = false;
    lastHeardAt = now();
    ping();
    intervalId = clock.setInterval(tick, intervalMs);
  }

  function stop() {
    running = false;
    if (intervalId !== null) clock.clearInterval(intervalId);
    if (probeId !== null) clock.clearTimeout(probeId);
    intervalId = null;
    probeId = null;
  }

  // Call for every message received from the server.
  function heard(type) {
    lastHeardAt = now();
    if (type === "pong") answersPings = true;
  }

  // Check right away, e.g. when the browser says it is back online.
  function probe() {
    if (!running) return;
    const sentAt = now();
    ping();
    if (probeId !== null) clock.clearTimeout(probeId);
    probeId = clock.setTimeout(() => {
      probeId = null;
      if (answersPings && lastHeardAt < sentAt) stale("probe_timeout");
    }, probeTimeoutMs);
  }

  return {
    start,
    stop,
    heard,
    probe,
    get running() {
      return running;
    },
  };
}
