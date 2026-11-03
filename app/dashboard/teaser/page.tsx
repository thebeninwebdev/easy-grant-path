import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Landmark, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatFunding, humanize } from "@/components/admin/opportunities/opportunity-formatters";
import { getRegistrationOpportunity } from "@/lib/registration-opportunity";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { redirect } from "next/navigation";

export const instant = false;

export default async function TeaserPage() {
  const profile = await getDevelopmentProfile();
  if (!isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (hasActiveAccess(profile)) redirect("/dashboard");

  const match = await getRegistrationOpportunity(profile!);
  const opportunity = match.opportunity;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full rounded-3xl border bg-card p-5 shadow-sm sm:p-9">
        <header className="flex items-center justify-between gap-4">
          <Image src="/logo.png" alt="EasyGrantPath" width={154} height={52} className="h-auto w-32" priority />
          <span className="text-xs font-medium text-muted-foreground">Step 3 of 3</span>
        </header>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-full rounded-full bg-primary" /></div>

        {!opportunity ? (
          <div className="py-12 text-center">
            <ShieldCheck className="mx-auto size-11 text-primary" />
            <h1 className="mt-5 text-3xl font-semibold">Your profile is complete</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">There is no verified match to preview yet. Activate your account to see new opportunities as they are reviewed.</p>
            <Button asChild className="mt-7"><Link href="/dashboard/activate">Unlock EasyGrantPath</Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-3xl font-semibold tracking-tight">{match.strong ? "A matching opportunity for you" : "A current opportunity preview"}</h1>
              <p className="mt-2 text-muted-foreground">{match.strong ? "Here is one real opportunity based on your profile. Unlock full details and the remaining verified opportunities." : "Here is one current opportunity from an official source. Unlock access as more opportunities are reviewed and matched to your profile."}</p>
            </div>

            <article className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-primary p-5 text-white sm:p-7">
                <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10 blur-2xl" />
                <Badge className="relative bg-white/90 text-foreground hover:bg-white">{humanize(opportunity.type)}</Badge>
                <h2 className="relative mt-5 max-w-2xl text-2xl font-semibold">{opportunity.title}</h2>
              </div>
              <div className="p-5 sm:p-7">
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Landmark className="size-4" />{opportunity.organization || "Funding organization"}</p>
                <div className="mt-5 grid gap-4 border-y py-5 sm:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Funding</p><p className="mt-1 font-semibold">{formatFunding(opportunity)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{formatDate(opportunity.deadline)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Eligibility</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><MapPin className="size-4" />{opportunity.countries.slice(0, 2).join(", ") || "See details"}</p></div>
                </div>
                <p className="mt-5 line-clamp-3 leading-7 text-muted-foreground">{opportunity.summary || "A verified funding opportunity selected for your profile."}</p>

                <div className="relative mt-5 overflow-hidden rounded-2xl border bg-muted/35 p-5">
                  <div className="space-y-3 blur-[5px] select-none" aria-hidden="true"><div className="h-3 w-full rounded bg-muted-foreground/30" /><div className="h-3 w-11/12 rounded bg-muted-foreground/30" /><div className="h-3 w-4/5 rounded bg-muted-foreground/30" /></div>
                  <div className="absolute inset-0 flex items-center justify-center bg-card/70 text-center backdrop-blur-[1px]"><div><LockKeyhole className="mx-auto size-5 text-primary" /><p className="mt-2 text-sm font-medium">Full eligibility, requirements, and application details are locked.</p></div></div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="outline" className="sm:flex-1"><Link href={`/dashboard/opportunities/${opportunity.slug}`}>View basic details</Link></Button>
                  <Button asChild className="sm:flex-1"><Link href="/dashboard/activate"><LockKeyhole className="size-4" /> Unlock full access</Link></Button>
                </div>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" /> {opportunity.verified ? "Verified source reviewed by EasyGrantPath" : "Official source · EasyGrantPath review pending"}</p>
              </div>
            </article>
          </>
        )}
      </section>
    </main>
  );
}