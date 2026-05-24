// lib/pricing-regions.js

// Regional pricing configuration.
//
// Pricing model:
//   - Every package has a base EGP price stored on the backend (currently in
//     a field called `priceUSD`; the value is in EGP — see payment-contract.js).
//   - For each country we apply a `multiplier` to that EGP price to get the
//     price shown in the user's local currency.
//   - Paymob only processes EGP, so when we create a payment intent the
//     backend MUST charge the EGP equivalent (not the multiplied local
//     amount). See payment-contract.js for the full data flow.

export const PRICING_REGIONS = {
  // Egypt — base pricing (1.0 multiplier means the EGP value is used as-is)
  EG: {
    currency: "EGP",
    multiplier: 1,
    name: "Egypt",
  },

  // ⚠️ MULTIPLIERS BELOW NEED BUSINESS REVIEW.
  // The Gulf multipliers in particular (AE, SA at 0.25) make those countries
  // pay only ~25% of the Egypt price in local currency, which is almost
  // certainly not intentional. Set these from your PPP analysis.

  US: {
    currency: "USD",
    multiplier: 0.375, // Egypt price × 0.375 = USD price
    name: "United States",
  },

  GB: {
    currency: "GBP",
    multiplier: 0.25, // Egypt price × 0.25 = GBP price
    name: "United Kingdom",
  },

  AE: {
    currency: "AED",
    multiplier: 0.25, // ⚠️ likely too low — review
    name: "United Arab Emirates",
  },

  SA: {
    currency: "SAR",
    multiplier: 0.25, // ⚠️ likely too low — review
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
