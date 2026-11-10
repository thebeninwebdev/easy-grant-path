# Localization

EasyGrantPath uses `next-intl` with French (`fr`) as the default, unprefixed locale and English (`en`) under `/en`. Locale routing lives in `i18n/routing.ts`; `proxy.ts` excludes APIs, admin, internal jobs, webhooks, and static files.

Customer copy belongs in both `messages/fr.json` and `messages/en.json`, under the closest existing namespace. Keep identical keys in both files. Server Components should call `getTranslations`; Client Components should call `useTranslations`. Use the localized `Link`, `redirect`, and router exports from `i18n/navigation.ts`, and use helpers from `lib/i18n-format.ts` for dates, currency, numbers, relative dates, and country names.

Opportunity provider text is never machine-translated at request time. Reviewed French editorial fields live in `translations.fr` and fall back to sanitized source content. Proposal IDs, section keys, stored user content, payment identifiers, API enums, and database enum values must never be translated.

After adding copy, run `corepack yarn i18n:check`, lint, TypeScript checks, and the production build.