# Marketing claims evidence standard

Public marketing proof is governed by `lib/productClaims.js`. The registry is
fail-closed: a claim without an approved evidence record is replaced with its
non-quantitative safe copy.

Before publishing a quantitative, comparative, affiliation, testimonial, or
promotional claim, add an evidence record containing:

- `source`: a durable URL, report ID, survey export, offer-policy ID, or signed
  authorization record;
- `methodology`: population, denominator, sampling window, calculation, and
  exclusions for metrics; provenance and attribution rules for testimonials;
- `asOf`: the measurement or verification date;
- `reviewedBy`: the accountable owner who checked the source;
- `consent: "documented"` for testimonials, including the approved name,
  role/company display, quote, and revocation path;
- `authorization: "documented"` for partner/employer logos;
- `eligibility` for offers, including audience, one-per-person limits, session
  length, availability, expiry, cancellation/no-show terms, and whether other
  promotions can be combined.

Do not use a claim as a UI fallback while its evidence is missing. Keep the
safe copy, or remove the module entirely. Re-verify time-sensitive metrics and
offers before their review date, and remove published copy when consent is
revoked or eligibility changes.

The current audited claims are intentionally unpublished because this
repository does not contain source records for them:

- 98% recommendation rate
- 50k+ hours/sessions
- 2.7× comparative outcome
- 4.9/5 rating
- partner logos
- named testimonials and outcome stories
- “first session free”

