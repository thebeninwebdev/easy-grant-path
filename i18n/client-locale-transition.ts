import type { SupportedLocale } from "@/lib/config";

const hashStorageKey = "easygrantpath:locale-hash";

export function storeLocaleHash(locale: SupportedLocale, hash: string) {
  if (hash) sessionStorage.setItem(hashStorageKey, JSON.stringify({locale, hash}));
  else sessionStorage.removeItem(hashStorageKey);
}

export function restoreLocaleHash(locale: SupportedLocale) {
  const stored = sessionStorage.getItem(hashStorageKey);
  if (!stored) return;
  sessionStorage.removeItem(hashStorageKey);
  try {
    const value = JSON.parse(stored) as {locale?: string; hash?: string};
    if (value.locale !== locale || !value.hash?.startsWith("#") || window.location.hash === value.hash) return;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + value.hash);
  } catch {
    // Ignore malformed session data; locale navigation has already completed.
  }
}
