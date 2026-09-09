// lib/pricing-regions.js

// Currency metadata used for labels and legacy links. The backend owns all
// package prices, regional offers, discounts, FX conversion and Paymob charge
// amounts. Keep this map free of offer calculations.

export const PRICING_REGIONS = {
  // Egypt — base pricing (1.0 multiplier means the EGP value is used as-is)
  EG: {
    currency: "EGP",
    multiplier: 1,
    name: "Egypt",
  },

  US: {
    currency: "USD",
    multiplier: 0.375,
    name: "United States",
  },

  GB: {
    currency: "GBP",
    multiplier: 0.25,
    name: "United Kingdom",
  },

  AE: {
    currency: "AED",
    multiplier: 0.25,
    name: "United Arab Emirates",
  },

  SA: {
    currency: "SAR",
    multiplier: 0.25,
    name: "Saudi Arabia",
  },

  // Fallback for any country we don't have an explicit entry for.
  DEFAULT: {
    currency: "USD",
    multiplier: 0.25,
    name: "International",
  },
};

export function getPricingRegion(countryCode) {
  if (!countryCode) return PRICING_REGIONS.DEFAULT;
  const region = PRICING_REGIONS[String(countryCode).toUpperCase()];
  return region || PRICING_REGIONS.DEFAULT;
}

// Runtime sanity check. Throws in development if a region entry is malformed
// (missing currency, non-numeric multiplier). Call from app bootstrap if you
// want hard guarantees.
export function assertPricingRegionsValid() {
  for (const [code, region] of Object.entries(PRICING_REGIONS)) {
    if (!region || typeof region !== "object") {
      throw new Error(`PRICING_REGIONS[${code}] is not an object`);
    }
    if (typeof region.currency !== "string" || region.currency.length !== 3) {
      throw new Error(`PRICING_REGIONS[${code}].currency must be a 3-letter ISO code`);
    }
    if (typeof region.multiplier !== "number" || !Number.isFinite(region.multiplier) || region.multiplier <= 0) {
      throw new Error(`PRICING_REGIONS[${code}].multiplier must be a positive number`);
    }
  }
  return true;
}
