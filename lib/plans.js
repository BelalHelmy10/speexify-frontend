// frontend/lib/plans.js
// Shared plans catalog used by /packages and /manual-payment

export const oneOnOnePlans = [
  {
    id: "1on1-4",
    title: "Starter",
    description: "Perfect for trying out personalized coaching",
    priceEGP: 800,
    durationMin: 60,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nFlexible scheduling\nPersonalized curriculum\nSession recordings\nEmail support",
    isPopular: false,
  },
  {
    id: "1on1-12",
    title: "Professional",
    description: "Build lasting skills with consistent practice",
    priceEGP: 2200,
    durationMin: 60,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nCustom learning plan\nDetailed progress reports\nHomework & resources\nPronunciation analysis",
    isPopular: false,
    savings: "Save 8%",
  },
  {
    id: "1on1-24",
    title: "Intensive",
    description: "Accelerate your progress with deep practice",
    priceEGP: 3800,
    durationMin: 60,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nAdvanced curriculum\nWeekly progress calls\nMock interviews\nIndustry-specific content\nUnlimited email support",
    isPopular: true,
    savings: "Save 13%",
    pricingOverrides: {
      US: { total: 1440, currency: "USD" }, // => $60/session
    },
  },
  {
    id: "1on1-48",
    title: "Master",
    description: "Maximum commitment for transformation",
    priceEGP: 6800,
    durationMin: 60,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nDedicated coach\nBi-weekly strategy sessions\nComprehensive assessments\nCareer coaching\nNetworking practice\nLifetime resource access\n24/7 support",
    isPopular: false,
    savings: "Save 20%",
  },
];

export const groupPlans = [
  {
    id: "group-4",
    title: "Group Starter",
    description: "Learn together in a small, focused group",
    priceEGP: 600,
    durationMin: 90,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nLevel-matched peers\nInteractive exercises\nGroup activities\nShared resources",
    isPopular: false,
  },
  {
    id: "group-12",
    title: "Group Professional",
    description: "Consistent group practice for steady growth",
    priceEGP: 1600,
    durationMin: 90,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nCarefully matched groups\nRole-play scenarios\nPeer feedback sessions\nMonthly assessments\nDigital workbook",
    isPopular: true,
    savings: "Save 13%",
  },
  {
    id: "group-24",
    title: "Group Intensive",
    description: "Immersive collaborative learning experience",
    priceEGP: 2800,
    durationMin: 90,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nStable learning cohort\nReal-world simulations\nGroup projects\nPeer presentations\nProgress tracking\nExtended resources",
    isPopular: false,
    savings: "Save 20%",
  },
  {
    id: "group-48",
    title: "Group Master",
    description: "Complete transformation through group dynamics",
    priceEGP: 5000,
    durationMin: 90,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nDedicated cohort\nAdvanced workshops\nGuest speaker sessions\nCommunity access\nCertificate of completion\nLifetime alumni network\nOngoing support",
    isPopular: false,
    savings: "Save 28%",
  },
];

export const corporatePlans = [
  {
    id: "corp-pilot",
    title: "Pilot Program",
    description: "Test and validate with a small team cohort",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "5-15 employees\nMixed 1:1 and group format\nNeeds assessment\n8-12 week program\nKickoff workshop\nEnd-of-program report\nManager briefings",
    isPopular: false,
  },
  {
    id: "corp-team",
    title: "Team Program",
    description: "Comprehensive training for growing teams",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "15-50 employees\nFlexible delivery formats\nCustom curriculum design\nQuarterly assessments\nDedicated program manager\nMonthly reporting dashboard\nInvoicing & PO support\nSSO integration",
    isPopular: true,
  },
  {
    id: "corp-enterprise",
    title: "Enterprise Solution",
    description: "Scaled language training with full support",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "50+ employees\nMulti-location rollout\nDedicated Customer Success Manager\nExecutive dashboards\nAPI integration\nSecurity & compliance review\nCustom reporting\nQuarterly business reviews\n24/7 support\nROI analysis",
    isPopular: false,
  },
  {
    id: "global-enterprise",
    title: "Global Enterprise",
    description:
      "Worldwide language training with enterprise-grade scalability",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "100+ employees\nGlobal multi-region deployment\n24/7 multilingual support\nDedicated Enterprise Success Director\nAdvanced analytics & insights\nCustom integrations (HRIS, LMS, SSO)\nRegulatory & data compliance (GDPR, SOC2)\nROI & performance benchmarking\nAnnual strategic partnership review\nTailored executive workshops",
    isPopular: false,
  },
];
