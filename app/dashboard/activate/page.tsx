import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SubscriptionCheckout } from "@/components/payments/subscription-checkout";
import { getPaymentProduct, formatPaymentAmount } from "@/lib/payment-products";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import type { SupportedLocale } from "@/lib/config";
export const instant = false;
export default async function ActivatePage() {
  const [profile, locale, t] = await Promise.all([getDevelopmentProfile(), getLocale() as Promise<SupportedLocale>, getTranslations("Payments.activate")]);
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (hasActiveAccess(profile)) redirect("/dashboard");
  const plan = getPaymentProduct("platform_access");
  const label = plan ? t("payForDays", { price: formatPaymentAmount(plan.amountMinor, plan.currency, locale), days: plan.durationDays ?? 0 }) : t("continuePayment");
  const benefits = ["details","eligibility","future","saving","proposals"] as const;
  return <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-10"><section className="w-full rounded-3xl border bg-card p-7 shadow-sm sm:p-10"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-6" /></span><h1 className="mt-6 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("description")}</p><ul className="mt-7 space-y-3 text-sm">{benefits.map((benefit) => <li key={benefit} className="flex gap-3"><Check className="mt-0.5 size-4 text-primary" />{t(("benefits." + benefit) as never)}</li>)}</ul>{plan ? <SubscriptionCheckout label={label} /> : <div className="mt-7 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{t("notConfiguredTitle")}</p><p className="mt-1">{t("notConfiguredDescription")}</p></div>}<Button asChild variant="ghost" className="mt-4 w-full"><Link href="/dashboard/teaser">{t("backToPreview")}</Link></Button></section></main>;
}
