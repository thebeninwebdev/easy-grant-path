import type {MetadataRoute} from "next";

const localizedRoutes = ["", "/contact", "/sign-in", "/sign-up", "/forgot-password"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://easygrantpath.com").replace(/\/$/, "");
  return localizedRoutes.flatMap((path) => {
    const fr = `${base}${path || "/"}`;
    const en = `${base}/en${path}`;
    const languages = {fr, en, "x-default": fr};
    return [
      {url: fr, changeFrequency: path ? "monthly" : "weekly", priority: path ? 0.7 : 1, alternates: {languages}},
      {url: en, changeFrequency: path ? "monthly" : "weekly", priority: path ? 0.7 : 0.9, alternates: {languages}}
    ];
  });
}