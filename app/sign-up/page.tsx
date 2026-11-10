import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { getCurrentSession } from "@/lib/development-user";
import { localizedPath } from "@/i18n/paths";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Auth.signUp"); return { title: t("meta") }; }
export default async function SignUpPage() {
  const [locale, t] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Auth.signUp")]);
  const destination = authenticatedDestination(await getCurrentSession());
  if (destination) redirect(localizedPath(destination, locale));
  return <AuthShell title={t("title")} description={t("description")}><AuthForm mode="sign-up" /></AuthShell>;
}
