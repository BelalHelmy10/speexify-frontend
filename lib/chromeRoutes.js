export function normalizeLocalizedPath(pathname) {
  return (pathname || "/").replace(/^\/ar(?=\/|$)/, "") || "/";
}

export function isFocusedWorkspacePath(pathname) {
  const normalized = normalizeLocalizedPath(pathname);
  return (
    normalized === "/resources/prep" ||
    normalized.startsWith("/resources/prep/") ||
    normalized === "/classroom" ||
    normalized.startsWith("/classroom/")
  );
}
