// lib/geo.js
import { getNetworkProfile } from "./network-profile";

const COUNTRY_CACHE_KEY = "speexify:geo:country:v1";
const COUNTRY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const REGION_CACHE_KEY = "speexify:geo:region:v1";
const REGION_CACHE_TTL_MS = 60 * 60 * 1000;

function debugLog(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
}

function normalizeCountryCode(raw) {
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function readCachedJson(cacheKey, ttlMs) {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const ts = Number(parsed.ts || 0);
    if (!Number.isFinite(ts) || Date.now() - ts > ttlMs) return null;
    return parsed.value || null;
  } catch {
    return null;
  }
}

function writeCachedJson(cacheKey, value) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        value,
        ts: Date.now(),
      })
    );
  } catch {
    // ignore cache write failures
  }
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function detectFromTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneMap = {
      "Africa/Cairo": "EG",
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Los_Angeles": "US",
      "Europe/London": "GB",
      "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA",
    };
    return timezoneMap[timezone] || null;
  } catch {
    return null;
  }
}

function detectFromLanguage() {
  try {
    const lang = String(navigator.language || navigator.userLanguage || "");
    if (lang.startsWith("ar-EG") || lang.startsWith("ar_EG")) return "EG";
    if (lang.startsWith("en-US")) return "US";
    if (lang.startsWith("en-GB")) return "GB";
    return null;
  } catch {
    return null;
  }
}

function currencyFromCountry(countryCode) {
  const currencyMap = {
    EG: "EGP",
    US: "USD",
    GB: "GBP",
    AE: "AED",
    SA: "SAR",
  };
  return currencyMap[countryCode] || null;
}

/**
 * Detect user's country code (ISO 3166-1 alpha-2)
 * Returns: 'EG', 'US', 'GB', etc. or null
 */
export async function detectUserCountry({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cachedCode = normalizeCountryCode(
      readCachedJson(COUNTRY_CACHE_KEY, COUNTRY_CACHE_TTL_MS)
    );
    if (cachedCode) return cachedCode;
  }

  const profile = getNetworkProfile();
  const timeoutMs = profile.isLowBandwidth ? 1800 : 3000;

  // 1) Same-origin endpoint first (more reliable under restrictive networks).
  try {
    const serverData = await fetchJsonWithTimeout("/api/geo", timeoutMs);
    const serverCode = normalizeCountryCode(
      serverData?.country_code || serverData?.country
    );
    if (serverCode) {
      writeCachedJson(COUNTRY_CACHE_KEY, serverCode);
      return serverCode;
    }
  } catch (error) {
    debugLog("⚠️ /api/geo failed:", error?.message || error);
  }

  // 2) On low bandwidth/save-data, skip external calls and use heuristics.
  if (profile.isLowBandwidth) {
    const tzCode = normalizeCountryCode(detectFromTimezone());
    if (tzCode) {
      writeCachedJson(COUNTRY_CACHE_KEY, tzCode);
      return tzCode;
    }

    const langCode = normalizeCountryCode(detectFromLanguage());
    if (langCode) {
      writeCachedJson(COUNTRY_CACHE_KEY, langCode);
      return langCode;
    }

    return null;
  }

  // 3) External geolocation fallback.
  try {
    const ipData = await fetchJsonWithTimeout("https://ipapi.co/json/", timeoutMs);
    const ipCode = normalizeCountryCode(ipData?.country_code || ipData?.country);
    if (ipCode) {
      writeCachedJson(COUNTRY_CACHE_KEY, ipCode);
      return ipCode;
    }
  } catch (error) {
    debugLog("⚠️ ipapi geolocation failed:", error?.message || error);
  }

  // 4) Heuristics as final fallback.
  const tzCode = normalizeCountryCode(detectFromTimezone());
  if (tzCode) {
    writeCachedJson(COUNTRY_CACHE_KEY, tzCode);
    return tzCode;
  }

  const langCode = normalizeCountryCode(detectFromLanguage());
  if (langCode) {
    writeCachedJson(COUNTRY_CACHE_KEY, langCode);
    return langCode;
  }

  return null;
}

/**
 * Get both country code and currency in one call.
 */
export async function detectUserRegion({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cachedRegion = readCachedJson(REGION_CACHE_KEY, REGION_CACHE_TTL_MS);
    if (cachedRegion?.countryCode || cachedRegion?.currency) {
      return {
        countryCode: normalizeCountryCode(cachedRegion.countryCode),
        currency: cachedRegion.currency || null,
      };
    }
  }

  const profile = getNetworkProfile();
  const timeoutMs = profile.isLowBandwidth ? 1800 : 3000;

  try {
    const serverData = await fetchJsonWithTimeout("/api/geo", timeoutMs);
    const countryCode = normalizeCountryCode(
      serverData?.country_code || serverData?.country
    );
    const currency = String(serverData?.currency || "").trim().toUpperCase() || null;

    const result = {
      countryCode,
      currency: currency || currencyFromCountry(countryCode),
    };

    writeCachedJson(REGION_CACHE_KEY, result);
    if (countryCode) writeCachedJson(COUNTRY_CACHE_KEY, countryCode);
    return result;
  } catch (error) {
    debugLog("⚠️ region detection via /api/geo failed:", error?.message || error);
  }

  const countryCode = await detectUserCountry({ forceRefresh });
  const result = {
    countryCode,
    currency: currencyFromCountry(countryCode),
  };

  writeCachedJson(REGION_CACHE_KEY, result);
  return result;
}
