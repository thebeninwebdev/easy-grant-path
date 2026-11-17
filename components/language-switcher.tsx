"use client";

import {useLocale, useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState, useTransition} from "react";
import type {SupportedLocale} from "@/lib/config";
import {usePathname, useRouter} from "@/i18n/navigation";
import {storeLocaleHash} from "@/i18n/client-locale-transition";
import {cn} from "@/lib/utils";

const navigationTimeoutMs = 12_000;
export function LanguageSwitcher({className, compact = false}: {className?: string; compact?: boolean}) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingLocale, setPendingLocale] = useState<SupportedLocale | null>(null);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const pendingLocaleRef = useRef<SupportedLocale | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const isPending = pendingLocale !== null && pendingLocale !== locale;

  useEffect(() => {
    setMounted(true);
    if (switcherRef.current) switcherRef.current.dataset.ready = "true";
  }, []);

  useEffect(() => {
    if (pendingLocaleRef.current !== locale) return;
    pendingLocaleRef.current = null;
    setPendingLocale(null);
    setFailed(false);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, [locale]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const changeLocale = useCallback((nextLocale: SupportedLocale) => {
    if (nextLocale === locale || pendingLocaleRef.current) return;

    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const hash = window.location.hash;
    const destination = pathname + (query ? `?${query}` : "") + hash;

    pendingLocaleRef.current = nextLocale;
    storeLocaleHash(nextLocale, hash);
    setPendingLocale(nextLocale);
    setFailed(false);
    timeoutRef.current = window.setTimeout(() => {
      if (pendingLocaleRef.current !== nextLocale) return;
      pendingLocaleRef.current = null;
      setPendingLocale(null);
      setFailed(true);
    }, navigationTimeoutMs);
    startTransition(() => {
      router.replace(destination, {locale: nextLocale, scroll: false});
    });
  }, [locale, pathname, router]);

  return (
    <div
      ref={switcherRef}
      className={cn("inline-grid h-9 w-[6.75rem] shrink-0 grid-cols-2 items-stretch rounded-full border border-black/15 bg-white/95 p-0.5 text-[0.6875rem] font-bold tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur-sm", compact && "h-8 w-[6.25rem]", className)}
      role="group"
      aria-label={t("changeLanguage")}
      aria-busy={isPending}
      data-language-switcher="true"
      data-ready={mounted ? "true" : undefined}
      data-pending={isPending || undefined}
    >
      <span className="sr-only" aria-live="polite">{isPending ? t("switchingLanguage") : failed ? t("languageSwitchFailed") : ""}</span>
      {(["fr", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-label={t(value === "fr" ? "switchToFrench" : "switchToEnglish")}
          aria-pressed={locale === value}
          disabled={isPending}
          onClick={() => changeLocale(value)}
          className={cn(
            "relative flex min-w-0 items-center justify-center rounded-full px-2 transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none disabled:cursor-wait disabled:opacity-80",
            locale === value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-slate-100 hover:text-slate-950",
            isPending && pendingLocale === value && "after:absolute after:bottom-1 after:size-1 after:animate-pulse after:rounded-full after:bg-current motion-reduce:after:animate-none"
          )}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
