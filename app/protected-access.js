import { redirect } from "next/navigation";
import { getServerApiJson, getServerUser } from "./server-auth";

function localizedPath(locale, path) {
  if (locale === "ar") {
    if (path === "/") return "/ar";
    if (path.startsWith("/ar")) return path;
    return `/ar${path}`;
  }
  return path.replace(/^\/ar(?=\/|$)/, "") || "/";
}

function loginRedirect(locale, nextPath) {
  const loginPath = localizedPath(locale, "/login");
  redirect(`${loginPath}?next=${encodeURIComponent(nextPath || "/dashboard")}`);
}

function dashboardRedirect(locale) {
  redirect(localizedPath(locale, "/dashboard"));
}

function packagesRedirect(locale) {
  redirect(localizedPath(locale, "/packages"));
}

function isActiveLearnerPackage(item) {
  if (!item || item.status !== "active") return false;
  if (item.expired) return false;
  return Number(item.remaining ?? 0) > 0;
}

export async function requireResourceAccess({
  locale = "en",
  nextPath = "/resources",
} = {}) {
  const user = await getServerUser();
  if (!user) loginRedirect(locale, nextPath);

  const role = String(user.role || "").toLowerCase();

  if (role === "admin" || role === "teacher") {
    return {
      user,
      access: {
        role,
        level: "staff",
        canUsePrep: true,
        canOpenOriginal: true,
      },
    };
  }

  if (role !== "learner") {
    dashboardRedirect(locale);
  }

  const packages = await getServerApiJson("me/packages");
  if (!packages.ok) {
    dashboardRedirect(locale);
  }

  const hasActivePackage = Array.isArray(packages.data)
    ? packages.data.some(isActiveLearnerPackage)
    : false;

  if (!hasActivePackage) {
    packagesRedirect(locale);
  }

  return {
    user,
    access: {
      role,
      level: "learner",
      canUsePrep: false,
      canOpenOriginal: true,
    },
  };
}

export async function requireClassroomPageAccess({
  sessionId,
  locale = "en",
  nextPath = "/dashboard",
} = {}) {
  const result = await getServerApiJson(`sessions/${encodeURIComponent(sessionId)}`);

  if (result.status === 401 || result.status === 403) {
    if (result.status === 401) loginRedirect(locale, nextPath);
    dashboardRedirect(locale);
  }

  if (result.status === 404) {
    return null;
  }

  if (!result.ok) {
    throw new Error(result.data?.error || "Failed to authorize classroom access");
  }

  return result.data?.session || null;
}
