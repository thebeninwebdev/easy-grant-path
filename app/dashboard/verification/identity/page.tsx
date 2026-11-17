import { Check, Clock3, ShieldCheck, UserCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IdentityVerificationForm } from "@/components/verification/verification-form";
import { formatDate } from "@/lib/i18n-format";
import { getIdentityVerification } from "@/lib/verification";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";

export const instant = false;

export default async function IdentityPage() {
  const [item, profile, t, locale] = await Promise.all([
    getIdentityVerification(),
    getDevelopmentProfile(),
    getTranslations("Verification.identity"),
    getLocale(),
  ]);
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");

  const status = item?.verificationStatus || "unverified";
  const continueHref = hasActiveAccess(profile) ? "/dashboard" : "/dashboard/teaser";
  const steps = ["account", "profile", "identity", "access"] as const;

  return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
    <section aria-label={t("progress.label")} className="mb-6 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-primary">{t("progress.kicker")}</p><p className="text-xs text-muted-foreground">{t("progress.current")}</p></div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {steps.map((step, index) => <div key={step} className="min-w-0"><div className={`h-1.5 rounded-full ${index <= 2 ? "bg-primary" : "bg-muted"}`} /><p className={`mt-2 truncate text-[11px] sm:text-xs ${index === 2 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{t(`progress.steps.${step}`)}</p></div>)}
      </div>
    </section>

    <Card className="overflow-hidden shadow-sm">
      <div className="border-b bg-primary/[0.04] px-6 py-7 sm:px-8"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 max-w-xl leading-7 text-muted-foreground">{t("description")}</p><p className="mt-3 text-sm font-medium text-foreground">{t("approvalRequired")}</p></div>
      <CardContent className="p-6 sm:p-8">
        {status === "pending" ? <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950"><Clock3 className="size-6" /><h2 className="mt-3 text-lg font-semibold">{t("statuses.pending.title")}</h2><p className="mt-2 text-sm leading-6 text-blue-900">{t("statuses.pending.description", { date: item?.submittedAt ? formatDate(item.submittedAt, locale) : t("recently") })}</p><p className="mt-3 text-sm font-medium">{t("statuses.pending.accessLocked")}</p></section> : null}
        {status === "verified" ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><UserCheck className="size-7" /><h2 className="mt-3 text-lg font-semibold">{t("statuses.verified.title")}</h2><p className="mt-2 text-sm leading-6 text-emerald-800">{t("statuses.verified.description")}</p><Button asChild className="mt-5"><Link href={continueHref}>{t("continueButton")}</Link></Button></section> : null}
        {status === "provisional" ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><Clock3 className="size-6" /><h2 className="mt-3 text-lg font-semibold">{t("statuses.provisional.title")}</h2><p className="mt-2 text-sm leading-6">{t("statuses.provisional.description")}</p></section> : null}
        {status === "action_required" ? <section><div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-semibold">{t("statuses.actionRequired.title")}</h2><p className="mt-2 text-sm leading-6">{item?.reviewNote || item?.rejectionReason || t("statuses.actionRequired.defaultNote")}</p></div><IdentityVerificationForm /></section> : null}
        {status === "rejected" ? <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950"><h2 className="font-semibold">{t("statuses.rejected.title")}</h2><p className="mt-2 text-sm leading-6">{item?.rejectionReason || t("statuses.rejected.defaultReason")}</p><a className="mt-4 inline-block text-sm font-semibold underline underline-offset-4" href="mailto:support@easygrantpath.com">{t("statuses.rejected.contactSupport")}</a></section> : null}
        {status === "unverified" ? <div><div className="mb-6 rounded-2xl border bg-muted/35 p-5"><h2 className="font-semibold">{t("instructions.title")}</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{(["valid", "clear", "private"] as const).map((key) => <li className="flex gap-2" key={key}><Check className="mt-0.5 size-4 shrink-0 text-primary" />{t(`instructions.${key}`)}</li>)}</ul></div><IdentityVerificationForm /></div> : null}
      </CardContent>
    </Card>
    {status !== "verified" ? <p className="mt-5 text-center text-sm text-muted-foreground">{t("supportPrompt")} <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@easygrantpath.com">{t("supportLink")}</a></p> : null}
  </main>;
}
