"use client";

import {useLocale, useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {useEffect, useOptimistic, useRef, useTransition} from "react";
import type {SupportedLocale} from "@/lib/config";
import {usePathname, useRouter} from "@/i18n/navigation";
import {cn} from "@/lib/utils";


export function LanguageSwitcher({className, compact = false}: {className?: string; compact?: boolean}) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [displayedLocale, setDisplayedLocale] = useOptimistic(locale);
  const transitionTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (document.documentElement.dataset.localeTransitionTo !== locale) return;

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        delete document.documentElement.dataset.localeTransitionTo;
      });
    });

    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [locale]);

  function changeLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale || isPending) return;

    const query = searchParams.toString();
    const hash = window.location.hash;
    const destination = pathname + (query ? `?${query}` : "") + hash;

    document.documentElement.setAttribute("data-locale-transition-to", nextLocale);
    transitionTimeout.current = window.setTimeout(() => {
      if (document.documentElement.dataset.localeTransitionTo === nextLocale) delete document.documentElement.dataset.localeTransitionTo;
    }, 10_000);
    startTransition(() => {
      setDisplayedLocale(nextLocale);
      router.replace(destination, {locale: nextLocale, scroll: false});
    });
  }

  return (
    <div className={cn("relative inline-grid grid-cols-2 items-center rounded-full border border-current/15 bg-background/80 p-1 text-xs font-semibold shadow-sm backdrop-blur", className)} role="group" aria-label={t("changeLanguage")} aria-busy={isPending} data-pending={isPending || undefined}>
      <span className="sr-only" aria-live="polite">{isPending ? t("switchingLanguage") : ""}</span>
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none", displayedLocale === "en" && "translate-x-full")}
      />
      {(["fr", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value} aria-label={t(value === "fr" ? "switchToFrench" : "switchToEnglish")} aria-pressed={displayedLocale === value} disabled={isPending} onClick={() => changeLocale(value)}
          className={cn("relative z-10 min-h-9 rounded-full px-3 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait", displayedLocale === value ? "text-primary-foreground" : "text-foreground hover:bg-muted", compact && "min-h-8 px-2.5")}>
          {compact ? value.toUpperCase() : t(value === "fr" ? "french" : "english")}
        </button>
      ))}
    </div>
  );
}