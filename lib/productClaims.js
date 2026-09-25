/**
 * Public marketing-claim register.
 *
 * This is intentionally fail-closed. A claim may be promoted to public copy
 * only after its evidence record contains a source, methodology, as-of date,
 * review owner, and the claim-specific consent/eligibility record.
 */

export const CLAIM_STATUS = Object.freeze({
  NEEDS_EVIDENCE: "needs-evidence",
  APPROVED: "approved",
});

const claimDefinitions = {
  recommendationRate: {
    id: "recommendationRate",
    type: "quantitative",
    originalCopy: "98% of members would recommend Speexify",
    evidence: null,
    safeCopy: {
      en: { value: "Member feedback", label: "shapes the practice" },
      ar: { value: "ملاحظات الأعضاء", label: "بتشكّل طريقة التمرين" },
    },
  },
  coachedHours: {
    id: "coachedHours",
    type: "quantitative",
    originalCopy: "50k+ hours coached",
    evidence: null,
    safeCopy: {
      en: { value: "Live practice", label: "one session at a time" },
      ar: { value: "ممارسة مباشرة", label: "جلسة ورا التانية" },
    },
  },
  comparativeOutcome: {
    id: "comparativeOutcome",
    type: "comparative",
    originalCopy: "2.7× faster than studying alone",
    evidence: null,
    safeCopy: {
      en: { value: "Practice that responds", label: "to your real conversations" },
      ar: { value: "تمرين بيتفاعل معاك", label: "وحول محادثاتك الحقيقية" },
    },
  },
  memberRating: {
    id: "memberRating",
    type: "quantitative",
    originalCopy: "4.9/5 average member rating",
    evidence: null,
    safeCopy: {
      en: { value: "A coach in the room", label: "for real conversation practice" },
      ar: { value: "مدرّب معاك في الجلسة", label: "لتمرين محادثة حقيقي" },
    },
  },
  partnerLogos: {
    id: "partnerLogos",
    type: "affiliation",
    originalCopy: "Partner and employer logos",
    evidence: null,
    safeCopy: {
      en: { value: "Built for real work", label: "and everyday conversations" },
      ar: { value: "مبني للشغل الحقيقي", label: "والمحادثات اليومية" },
    },
  },
  testimonials: {
    id: "testimonials",
    type: "testimonial",
    originalCopy: "Named member testimonials and outcome stories",
    evidence: null,
    safeCopy: {
      en: { value: "Practice notes", label: "not performance promises" },
      ar: { value: "ملاحظات عن التمرين", label: "مش وعود بنتائج" },
    },
  },
  firstSessionOffer: {
    id: "firstSessionOffer",
    type: "offer",
    originalCopy: "First session free",
    evidence: null,
    safeCopy: {
      en: { value: "Starter session", label: "Ask about availability and terms" },
      ar: { value: "جلسة تعريفية", label: "اسأل عن التوفر والشروط" },
    },
  },
};

function freezeClaim(claim) {
  const evidence = claim.evidence
    ? Object.freeze({
        ...claim.evidence,
        display: claim.evidence.display
          ? Object.freeze({ ...claim.evidence.display })
          : undefined,
      })
    : null;

  return Object.freeze({
    ...claim,
    evidence,
    safeCopy: Object.freeze({
      en: Object.freeze({ ...claim.safeCopy.en }),
      ar: Object.freeze({ ...claim.safeCopy.ar }),
    }),
  });
}

export const productClaims = Object.freeze(
  Object.fromEntries(
    Object.entries(claimDefinitions).map(([key, claim]) => [key, freezeClaim(claim)]),
  ),
);

/**
 * Evidence is deliberately explicit rather than inferred from a CMS row.
 * Consent is required for testimonials; eligibility is required for offers;
 * logo authorization is required for affiliation claims.
 */
export function isPublishableClaim(claim) {
  const evidence = claim?.evidence;
  if (!evidence || evidence.status !== CLAIM_STATUS.APPROVED) return false;

  const required = [
    evidence.source,
    evidence.methodology,
    evidence.asOf,
    evidence.reviewedBy,
  ];
  if (required.some((value) => typeof value !== "string" || !value.trim())) {
    return false;
  }

  if (claim.type === "testimonial" && evidence.consent !== "documented") {
    return false;
  }

  if (claim.type === "affiliation" && evidence.authorization !== "documented") {
    return false;
  }

  if (claim.type === "offer" && !evidence.eligibility) return false;

  if (!evidence.display || typeof evidence.display !== "object") return false;
  const displayLocales = [evidence.display.en, evidence.display.ar];
  if (
    displayLocales.some(
      (display) =>
        !display ||
        typeof display.value !== "string" ||
        !display.value.trim() ||
        typeof display.label !== "string" ||
        !display.label.trim(),
    )
  ) {
    return false;
  }

  return true;
}

export function getProductClaim(claimId) {
  return productClaims[claimId] || null;
}

export function getProductClaimDisplay(claimId, locale = "en") {
  const claim = getProductClaim(claimId);
  if (!claim) return null;

  if (isPublishableClaim(claim)) {
    return claim.evidence.display?.[locale] || claim.evidence.display?.en || null;
  }

  return claim.safeCopy[locale] || claim.safeCopy.en;
}
