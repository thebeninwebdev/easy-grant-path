export const appConfig = {
  name: "EasyGrantPath",
  description: "EasyGrantPath helps individuals, startups, NGOs, and organizations discover suitable funding opportunities and provides professional application-support services.",
  defaultLocale: "en",
  supportedLocales: ["en", "fr"],
  currency: "XOF",
  region: "West Africa",
} as const;

export type SupportedLocale = (typeof appConfig.supportedLocales)[number];
