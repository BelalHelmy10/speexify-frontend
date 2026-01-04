// lib/geo.js

/**
 * Detect user's country code (ISO 3166-1 alpha-2)
 * Returns: 'EG', 'US', 'GB', etc. or null
 */
export async function detectUserCountry() {
  // Method 1: Client-side IP geolocation (most reliable)
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    if (data.country_code) {
      console.log("🌍 Country detected via IP:", data.country_code);
      return data.country_code; // e.g., 'EG', 'US', 'GB'
    }
  } catch (error) {
    console.log("⚠️ IP geolocation failed:", error.message);
  }

  // Method 2: Server-side geo (if you have /api/geo endpoint)
  try {
    const response = await fetch("/api/geo");
    const data = await response.json();

    if (data.country_code || data.country) {
      const code = data.country_code || data.country;
      console.log("🌍 Country detected via server:", code);
      return code;
    }
  } catch (error) {
    console.log("⚠️ Server geolocation failed:", error.message);
  }

  // Method 3: Timezone heuristic (helps for Egypt even if VPN is used)
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("🕒 Timezone detected:", timezone);

    // Common timezone mappings
    const timezoneMap = {
      "Africa/Cairo": "EG",
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Los_Angeles": "US",
      "Europe/London": "GB",
      "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA",
    };

    if (timezoneMap[timezone]) {
      console.log("🌍 Country guessed from timezone:", timezoneMap[timezone]);
      return timezoneMap[timezone];
    }
  } catch (error) {
    console.log("⚠️ Timezone detection failed:", error.message);
  }

  // Method 4: Browser language hint (least reliable)
  try {
    const lang = navigator.language || navigator.userLanguage;
    console.log("🗣️ Browser language:", lang);

    // Very rough guesses
    if (lang.startsWith("ar-EG") || lang.startsWith("ar_EG")) return "EG";
    if (lang.startsWith("en-US")) return "US";
    if (lang.startsWith("en-GB")) return "GB";
  } catch (error) {
    console.log("⚠️ Language detection failed:", error.message);
  }

  // No detection worked
  console.log("❌ Could not detect country - using DEFAULT pricing");
  return null;
}

/**
 * Get both country code AND currency in one call
 * This combines country detection with currency info
 */
export async function detectUserRegion() {
  const countryCode = await detectUserCountry();

  // Also try to get currency directly
  let currency = null;

  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    currency = data.currency;
  } catch {}

  return {
    countryCode,
    currency,
  };
}
