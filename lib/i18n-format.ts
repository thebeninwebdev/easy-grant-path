import type { SupportedLocale } from "@/lib/config";

const intlLocale: Record<SupportedLocale, string> = { fr: "fr-CI", en: "en-GB" };

export function formatCurrency(value: number, currency: string, locale: SupportedLocale, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency, maximumFractionDigits: 0, ...options }).format(value);
}

export function formatNumber(value: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale[locale], options).format(value);
}

export function formatDate(value: string | Date, locale: SupportedLocale, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC", ...options }).format(new Date(value));
}

export function formatRelativeDate(value: string | Date, locale: SupportedLocale, now = new Date()) {
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  return new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" }).format(days, "day");
}

export function displayCountry(code: string, locale: SupportedLocale) {
  try { return new Intl.DisplayNames([intlLocale[locale]], { type: "region" }).of(code) || code; }
  catch { return code; }
}

export function localeCode(locale: SupportedLocale) { return intlLocale[locale]; }
