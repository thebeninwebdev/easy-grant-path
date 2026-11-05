import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { SubscriptionCheckout } from "@/components/payments/subscription-checkout";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { formatPaymentAmount } from "@/lib/payment-products";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
export const instant = false;
export default async function ActivatePage() {
  const profile = await getDevelopmentProfile(); if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding"); if (hasActiveAccess(profile)) redirect("/dashboard");
  const plan = appConfig.platformAccess; const configured = getFlutterwaveConfig().enabled && plan.provider === "flutterwave" && Number.isSafeInteger(plan.price) && Number(plan.price) > 0 && Number.isSafeInteger(plan.durationDays) && Number(plan.durationDays) > 0;
  const label = configured ? `Pay ${formatPaymentAmount(Number(plan.price), plan.currency)} for ${plan.durationDays} days` : "Continue to payment";
  return <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-10"><section className="w-full rounded-3xl border bg-card p-7 shadow-sm sm:p-10"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-6" /></span><h1 className="mt-6 text-3xl font-semibold tracking-tight">Unlock full access</h1><p className="mt-3 text-muted-foreground">Continue from the opportunity preview with everything you need to assess and apply for funding.</p><ul className="mt-7 space-y-3 text-sm">{["Full opportunity details", "Eligibility and requirements", "Current and future opportunities", "Save opportunities and track applications", "Proposal workspace and templates"].map((benefit) => <li key={benefit} className="flex gap-3"><Check className="mt-0.5 size-4 text-primary" />{benefit}</li>)}</ul><p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Optional expert review and application assistance are available separately.</p>{configured ? <SubscriptionCheckout label={label} /> : <div className="mt-7 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">Subscription payments are not configured yet.</p><p className="mt-1">An approved price and duration plus environment-appropriate Flutterwave credentials are required before access can be sold.</p></div>}<Button asChild variant="ghost" className="mt-4 w-full"><Link href="/dashboard/teaser">Back to opportunity preview</Link></Button></section></main>;
}