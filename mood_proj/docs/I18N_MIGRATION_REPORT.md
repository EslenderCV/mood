# i18n Migration Report

## What was done
- Added missing translation keys (8) across locales: `comments.*`, `deleteAccount.*`, `library.removeFromLibrary`, `story.*`.
- Added `tStatic()` helper (exported) in `context/LanguageContext.tsx` so translations can be used safely without React hooks.
- Migrated hardcoded, user-facing UI strings to translation keys under `ui.*` and replaced occurrences with `tStatic("ui.s_xxxxxxxx")`.

## Totals
- Replacements applied: 350
- Unique UI strings migrated: 302
- Locales updated: en, es, fr, it, pt

## Notes
- `ui.*` keys currently use the same default text across languages. You can translate them later by editing the locale files.
- This migration targets user-facing strings in:
  - `<Text>` / `<ThemedText>` contents
  - common UI props (`title`, `placeholder`, `label`, `message`, etc.)
  - `Alert.alert(title, message)`
  - text fragments inside `<Text>` blocks with mixed JSX

See `docs/i18n_migrated_strings.csv` for the full map.
