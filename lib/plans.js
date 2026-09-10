// frontend/lib/plans.js
// Editorial package content. Prices, regional offers and numeric IDs come from the backend.
// English text here is the canonical fallback / backend identifier.
// Localized display strings live in locales/{en,ar}/packages.json under
// `plan_{id}_title`, `plan_{id}_desc`, `plan_{id}_features` (semicolon-separated).

export const oneOnOnePlans = [
  {
    id: "1on1-4",
    title: "Starter",
    description: "A focused introduction to your personal coaching experience.",
    durationMin: 60,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach matched to your goals;A personal learning plan;Live, guided conversation practice;Individual feedback;Support throughout your program",
    isPopular: false,
  },
  {
    id: "1on1-12",
    title: "Professional",
    description: "Build a consistent practice routine around your goals.",
    durationMin: 60,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach matched to your goals;A personal learning plan;Live, guided conversation practice;Individual feedback;Support throughout your program",
    isPopular: false,
  },
  {
    id: "1on1-24",
    title: "Intensive",
    description: "Give your skills more time to develop through regular practice.",
    durationMin: 60,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach matched to your goals;A personal learning plan;Live, guided conversation practice;Individual feedback;Support throughout your program",
    isPopular: true,
  },
  {
    id: "1on1-48",
    title: "Master",
    description: "Make sustained practice part of your long-term development.",
    durationMin: 60,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach matched to your goals;A personal learning plan;Live, guided conversation practice;Individual feedback;Support throughout your program",
    isPopular: false,
  },
];

export const groupPlans = [
  {
    id: "group-4",
    title: "Group Starter",
    description: "A focused introduction to guided practice in a small group.",
    durationMin: 90,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups of 2\u20135;Learners matched to your level;Live, guided conversation practice;Feedback from your coach;Support throughout your program",
    isPopular: false,
  },
  {
    id: "group-12",
    title: "Group Professional",
    description: "Build a consistent routine of learning and practicing together.",
    durationMin: 90,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups of 2\u20135;Learners matched to your level;Live, guided conversation practice;Feedback from your coach;Support throughout your program",
    isPopular: true,
  },
  {
    id: "group-24",
    title: "Group Intensive",
    description: "Give your skills more time to develop through regular group practice.",
    durationMin: 90,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups of 2\u20135;Learners matched to your level;Live, guided conversation practice;Feedback from your coach;Support throughout your program",
    isPopular: false,
  },
  {
    id: "group-48",
    title: "Group Master",
    description: "Make group practice part of your long-term development.",
    durationMin: 90,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups of 2\u20135;Learners matched to your level;Live, guided conversation practice;Feedback from your coach;Support throughout your program",
    isPopular: false,
  },
];

export const corporatePlans = [
  {
    id: "corp-pilot",
    title: "Pilot",
    description: "A small cohort. Before-and-after measures. A clear answer before you commit further.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "5–15 members;1:1 and group practice, mixed;Needs assessment before kickoff;8–12 week program;Kickoff workshop with leadership;Impact report at the end;Briefings for line managers",
    isPopular: false,
  },
  {
    id: "corp-team",
    title: "Team Program",
    description: "The full practice ground for a growing team. 1:1, group, workshops, and reporting your leadership can act on.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "15–50 members;Mix of 1:1, group, and workshops;A practice plan built per role;Quarterly assessments;A program manager you'll know by name;Monthly reporting your leadership will read;Invoicing and PO handled;SSO if you need it",
    isPopular: true,
  },
  {
    id: "corp-enterprise",
    title: "Enterprise",
    description: "Full rollout. A Success Manager you'll know by name. Executive reporting. Compliance, sorted.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "50+ members;Rollout across locations;A dedicated Success Manager;Executive-level reporting;API and HRIS integration;Security and compliance, reviewed upfront;Tailored reporting;Quarterly business reviews;Priority support;ROI analysis",
    isPopular: false,
  },
  {
    id: "global-enterprise",
    title: "Global Enterprise",
    description:
      "Speexify, deployed across regions. A Success Director, executive reporting, and the integrations your operation needs.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "100+ members;Deployment across regions;Multilingual support, around the clock;A dedicated Success Director;Advanced analytics;Integrations with your HRIS, LMS, SSO;GDPR and SOC2 compliance;ROI and performance benchmarking;Annual partnership review;Tailored workshops for executives",
    isPopular: false,
  },
];
