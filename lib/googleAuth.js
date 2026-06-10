const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function getGoogleClientId() {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
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

  if (isLocalhost) return isLocalGoogleAuthAllowed();
  return true;
}
