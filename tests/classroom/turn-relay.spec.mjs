import { test, expect } from "@playwright/test";

const turnConfig = {
  urls: process.env.TURN_URL || "",
  username: process.env.TURN_USERNAME || "",
  credential: process.env.TURN_CREDENTIAL || "",
};
const hasTurnConfiguration = Boolean(
  turnConfig.urls && turnConfig.username && turnConfig.credential
);

test("TURN-only peers establish a relay candidate pair", async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata?.deviceClass !== "desktop", "TURN is verified once per browser engine");
  if (!hasTurnConfiguration) {
    if (process.env.REQUIRE_TURN === "1") {
      throw new Error("TURN_URL, TURN_USERNAME, and TURN_CREDENTIAL are required");
    }
    test.skip(true, "TURN credentials are not configured in this environment");
  }

  const result = await page.evaluate(async (iceServer) => {
    const first = new RTCPeerConnection({
      iceServers: [iceServer],
      iceTransportPolicy: "relay",
    });
    const second = new RTCPeerConnection({
      iceServers: [iceServer],
      iceTransportPolicy: "relay",
    });
    const waitForIceGathering = (peer) => {
      if (peer.iceGatheringState === "complete") return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("TURN candidate gathering timed out")), 15_000);
        const handleState = () => {
          if (peer.iceGatheringState !== "complete") return;
          clearTimeout(timeout);
          peer.removeEventListener("icegatheringstatechange", handleState);
          resolve();
        };
        peer.addEventListener("icegatheringstatechange", handleState);
      });
    };

    const channel = first.createDataChannel("turn-health");
    const received = new Promise((resolve) => {
      second.ondatachannel = (event) => {
        event.channel.onmessage = (message) => resolve(message.data);
      };
    });

    await first.setLocalDescription(await first.createOffer());
    await waitForIceGathering(first);
    await second.setRemoteDescription(first.localDescription);
    await second.setLocalDescription(await second.createAnswer());
    await waitForIceGathering(second);
    await first.setRemoteDescription(second.localDescription);

    const candidates = [first.localDescription?.sdp, second.localDescription?.sdp]
      .flatMap((sdp) => (sdp || "").split("\n"))
      .filter((line) => line.startsWith("a=candidate:"));

    await Promise.race([
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("TURN connection timed out")), 20_000);
        const inspect = () => {
          const states = [first.connectionState, second.connectionState];
          if (states.every((state) => ["connected", "completed"].includes(state))) {
            clearTimeout(timeout);
            resolve();
          } else if (states.some((state) => ["failed", "closed"].includes(state))) {
            clearTimeout(timeout);
            reject(new Error(`TURN connection failed: ${states.join(", ")}`));
          }
        };
        first.onconnectionstatechange = inspect;
        second.onconnectionstatechange = inspect;
        inspect();
      }),
      new Promise((_resolve, reject) => setTimeout(
        () => reject(new Error("TURN negotiation exceeded 25 seconds")),
        25_000
      )),
    ]);

    await new Promise((resolve, reject) => {
      if (channel.readyState === "open") return resolve();
      const timeout = setTimeout(() => reject(new Error("TURN data channel did not open")), 5_000);
      channel.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
    channel.send("relay-ok");
    const message = await Promise.race([
      received,
      new Promise((_resolve, reject) => setTimeout(
        () => reject(new Error("TURN data was not delivered")),
        5_000
      )),
    ]);

    const stats = await first.getStats();
    const selectedPairs = [];
    const candidateTypes = new Map();
    const selectedPairIds = new Set();
    for (const report of stats.values()) {
      if (report.type === "local-candidate" || report.type === "remote-candidate") {
        candidateTypes.set(report.id, report.candidateType);
      }
      if (report.type === "transport" && report.selectedCandidatePairId) {
        selectedPairIds.add(report.selectedCandidatePairId);
      }
    }
    for (const report of stats.values()) {
      if (report.type !== "candidate-pair" || report.state !== "succeeded") continue;
      if (!(report.nominated || report.selected || selectedPairIds.has(report.id))) continue;
      selectedPairs.push({
        local: candidateTypes.get(report.localCandidateId),
        remote: candidateTypes.get(report.remoteCandidateId),
      });
    }

    first.close();
    second.close();
    return { candidates, selectedPairs, message };
  }, turnConfig);

  expect(result.message).toBe("relay-ok");
  expect(result.candidates.length).toBeGreaterThan(0);
  expect(result.candidates.every((candidate) => /\btyp relay\b/.test(candidate))).toBe(true);
  expect(result.selectedPairs.length).toBeGreaterThan(0);
  expect(result.selectedPairs.every(
    (pair) => pair.local === "relay" && pair.remote === "relay"
  )).toBe(true);
});
