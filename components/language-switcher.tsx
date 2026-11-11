"use client";

import {useLocale, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useOptimistic, useTransition} from "react";
import type {SupportedLocale} from "@/lib/config";
import {getPathname, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LanguageSwitcher({className, compact = false}: {className?: string; compact?: boolean}) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [displayedLocale, setDisplayedLocale] = useOptimistic(locale);

  useEffect(() => {
    if (document.documentElement.dataset.localeTransitionTo !== locale) return;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        delete document.documentElement.dataset.localeTransitionTo;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [locale]);

  function changeLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale || isPending) return;

    const query = searchParams.toString();
    const hash = window.location.hash;
    const canonicalPath = getPathname({href: pathname, locale: nextLocale});
    const destination = canonicalPath + (query ? `?${query}` : "") + hash;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.documentElement.setAttribute("data-locale-transition-to", nextLocale);
    Reflect.set(document, "cookie", `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`);
    startTransition(() => {
      setDisplayedLocale(nextLocale);
      router.replace(destination, {scroll: false});
    });
  }

  return (
    <div className={cn("relative inline-grid grid-cols-2 items-center rounded-full border border-current/15 bg-background/80 p-1 text-xs font-semibold shadow-sm backdrop-blur", className)} role="group" aria-label={t("changeLanguage")} aria-busy={isPending}>
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none", displayedLocale === "en" && "translate-x-full")}
      />
      {(["fr", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value} aria-pressed={displayedLocale === value} disabled={isPending} onClick={() => changeLocale(value)}
          className={cn("relative z-10 min-h-9 rounded-full px-3 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait", displayedLocale === value ? "text-primary-foreground" : "text-foreground hover:bg-muted", compact && "min-h-8 px-2.5")}>
          {compact ? value.toUpperCase() : t(value === "fr" ? "french" : "english")}
        </button>
      ))}
    </div>
  );
}