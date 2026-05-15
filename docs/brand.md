# Speexify Brand System v1

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
