// lib/payment-contract.js
//
// This file is the single source of truth for the contract between the
// checkout page and the backend payment service. It is referenced by both
// the frontend pricing logic (lib/regional-pricing.js) and the checkout
// page (app/checkout/page.js). The backend MUST honor this contract.
//
// =======================================================================
//   PRICING DATA MODEL
// =======================================================================
//
// Every package has a single canonical price stored in EGP. On the
// backend this column is currently named `priceUSD` for historical
// reasons; the value is in EGP. A future migration should rename it to
// `priceEGP`. The frontend reads either name (priceEGP wins if present)
// and treats both as EGP values.
//
// All per-country prices are derived by multiplying the EGP price by the
// per-country `multiplier` from lib/pricing-regions.js. The result is
// what the user sees in their local currency.
//
// Paymob only processes EGP. The backend MUST always charge the EGP
// equivalent — never a client-converted local-currency amount.
//
// =======================================================================
//   REQUEST: POST /payments/create-intent
// =======================================================================
//
// Body sent by the checkout page:
//   {
//     orderId:       string   // stable, idempotent per (user, package, attempt)
//     packageId:     number   // backend package id
//     countryCode:   string   // ISO-3166-1 alpha-2, never null (defaults to "EG")
//     discountCode:  string | null
//
//     // Price preview from the frontend. Sent so the backend can verify
//     // the user is seeing what the backend will charge. If the backend
//     // computes a different EGP amount, it MUST reject the request with
//     // PRICE_MISMATCH rather than silently charge a different amount.
//     priceVerification: {
//       displayAmount:   number  // amount user saw, in displayCurrency
//       displayCurrency: string  // 3-letter ISO
//       egpAmount:       number  // what we expect to be charged in EGP
//     }
//
//     customer: { firstName, lastName, email, phone }
//   }
//
// =======================================================================
//   RESPONSE: POST /payments/create-intent
// =======================================================================
//
// {
//   ok:               true,
//   iframeUrl:        string,  // Paymob checkout URL
//   chargeAmountEGP:  number,  // EXACT EGP amount that will be charged
//   chargeCurrency:   "EGP",
//   orderId:          string,  // echoes the request orderId
// }
//
// On price mismatch (frontend's egpAmount disagrees with backend
// computation by more than 1 EGP):
// {
//   ok:    false,
//   code:  "PRICE_MISMATCH",
//   expectedEgpAmount: number,  // what backend would charge
//   message: string,
// }
//
// On other failures:
// {
//   ok:    false,
//   code:  "ALREADY_SUBSCRIBED" | "PACKAGE_NOT_FOUND" | "INVALID_DISCOUNT" | "INTERNAL",
//   message: string,
// }
//
// =======================================================================
//   IDEMPOTENCY
// =======================================================================
//
// orderId format must match what the backend expects:
//   order_<timestamp>_<packageId>_user<userId>
//
// Idempotency within a single checkout session is handled at the React
// level — the page generates the orderId once and reuses it on retries
// until the user explicitly cancels or starts a fresh attempt.

export const PRICE_MISMATCH_TOLERANCE_EGP = 1;

// Build an order id in the format the backend expects.
//   `order_<timestamp>_<packageId>_user<userId>`
// timestamp defaults to Date.now() but accepts an override so the same
// id can be reused across retries inside a single checkout session.
export function buildOrderId({ userId, packageId, timestamp }) {
  if (!userId || !packageId) {
    throw new Error("buildOrderId: userId and packageId are required");
  }
  const ts = Number.isFinite(timestamp) ? Number(timestamp) : Date.now();
  return `order_${ts}_${packageId}_user${userId}`;
}

// Build the priceVerification block from a frontend-computed regional
// price object (from calculatePackagePrice).
export function buildPriceVerification(regionalPrice) {
  if (!regionalPrice) return null;
  return {
    displayAmount: Number(regionalPrice.displayAmount) || 0,
    displayCurrency: String(regionalPrice.displayCurrency || "EGP"),
    egpAmount: Number(regionalPrice.egpAmount) || 0,
  };
}

// True if two EGP amounts agree within the tolerance defined above.
// Used by the checkout page to detect a backend disagreement before
// redirecting the user to Paymob.
export function egpAmountsAgree(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) return false;
  return Math.abs(numA - numB) <= PRICE_MISMATCH_TOLERANCE_EGP;
}
