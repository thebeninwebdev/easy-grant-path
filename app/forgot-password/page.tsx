import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-recovery-form";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Auth.forgotPassword"); return { title: t("meta") }; }
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Auth.forgotPassword")]);
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";
  return <AuthShell title={t("title")} description={t("description")}><ForgotPasswordForm initialEmail={email} /></AuthShell>;
}
