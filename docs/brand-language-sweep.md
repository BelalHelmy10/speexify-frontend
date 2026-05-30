# Speexify Brand Language Sweep

Phase 1 status: the old positioning strings have been removed from searchable website and social mockup text.

## Public copy to clean next

These English locale files still contain one or more public-facing words from the forbidden sweep and should be handled during the page rewrites:

- `locales/en/home.json`
- `locales/en/individual.json`
- `locales/en/packages.json`
- `locales/en/why-speexify.json`
- `locales/en/contact.json`
- `locales/en/member-stories.json`
- `locales/en/footer.json`
- `locales/en/onboarding.json`
- `locales/en/session.json`
- `locales/en/dashboard.json`
- `locales/en/progress.json`
- `locales/en/feedback.json`
- `locales/en/resources.json`
- `locales/en/nav.json`
- `locales/en/refund-policy.json`

## Public route files to review

These files contain user-visible language or metadata that should be reviewed as part of Phase 2 and Phase 3:

- `app/assessment/page.js`
- `app/individual-training/page.js`
- `app/packages/page.js`
- `app/HomePageContent.jsx`
- `app/KidsPageContent.jsx`
- `app/seoContent.js`
- `app/resources/page.js`
- `app/resources/ResourcesPicker.jsx`
- `app/resources/units/[slug]/UnitPageContent.jsx`
- `app/resources/prep/PrepPageContent.jsx`
- `app/refund-policy/page.js`
- `app/contact/page.js`

## Product UI to clean after public pages

These should move to the new language system, but they touch authenticated workflows and should be changed with QA:

- Dashboard labels: learner, teacher, teacher feedback
- Session details: lesson, teacher, notes/homework
- Feedback pages: teacher feedback, learner feedback
- Progress pages: fluency practice, teacher scoring
- Onboarding: levels, placement, test framing
- Resources/classroom: course, unit, level, lesson labels

## Internal-only language that can stay for now

Do not rename these blindly in Phase 1:

- Database fields, API contracts, Prisma migrations, and generated clients using `teacher`, `learner`, `lesson`, or `level`
- Admin-only workflow variables such as `isTeacher`, `teacherFeedback`, or `lessonNumber`
- Imported publisher resource names, file names, tags, CEFR labels, and diagnostic rubrics
- CMS upload scripts and resource-indexing scripts that mirror external material structure

## Sweep command

Use this check before each phase closes:

```bash
rg --count-matches -i "\b(fluency|lesson|teacher|student|level|homework|test|grammar|vocabulary|certificate|beginner|advanced|native speaker)\b" locales/en app components public/data docs lib -g '!node_modules/**' -g '!.next/**'
```
