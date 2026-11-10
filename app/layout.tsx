import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { appConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = { title: { default: appConfig.name, template: `%s | ${appConfig.name}` }, description: appConfig.description };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground"><NextIntlClientProvider messages={messages}>{children}<Toaster richColors /></NextIntlClientProvider></body>
    </html>
  );
}
