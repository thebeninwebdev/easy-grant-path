"use client";

import { useEffect } from "react";
import type { SupportedLocale } from "@/lib/config";
import { restoreLocaleHash } from "@/i18n/client-locale-transition";

export function LocaleDocument({ locale }: { locale: SupportedLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    const frame = requestAnimationFrame(() => restoreLocaleHash(locale));
    return () => cancelAnimationFrame(frame);
  }, [locale]);
  return null;
}
