import Link from "next/link";
import { Check, CreditCard, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { redirect } from "next/navigation";

export const instant = false;
export default async function ActivatePage() {
  const profile = await getDevelopmentProfile();
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (hasActiveAccess(profile)) redirect("/dashboard");
  const configured = Boolean(appConfig.platformAccess.provider && appConfig.platformAccess.price !== null);
  return <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-10"><section className="w-full rounded-3xl border bg-card p-7 shadow-sm sm:p-10"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-6" /></span><h1 className="mt-6 text-3xl font-semibold tracking-tight">Unlock full access</h1><p className="mt-3 text-muted-foreground">Continue from the opportunity preview with everything you need to assess and apply for funding.</p><ul className="mt-7 space-y-3 text-sm">{["Full opportunity details", "Eligibility and requirements", "Current and future opportunities", "Save opportunities and track applications", "Proposal workspace and templates"].map((benefit) => <li key={benefit} className="flex gap-3"><Check className="mt-0.5 size-4 text-primary" />{benefit}</li>)}</ul><p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Optional expert review and application assistance are available separately.</p>{configured ? <Button className="mt-7 w-full"><CreditCard className="size-4" />Continue to payment</Button> : <div className="mt-7 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">Payments are not configured yet.</p><p className="mt-1">Your completed registration is saved. Payment activation will be connected to a server-verified provider before access can be granted.</p></div>}<Button asChild variant="ghost" className="mt-4 w-full"><Link href="/dashboard/teaser">Back to opportunity preview</Link></Button></section></main>;
}
