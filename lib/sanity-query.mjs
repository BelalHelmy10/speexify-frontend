export const DEFAULT_SANITY_QUERY_TIMEOUT_MS = 8000;
export const SANITY_SLOW_QUERY_THRESHOLD_MS = 1000;

function createTimeoutError(queryName, timeoutMs) {
  const error = new Error(
    `Sanity query "${queryName}" timed out after ${timeoutMs}ms`
  );
  error.code = "SANITY_QUERY_TIMEOUT";
  return error;
}

function errorCode(error) {
  return error?.code || error?.name || "SANITY_QUERY_FAILED";
}

/**
 * Execute a Sanity query with one bounded deadline and an observable outcome.
 * The logger receives only safe metadata, never query contents or response data.
 */
export async function fetchSanityQuery(
  client,
  query,
  params = {},
  {
    queryName = "sanity.query",
    timeoutMs = DEFAULT_SANITY_QUERY_TIMEOUT_MS,
    validate,
    logger = () => {},
  } = {}
) {
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_SANITY_QUERY_TIMEOUT_MS;
  const startedAt = Date.now();
  const controller = new AbortController();
  let timer = null;
  let didTimeout = false;

  const record = (level, durationMs, error = null) => {
    try {
      logger({
        level,
        queryName,
        durationMs,
        ok: !error,
        ...(error
          ? {
              errorCode: errorCode(error),
              timedOut: error?.code === "SANITY_QUERY_TIMEOUT",
            }
          : {}),
      });
    } catch {
      // Observability must never change the request outcome.
    }
  };

  try {
    const request = client.fetch(query, params, {
      signal: controller.signal,
      tag: queryName,
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        didTimeout = true;
        controller.abort();
        reject(createTimeoutError(queryName, effectiveTimeoutMs));
      }, effectiveTimeoutMs);
    });

    const data = await Promise.race([request, timeout]);
    if (typeof validate === "function") validate(data);

    const durationMs = Date.now() - startedAt;
    record(
      durationMs >= SANITY_SLOW_QUERY_THRESHOLD_MS ? "warn" : "info",
      durationMs
    );
    return data;
  } catch (error) {
    const finalError = didTimeout
      ? createTimeoutError(queryName, effectiveTimeoutMs)
      : error;
    record("error", Date.now() - startedAt, finalError);
    throw finalError;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
