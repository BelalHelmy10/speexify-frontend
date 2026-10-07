# Speexify responsive audit and remediation

Date: 7 October 2026  
Audited surfaces: public site, authenticated dashboard, profile, settings, resources, checkout, onboarding, and admin  
Locales: English (LTR) and Arabic (RTL)  
Viewport range: 320 × 568 through 2560 × 1440

## Final verdict

**Pass in the remediated local production build at all 11 audited viewport sizes.** Every responsive defect found during the public and authenticated audits has been fixed in the source and re-tested.

The final production-build evidence contains:

- **671/671** passing public render states: 61 routes × 11 viewports.
- **506/506** passing authenticated static render states: 46 English/Arabic routes × 11 viewports. Role-specific `/complete-profile` and `/admin` states were re-run with the matching fixtures after the initial broad sweep.
- **22/22** passing populated resource-unit render states: the real unit exposed by the live admin account, in English and Arabic, at all 11 viewports.
- **20/20** passing dynamic empty/error-state smoke renders for registration, session detail, feedback, classroom, and resource-unit routes at 320 × 568 and 1280 × 800.

That is **1,199 clean responsive render states** across the complete public matrix, authenticated static matrix, and populated resource-unit matrix. The 20 dynamic empty/error checks are reported separately because they are not populated business-data states.

This verdict applies to the source and production build in this workspace. It does **not** claim that `www.speexify.com` already contains these fixes: deployment and a post-deployment replay are still required.

## Screen-size verdicts

| Profile | Viewport | Public | Authenticated | Populated resource unit |
|---|---:|---:|---:|---:|
| XS phone | 320 × 568 | Pass | Pass | Pass |
| Small phone | 360 × 780 | Pass | Pass | Pass |
| Phone | 390 × 844 | Pass | Pass | Pass |
| Large phone | 430 × 932 | Pass | Pass | Pass |
| Phone landscape | 844 × 390 | Pass | Pass | Pass |
| Tablet portrait | 768 × 1024 | Pass | Pass | Pass |
| Tablet landscape | 1024 × 768 | Pass | Pass | Pass |
| Laptop | 1280 × 800 | Pass | Pass | Pass |
| Desktop | 1440 × 900 | Pass | Pass | Pass |
| Full HD | 1920 × 1080 | Pass | Pass | Pass |
| QHD | 2560 × 1440 | Pass | Pass | Pass |

Each state was checked for document-level horizontal overflow, unreachable/offscreen controls, broken images, fixed elements outside the viewport, controls below the enforced 24 px minimum, clipped interactive text, incorrect language/direction, and unexpected redirects.

## Resolved findings

### Public site

1. **Global trial CTA collisions — fixed.** The fixed CTA no longer obscures opening content or controls. It starts hidden, appears only after the opening viewport where a safe wide-screen gutter exists, remains suppressed on narrow/short screens, and retains footer avoidance.
2. **Booking toolbar clipped on narrow phones — fixed.** English and Arabic actions now reflow into reachable rows at 320, 360, 390, and 430 px.
3. **Homepage carousel controls below touch-target guidance — fixed.** Story and testimonial controls now have 44 × 44 px targets and keyboard focus treatment.
4. **Pricing fallback retry control cramped — fixed.** The fallback stacks on narrow screens and keeps a readable 44 px-high retry action in both locales.
5. **Responsive QA false-confidence gap — fixed.** The audit now uses the full public route manifest, asserts final paths, includes both locales and all 11 viewports, and checks overflow, target size, overlays, images, and language direction.

### Authenticated product

6. **Onboarding availability grid caused very large horizontal overflow — fixed.** The grid now owns an intentional horizontal scroller; absolute checkbox inputs no longer inflate document width; the mobile toolbar and labels remain reachable.
7. **Settings fields and actions clipped at phone widths — fixed.** Form controls now shrink to the content box and use full-width mobile actions.
8. **Resources Prep action escaped the 320 px viewport — fixed.** Picker actions wrap instead of forcing page overflow.
9. **Admin dashboard overflow and narrow filters — fixed.** Root containers now respect viewport width, controls meet the minimum target, and the scheduler collapses to one column below 1100 px.
10. **Admin scheduler form collapsed to zero width on phones — fixed.** The editor/preview layout now stacks and duration controls retain a 44 px minimum height.
11. **Admin support workspace overflow and undersized tag input — fixed.** The inbox becomes a single-column layout on smaller screens; the tag target is at least 44 px high.
12. **Back links below minimum target size — fixed.** Notifications, Progress, and Admin Recordings back actions now have at least 44 px interactive height.

## Live authenticated audit

The live admin session was used read-only to inspect authenticated pages and establish the pre-fix baseline. Of the successfully rendered live states, the audit found the authenticated defects listed above across 15 unique routes. Navigation to some later states was interrupted by intermittent in-app-browser network failures; those interruptions were excluded from defect counts.

The live account exposed the real populated unit:

`/resources/units/oxford-english-file-beginner-welcome`

That exact route and its Arabic equivalent were then tested against the remediated production build at every viewport and passed 22/22 states.

No concrete registration, session-detail, feedback, or classroom record URLs were visible in the admin account's Calendar or navigable links during the audit. Those route shells and empty/error states were tested, but their populated interiors require fixture records or real visible records.

## Verification

- ESLint: pass with zero warnings.
- TypeScript: `tsc --noEmit` pass.
- Automated tests: 25/25 pass.
- Production build: pass; all 112 routes generated.
- `git diff --check`: pass.
- No responsive failures remain in the final local matrices.

The test backend used isolated local fixture cookies and read-only route-specific fixture responses. The live admin session was not used to submit forms, create records, change settings, send messages, purchase anything, or delete data.

## Remaining release gates

These are verification/deployment gates, not known responsive source defects:

1. Deploy the remediated build to `www.speexify.com`.
2. Re-run the same matrix against the deployed assets.
3. Provide or expose populated learner session, feedback, classroom, and admin registration records so their data-rich interiors can receive the same sign-off.

## Evidence

- Public final matrix: `tmp/responsive-audit-2026-10-07/production/raw-results.json`
- Authenticated static matrix: `tmp/responsive-audit-2026-10-07/authenticated-static-production/results.json`
- Complete-profile role-specific matrix: `tmp/responsive-audit-2026-10-07/complete-profile-production/results.json`
- Final admin matrix: `tmp/responsive-audit-2026-10-07/admin-production-final/results.json`
- Populated resource-unit matrix: `tmp/responsive-audit-2026-10-07/resource-unit-production/results.json`
- Dynamic empty/error smoke matrix: `tmp/responsive-audit-2026-10-07/dynamic-smoke-production/results.json`
- Public screenshots and contact sheets: `tmp/responsive-audit-2026-10-07/overview/`
- Targeted remediation evidence: `tmp/responsive-audit-2026-10-07/evidence/`

## Remediation status

All responsive defects identified by this audit are **complete in source**. The only work not represented as complete is production deployment/retesting and populated-record verification where the authenticated account exposed no record URL.
