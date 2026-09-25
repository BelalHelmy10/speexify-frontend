const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function getGoogleClientId() {
  const primary = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const local = (process.env.NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID || "").trim();

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost =
      LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
    if (isLocalhost && local) return local;
  }

  return primary;
}

export function isGoogleAuthDisabled() {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_DISABLED === "true";
}

export function isLocalGoogleAuthAllowed() {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST === "true";
}

export function canUseGoogleAuthOnCurrentOrigin() {
  if (!getGoogleClientId() || isGoogleAuthDisabled()) return false;
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  const isLocalhost =
    LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");

  if (isLocalhost) {
    // Local development may use the primary OAuth client when the developer
    // explicitly opts localhost in. A separate local client remains supported
    // through NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID when one is configured.
    return isLocalGoogleAuthAllowed() && Boolean(getGoogleClientId());
  }
  return true;
}

/** Convert provider/network/backend failures into stable localized UI keys. */
export function getGoogleAuthErrorKey(error) {
  const status = Number(error?.response?.status);
  const code = String(error?.response?.data?.code || error?.code || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();

  if (
    status >= 500 ||
    code.includes("timeout") ||
    code.includes("network") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("took too long to respond") ||
    message.includes("server could not complete")
  ) return "googleUnavailable";

  if (
    code.includes("credential") ||
    message.includes("credential") ||
    message.includes("popup_closed")
  ) return "googleNoCredential";

  if (code.includes("not_configured") || code.includes("disabled")) {
    return "googleNotConfigured";
  }

  return "googleFailed";
}
