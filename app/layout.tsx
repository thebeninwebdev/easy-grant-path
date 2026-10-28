import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { appConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = { title: { default: appConfig.name, template: `%s | ${appConfig.name}` }, description: appConfig.description };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">{children}<Toaster richColors /></body>
    </html>
  );
}
