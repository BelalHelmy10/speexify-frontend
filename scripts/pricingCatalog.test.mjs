import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchPricingCatalogData,
  isPurchaseReadyPlan,
  isValidPricingCatalog,
} from "../lib/pricing-catalog.mjs";

const validCatalog = {
  regionToken: "signed-region-token",
  packages: [
    {
      id: 42,
      catalogKey: "1on1-4",
      pricing: {displayAmount: 1200, displayCurrency: "EGP"},
    },
  ],
};

test("rejects a catalog request that times out", async () => {
  await assert.rejects(
    fetchPricingCatalogData(() => new Promise(() => {}), 20),
    (error) => error.code === "PRICING_CATALOG_TIMEOUT",
  );
});

test("rejects malformed catalog data before it can enable checkout", async () => {
  const malformedCatalogs = [
    {...validCatalog, regionToken: null},
    {...validCatalog, packages: []},
    {...validCatalog, packages: [{...validCatalog.packages[0], id: null}]},
    {...validCatalog, packages: [{...validCatalog.packages[0], pricing: null}]},
  ];

  for (const catalog of malformedCatalogs) {
    assert.equal(isValidPricingCatalog(catalog), false);
    await assert.rejects(
      fetchPricingCatalogData(() => Promise.resolve({data: catalog})),
      (error) => error.code === "PRICING_CATALOG_INVALID",
    );
  }
});

test("only a catalog-backed plan with a matching signed region token is purchase-ready", () => {
  assert.equal(isPurchaseReadyPlan({backendId: 42, regionToken: validCatalog.regionToken}, validCatalog), true);
  assert.equal(isPurchaseReadyPlan({backendId: null, regionToken: validCatalog.regionToken}, validCatalog), false);
  assert.equal(isPurchaseReadyPlan({backendId: 42, regionToken: "stale-token"}, validCatalog), false);
});
