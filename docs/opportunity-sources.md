# Opportunity sources

EasyGrantPath synchronizes official sources through the protected `POST /api/internal/opportunities/sync` endpoint. Every import is created as `needs_review`; only an administrator can verify it, and public queries additionally reject expired records at read time.

| Slug | Official discovery URL | Method | Schedule / limitation |
|---|---|---|---|
| `grants-gov` | https://api.grants.gov | Official API | Existing twice-daily sync |
| `ecowas` | https://www.ecowas.int/event_advert/grants/ | Bounded official HTML listing/detail parser | 12-hourly; excludes recruitment, tenders and procurement |
| `undp` | https://www.undp.org/africa | Configurable official country-office HTML discovery | Daily; country publication is not treated as cross-border eligibility |
| `afdb-accf` | https://accf.afdb.org/how-we-work/call-for-proposals | Official HTML parser | Daily; current ordinary retrieval returned HTTP 402, so a failed run is truthful and records remain unchanged |
| `un-mptf` | https://mptf.undp.org/page/funding-call-proposals | Structured official HTML heading/block parser | Daily; extracts calls, not the landing page |

The HTTP client is HTTPS-only, has a 15-second timeout, three bounded attempts, response-size limits, same-host redirect validation, a declared user agent, and bounded listing traversal. No CAPTCHA, login, or anti-bot measure is bypassed. If an official page is unavailable, use the normal admin manual-entry review flow and retain the official URL.

`SYNC_SECRET` and `EASYGRANTPATH_SYNC_URL` are required GitHub Actions secrets. Dispatch the workflow with `source=all` or one registered slug. Add UNDP offices by editing `sources/undp/country-config.ts`. Duplicate identity checks use source/external ID, canonical official URL, opportunity number, and an accent-insensitive title/organization/deadline fingerprint; cross-source matches are skipped conservatively.