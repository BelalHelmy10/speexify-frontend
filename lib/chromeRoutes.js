export function normalizeLocalizedPath(pathname) {
  return (pathname || "/").replace(/^\/ar(?=\/|$)/, "") || "/";
}

export function isFocusedWorkspacePath(pathname) {
  return normalizeLocalizedPath(pathname) === "/resources/prep";
}
