// Connection (ICE) servers for classroom screen sharing, fetched from the
// backend. A successful answer is reused until the server says to refresh
// (TURN passwords expire); a failed fetch is never remembered, so the next
// connection attempt asks again instead of staying on the fallback.

export const DEFAULT_ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
const DEFAULT_REFRESH_MS = 30 * 60 * 1000;

export function createIceServerCache({ load, now = () => Date.now(), fallback = DEFAULT_ICE_SERVERS } = {}) {
  let cached = null; // { servers, expiresAt }
  let inflight = null;

  async function fetchFresh() {
    const data = await load();
    if (!Array.isArray(data?.iceServers)) throw new Error("No ICE servers in response");
    const refreshMs = Number(data.refreshAfterSeconds) > 0 ? Number(data.refreshAfterSeconds) * 1000 : DEFAULT_REFRESH_MS;
    cached = { servers: data.iceServers, expiresAt: now() + refreshMs };
    return cached.servers;
  }

  return {
    async get() {
      if (cached && now() < cached.expiresAt) return cached.servers;
      if (!inflight) {
        inflight = fetchFresh().finally(() => {
          inflight = null;
        });
      }
      try {
        return await inflight;
      } catch {
        // Keep working on what we last had, but ask again next time.
        return cached?.servers || fallback;
      }
    },
  };
}
