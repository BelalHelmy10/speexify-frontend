// frontend/lib/plans.js
// Shared plans catalog used by /packages and /manual-payment.
// English text here is the canonical fallback / backend identifier.
// Localized display strings live in locales/{en,ar}/packages.json under
// `plan_{id}_title`, `plan_{id}_desc`, `plan_{id}_features` (semicolon-separated).

export const oneOnOnePlans = [
  {
    id: "1on1-4",
    title: "Starter",
    description: "Try the practice ground. Four sessions to feel the shift.",
    priceEGP: 800,
    durationMin: 60,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach picked for you;Schedule that fits your week;A practice plan built around you;Recordings of every session;Email support",
    isPopular: false,
  },
  {
    id: "1on1-12",
    title: "Professional",
    description: "The pack most members start with. Real practice, in a routine you can keep.",
    priceEGP: 2200,
    durationMin: 60,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach picked for you;First-pick scheduling;A practice plan built around you;Notes after every session;Between-session reps;Pronunciation feedback",
    isPopular: false,
    savings: "Save 8%",
  },
  {
    id: "1on1-24",
    title: "Intensive",
    description: "Deep practice on the moments that matter. Built for the people in a hurry to use it.",
    priceEGP: 3800,
    durationMin: 60,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "A coach picked for you;First-pick scheduling;Deeper practice on your hardest moments;Weekly progress check-ins;Mock interviews and pitches;Industry-specific scenarios;Unlimited email support",
    isPopular: true,
    savings: "Save 13%",
    pricingOverrides: {
      US: { total: 1440, currency: "USD" }, // => $60/session
    },
  },
  {
    id: "1on1-48",
    title: "Master",
    description: "Long-term practice with a coach who knows you. The deepest version of the practice ground.",
    priceEGP: 6800,
    durationMin: 60,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "A dedicated coach;Bi-weekly strategy sessions;In-depth progress assessments;Career conversation coaching;Networking practice;Library access (kept for life);Priority support",
    isPopular: false,
    savings: "Save 20%",
  },
];

export const groupPlans = [
  {
    id: "group-4",
    title: "Group Starter",
    description: "Try the group practice ground. Four sessions in a small, level-matched cohort.",
    priceEGP: 600,
    durationMin: 90,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2–5 members);Members matched at a similar place;Real conversations, in a group;Group practice scenarios;Shared notes after each session",
    isPopular: false,
  },
  {
    id: "group-12",
    title: "Group Professional",
    description: "Group practice in a routine you can keep. The pack most members of small-group plans choose.",
    priceEGP: 1600,
    durationMin: 90,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2–5 members);Groups matched with care;Role-play that mirrors real situations;Peer feedback in the room;Monthly progress check;Practice prompts between sessions",
    isPopular: true,
    savings: "Save 13%",
  },
  {
    id: "group-24",
    title: "Group Intensive",
    description: "Twice the reps. A cohort that stays together. The shift comes faster.",
    priceEGP: 2800,
    durationMin: 90,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2–5 members);A stable cohort that stays together;Realistic scenarios, not classroom drills;Group projects you actually finish;Presentations in front of peers;Progress tracked over time;Extended practice library",
    isPopular: false,
    savings: "Save 20%",
  },
  {
    id: "group-48",
    title: "Group Master",
    description: "Deep group practice for the long haul. A cohort that grows together.",
    priceEGP: 5000,
    durationMin: 90,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2–5 members);A dedicated cohort, long-term;Specialist workshops;Guest speaker sessions;Community access;End-of-program certificate (optional);Alumni network (kept for life);Ongoing coach support",
    isPopular: false,
    savings: "Save 28%",
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
