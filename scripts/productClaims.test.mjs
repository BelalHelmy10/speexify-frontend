import test from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_STATUS,
  getProductClaim,
  getProductClaimDisplay,
  isPublishableClaim,
  productClaims,
} from "../lib/productClaims.js";

const requiredIds = [
  "recommendationRate",
  "coachedHours",
  "comparativeOutcome",
  "memberRating",
  "partnerLogos",
  "testimonials",
  "firstSessionOffer",
];

test("every audited marketing claim has a fail-closed evidence record", () => {
  for (const id of requiredIds) {
    const claim = getProductClaim(id);
    assert.ok(claim, `missing claim ${id}`);
    assert.equal(claim.evidence, null);
    assert.equal(isPublishableClaim(claim), false);
    assert.ok(claim.originalCopy);
    assert.ok(claim.safeCopy.en.value);
    assert.ok(claim.safeCopy.ar.value);
  }
});

test("approved claims still require the complete evidence contract", () => {
  const incomplete = {
    ...productClaims.firstSessionOffer,
    evidence: { status: CLAIM_STATUS.APPROVED },
  };
  assert.equal(isPublishableClaim(incomplete), false);

  const complete = {
    ...productClaims.firstSessionOffer,
    evidence: {
      status: CLAIM_STATUS.APPROVED,
      source: "offer-policy:starter-session-v1",
      methodology: "Eligibility checked before booking",
      asOf: "2026-09-25",
      reviewedBy: "growth-owner",
      eligibility: "New individual members; one 30-minute session; subject to availability",
      display: {
        en: { value: "Starter session", label: "Ask about availability and terms" },
        ar: { value: "جلسة تعريفية", label: "اسأل عن التوفر والشروط" },
      },
    },
  };
  assert.equal(isPublishableClaim(complete), true);
});

test("claim-specific evidence cannot be skipped", () => {
  const common = {
    status: CLAIM_STATUS.APPROVED,
    source: "research:approved-record",
    methodology: "Documented review method",
    asOf: "2026-09-25",
    reviewedBy: "growth-owner",
    display: {
      en: { value: "Approved value", label: "Approved label" },
      ar: { value: "قيمة معتمدة", label: "وصف معتمد" },
    },
  };

  assert.equal(
    isPublishableClaim({ ...productClaims.testimonials, evidence: common }),
    false,
  );
  assert.equal(
    isPublishableClaim({
      ...productClaims.testimonials,
      evidence: { ...common, consent: "documented" },
    }),
    true,
  );
  assert.equal(
    isPublishableClaim({ ...productClaims.partnerLogos, evidence: common }),
    false,
  );
  assert.equal(
    isPublishableClaim({
      ...productClaims.partnerLogos,
      evidence: { ...common, authorization: "documented" },
    }),
    true,
  );
  assert.equal(
    isPublishableClaim({ ...productClaims.firstSessionOffer, evidence: common }),
    false,
  );
});

test("public display returns the safe copy until evidence is approved", () => {
  assert.deepEqual(getProductClaimDisplay("recommendationRate", "en"), {
    value: "Member feedback",
    label: "shapes the practice",
  });
  assert.deepEqual(getProductClaimDisplay("firstSessionOffer", "ar"), {
    value: "جلسة تعريفية",
    label: "اسأل عن التوفر والشروط",
  });
});
