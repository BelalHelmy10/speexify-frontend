// Classroom interface text in English and Arabic (locales/*/classroom.json).
// Plain function so server pages can use it too; client components use
// useClassroomText from ./classroomText. Lesson content (names, chat
// messages, materials) is never translated.
import en from "@/locales/en/classroom.json";
import ar from "@/locales/ar/classroom.json";

const DICTIONARIES = { en, ar };

export function classroomText(locale, key, vars) {
  const dict = DICTIONARIES[locale === "ar" ? "ar" : "en"];
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value ?? ""));
    }
  }
  return text;
}
