import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-recovery-form";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Auth.resetPassword"); return { title: t("meta") }; }
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Auth.resetPassword")]);
  const token = typeof params.token === "string" ? params.token : undefined;
  const invalid = params.error === "INVALID_TOKEN";
  return <AuthShell title={t("title")} description={t("description")}><ResetPasswordForm token={token} invalid={invalid} /></AuthShell>;
}
