const JITSI_SCRIPT_ID = "jitsi-external-api";
const JITSI_LOADER_ATTRIBUTE = "speexifyJitsiLoader";
const JITSI_LOADER_KEY = Symbol.for("speexify.jitsi.external-api-loader");

function getJitsiScriptUrl(domain) {
  const value = String(domain || "").trim();
  if (!value) throw new Error("A Jitsi domain is required");

  let origin;
  try {
    // JITSI_DOMAIN is a host (optionally including a port), not an arbitrary
    // script URL. Keeping URL construction here prevents the preload and the
    // call component from ever resolving different resources.
    const url = new URL(`https://${value}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("invalid Jitsi domain");
    }
    origin = url.origin;
  } catch {
    throw new Error(`Invalid Jitsi domain: ${value}`);
  }

  return `${origin}/external_api.js`;
}

function getLoaderState(targetWindow) {
  if (!targetWindow[JITSI_LOADER_KEY]) {
    targetWindow[JITSI_LOADER_KEY] = {
      generation: 0,
      promise: null,
      script: null,
      src: null,
    };
  }
  return targetWindow[JITSI_LOADER_KEY];
}

function scriptSource(script) {
  try {
    return new URL(script.src, document.baseURI).href;
  } catch {
    return script.src || "";
  }
}

function externalApiScripts() {
  return Array.from(document.scripts || document.querySelectorAll("script[src]"))
    .filter((script) => {
      try {
        return new URL(script.src, document.baseURI).pathname.endsWith("/external_api.js");
      } catch {
        return false;
      }
    });
}

function markManaged(script, state) {
  script.id = JITSI_SCRIPT_ID;
  script.dataset[JITSI_LOADER_ATTRIBUTE] = "true";
  script.dataset.speexifyJitsiState = state;
}

/**
 * Load Jitsi's external API exactly once for this browser document.
 *
 * The registry lives on `window`, rather than only in this module, so HMR,
 * duplicated chunks, route preloading, and the call component all share the
 * same in-flight promise. A failed generation is removed and can be retried.
 */
export function loadJitsiScript(domain, timeoutMs = 15000) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("The Jitsi call script can only load in a browser"));
  }

  let expectedSrc;
  try {
    expectedSrc = getJitsiScriptUrl(domain);
  } catch (error) {
    return Promise.reject(error);
  }

  if (typeof window.JitsiMeetExternalAPI === "function") return Promise.resolve();

  const state = getLoaderState(window);
  if (state.promise) {
    if (state.src !== expectedSrc) {
      return Promise.reject(new Error(
        `Jitsi is already loading from ${state.src}; refusing a second loader for ${expectedSrc}`
      ));
    }
    return state.promise;
  }

  const candidates = externalApiScripts();
  const matching = candidates.filter((script) => scriptSource(script) === expectedSrc);
  const conflicting = candidates.filter((script) => scriptSource(script) !== expectedSrc);

  if (conflicting.length) {
    return Promise.reject(new Error(
      `A different Jitsi call script is already present (${scriptSource(conflicting[0])})`
    ));
  }

  // A previously successful tag without its global indicates that another
  // actor removed/overwrote the API. Its load event cannot fire again, so it
  // must not be adopted as an in-flight request.
  const reusable = matching.filter((candidate) => {
    const stale = ["failed", "loaded"].includes(candidate.dataset.speexifyJitsiState);
    if (stale) candidate.remove();
    return !stale;
  });
  const script = reusable[0] || document.createElement("script");
  // Converge legacy/Next-injected copies on one DOM owner. Matching scripts
  // execute equivalent code, so retaining only the first avoids future event
  // ambiguity without introducing a second request.
  for (const duplicate of reusable.slice(1)) duplicate.remove();

  const generation = state.generation + 1;
  state.generation = generation;
  state.script = script;
  state.src = expectedSrc;
  markManaged(script, "loading");

  state.promise = new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);

      if (error) {
        markManaged(script, "failed");
        script.remove();
        reject(error);
        return;
      }

      markManaged(script, "loaded");
      resolve();
    };
    const onLoad = () => finish(
      typeof window.JitsiMeetExternalAPI === "function"
        ? null
        : new Error("The call script loaded without initializing JitsiMeetExternalAPI")
    );
    const onError = () => finish(new Error("The call script could not load"));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    timer = window.setTimeout(
      () => finish(new Error(`The call script timed out after ${timeoutMs}ms`)),
      timeoutMs
    );

    if (!reusable.length) {
      script.src = expectedSrc;
      script.async = true;
      document.head.appendChild(script);
    }
  }).finally(() => {
    // A late event from an abandoned generation must never clear the state of
    // a newer retry.
    if (state.generation === generation) {
      state.promise = null;
      state.script = null;
      state.src = null;
    }
  });

  return state.promise;
}

export { JITSI_SCRIPT_ID, getJitsiScriptUrl };
