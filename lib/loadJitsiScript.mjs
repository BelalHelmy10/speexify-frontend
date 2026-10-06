let pendingLoad = null;

// Share an in-flight load, but let Retry replace a failed/timed-out script.
export function loadJitsiScript(domain, timeoutMs = 15000) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (pendingLoad) return pendingLoad;

  pendingLoad = new Promise((resolve, reject) => {
    const existing = document.getElementById("jitsi-external-api");
    const script = existing || document.createElement("script");
    const finish = (error) => {
      window.clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    };
    const onLoad = () => finish(window.JitsiMeetExternalAPI
      ? null : new Error("The call script did not initialize"));
    const onError = () => finish(new Error("The call script could not load"));
    const timer = window.setTimeout(() => finish(new Error("The call script timed out")), timeoutMs);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) {
      script.id = "jitsi-external-api";
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      document.body.appendChild(script);
    }
  }).finally(() => { pendingLoad = null; });
  return pendingLoad;
}
