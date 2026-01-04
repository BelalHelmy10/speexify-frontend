// lib/pricing-regions.js

/**
 * Regional pricing configuration
 * - Each region has a currency and multiplier
 * - Multiplier is applied to base EGP price
 * - For Paymob payments, we'll convert everything back to EGP
 */

export const PRICING_REGIONS = {
  // Egypt - Base pricing (1.0 multiplier)
  EG: {
    currency: "EGP",
    multiplier: 1,
    name: "Egypt",
  },

  // United States - Lower purchasing power parity
  US: {
    currency: "USD",
    multiplier: 0.125, // 40% of EGP price (adjust this!)
    name: "United States",
  },

  // United Kingdom
  GB: {
    currency: "GBP",
    multiplier: 0.125, // 35% of EGP price (adjust this!)
    name: "United Kingdom",
  },

  // UAE
  AE: {
    currency: "AED",
    multiplier: 0.125, // 70% of EGP price (adjust this!)
    name: "United Arab Emirates",
  },

  // Saudi Arabia
  SA: {
    currency: "SAR",
    multiplier: 0.125, // 70% of EGP price (adjust this!)
    name: "Saudi Arabia",
  },

  // Default for any other country
  DEFAULT: {
    currency: "USD",
    multiplier: 0.125, // 50% of EGP price (adjust this!)
    name: "International",
  },
};

/**
 * Get pricing config for a country code
 */
export function getPricingRegion(countryCode) {
  if (!countryCode) return PRICING_REGIONS.DEFAULT;

  const region = PRICING_REGIONS[countryCode.toUpperCase()];
  return region || PRICING_REGIONS.DEFAULT;
}
