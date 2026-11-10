"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {startTransition} from "react";
import type {SupportedLocale} from "@/lib/config";
import {localizedPath} from "@/i18n/paths";
import {cn} from "@/lib/utils";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LanguageSwitcher({className, compact = false}: {className?: string; compact?: boolean}) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale) return;

    const query = searchParams.toString();
    const hash = window.location.hash;
    const canonicalPath = localizedPath(pathname, nextLocale);
    const destination = canonicalPath + (query ? `?${query}` : "") + hash;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    startTransition(() => router.replace(destination, {scroll: false}));
  }

  return (
    <div className={cn("inline-flex items-center rounded-full border border-current/15 bg-background/80 p-1 text-xs font-semibold shadow-sm backdrop-blur", className)} role="group" aria-label={t("changeLanguage")}>
      {(["fr", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value} aria-pressed={locale === value} onClick={() => changeLocale(value)}
          className={cn("min-h-9 rounded-full px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", locale === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted", compact && "min-h-8 px-2.5")}>
          {compact ? value.toUpperCase() : t(value === "fr" ? "french" : "english")}
        </button>
      ))}
    </div>
  );
}