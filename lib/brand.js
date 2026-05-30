export const BRAND_NAME = "Speexify";
export const BRAND_TAGLINE = "Speak it. Don’t study it.";
export const BRAND_CATEGORY = "English speaking coaching";
export const BRAND_SHORT_POSITIONING =
  "English speaking coaching for ambitious adults building their careers.";
export const BRAND_WEDGE =
  "You bring your real life. We coach you through it.";
export const BRAND_DESCRIPTION =
  "English speaking coaching that helps ambitious adults use what they already know in interviews, meetings, presentations, and real work moments.";
export const BRAND_SITE_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;

export const BRAND_DICTIONARY = Object.freeze({
  teacher: "coach",
  student: "member",
  lesson: "session",
  curriculum: "Practice Plan",
  homework: "real-life challenge",
  vocabulary: "phrases you can use",
  grammar: "patterns",
  exercise: "practice",
  test: "check-in",
  level: "where you are now",
});

export const PUBLIC_FORBIDDEN_LANGUAGE = Object.freeze([
  "fluency",
  "lesson",
  "teacher",
  "student",
  "level",
  "homework",
  "test",
  "grammar",
  "vocabulary",
  "certificate",
  "beginner",
  "advanced",
  "native speaker",
]);

export const INTERNAL_ONLY_LANGUAGE = Object.freeze([
  "CEFR and A1-C2 scoring can stay inside assessment logic, coach notes, and admin tools.",
  "Teacher, learner, lesson, and level can stay in database fields, API contracts, and imported publisher resource names until a safe migration is planned.",
  "Grammar, vocabulary, and test can stay inside licensed material titles or diagnostic rubrics, but should not lead public marketing copy.",
]);
