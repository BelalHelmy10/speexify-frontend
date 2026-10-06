# Speexify Brand System v1

## Phase 1 brand lock

The source of truth for product-facing brand language lives in `lib/brand.js`.

| Item | Locked language |
|------|-----------------|
| Name | Speexify |
| Tagline | Speak it. Don’t study it. |
| Category | English speaking coaching |
| Short positioning | English speaking coaching for ambitious adults building their careers. |
| Wedge | You bring your real life. We coach you through it. |

## Brand dictionary

| Avoid | Use |
|-------|-----|
| teacher | coach |
| student | member |
| lesson | session |
| curriculum | Practice Plan |
| homework | real-life challenge |
| vocabulary | phrases you can use |
| grammar | patterns |
| exercise | practice |
| test | check-in |
| level | where you are now |

## Public language rules

Avoid in public marketing copy: fluency, lesson, teacher, student, level, homework, test, grammar, vocabulary, certificate, beginner, advanced, native speaker.

Internal-only exceptions: CEFR and A1-C2 scoring can stay inside assessment logic, coach notes, and admin tools. Teacher, learner, lesson, and level can stay in database fields, API contracts, and imported publisher resource names until a safe migration is planned. Grammar, vocabulary, and test can stay inside licensed material titles or diagnostic rubrics, but should not lead public marketing copy.

## Nav logo (do not resize here)

Navbar lockup sizing is owned entirely by `styles/_header.scss` (`.spx-brand` block).  
`BrandLogo` with `context="header"` reuses those classes and must not add size overrides.

## Logo component

`@/components/brand/BrandLogo`

| context | Use |
|---------|-----|
| `header` | Navigation (sizes from `_header.scss`) |
| `footer` | Site footer |
| `auth` | Login / register cards |
| `mark` | Icon only |

## Typography

- **Body:** Inter (`--font-body`)
- **Display:** Outfit (`--font-display`)
- Classroom/resources use the same stack (no separate DM Sans / Plus Jakarta).

## Buttons

Canonical: **`spx-btn`** + modifiers (`--primary`, `--ghost-navy`, `--ghost-white`, `--shine`, `--lg`).

Legacy aliases: `.btn`, `.home-btn`, `.btn-primary`.

## Homepage copy

All strings in `locales/{en,ar}/home.json`. Run `npm run i18n:check:strict` before merge.
