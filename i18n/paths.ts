import type { SupportedLocale } from "@/lib/config";

export function localizedPath(path: string, locale: SupportedLocale) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const clean = path.replace(/^\/(?:fr|en)(?=\/|$)/, "") || "/";
  return locale === "en" ? "/en" + (clean === "/" ? "" : clean) : clean;
}
