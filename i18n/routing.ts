import { defineRouting } from "next-intl/routing";
import { appConfig } from "@/lib/config";

export const routing = defineRouting({
  locales: appConfig.supportedLocales,
  defaultLocale: appConfig.defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});