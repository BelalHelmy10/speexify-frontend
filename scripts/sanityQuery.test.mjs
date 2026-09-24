import assert from "node:assert/strict";
import test from "node:test";
import { fetchSanityQuery } from "../lib/sanity-query.mjs";

test("Sanity queries abort and reject at the configured deadline", async () => {
  let aborted = false;
  const client = {
    fetch(_query, _params, { signal }) {
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        });
      });
    },
  };
  const metrics = [];

  await assert.rejects(
    fetchSanityQuery(client, "*[]", {}, {
      queryName: "resources.picker",
      timeoutMs: 10,
      logger: (metric) => metrics.push(metric),
    }),
    (error) => error.code === "SANITY_QUERY_TIMEOUT"
  );

  assert.equal(aborted, true);
  assert.equal(metrics.at(-1).ok, false);
  assert.equal(metrics.at(-1).timedOut, true);
});

test("Sanity query metrics include latency and validation failures", async () => {
  const metrics = [];
  const client = {
    fetch() {
      return Promise.resolve({ invalid: true });
    },
  };

  await assert.rejects(
    fetchSanityQuery(client, "*[]", {}, {
      queryName: "resources.picker",
      validate: (data) => {
        if (!Array.isArray(data)) {
          const error = new Error("Invalid resource tree");
          error.code = "SANITY_INVALID_PAYLOAD";
          throw error;
        }
      },
      logger: (metric) => metrics.push(metric),
    }),
    (error) => error.code === "SANITY_INVALID_PAYLOAD"
  );

  assert.equal(metrics.at(-1).queryName, "resources.picker");
  assert.equal(metrics.at(-1).errorCode, "SANITY_INVALID_PAYLOAD");
});
