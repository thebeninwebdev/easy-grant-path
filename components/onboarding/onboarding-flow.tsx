"use client";

import { Building2, Check, ChevronDown, HandHeart, MapPin, UserRound } from "lucide-react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const accountTypes = [
  ["individual", "Individual", "I'm applying for opportunities as a person.", UserRound],
  ["startup_sme", "Business", "I represent a for-profit business or social enterprise.", Building2],
  ["ngo_nonprofit", "NGO / Nonprofit", "I represent a nonprofit, charity, or civil society organization.", HandHeart],
] as const;

const interests = [
  ["agriculture", "Agriculture"],
  ["climate", "Climate / Environment"],
  ["education", "Education"],
  ["entrepreneurship", "Entrepreneurship / SME"],
  ["health", "Health"],
  ["technology", "Technology / Innovation"],
  ["women_girls", "Women and Girls"],
  ["youth", "Youth Development"],
  ["community_development", "Community Development"],
  ["research", "Research / Other"],
] as const;

const opportunityTypes = [
  ["grant", "Grants"],
  ["fellowship", "Fellowships"],
  ["scholarship", "Scholarships"],
  ["accelerator", "Training / Accelerators"],
  ["other", "Other"],
] as const;

const countries = [
  ["CI", "Cote d'Ivoire"], ["BJ", "Benin"], ["BF", "Burkina Faso"], ["GH", "Ghana"],
  ["GN", "Guinea"], ["ML", "Mali"], ["NE", "Niger"], ["NG", "Nigeria"],
  ["SN", "Senegal"], ["TG", "Togo"], ["CM", "Cameroon"], ["KE", "Kenya"], ["ZA", "South Africa"],
] as const;

type Profile = {
  fullName: string;
  applicantType: string;
  countryCode: string;
  interests: string[];
  opportunityTypes: string[];
};

export function OnboardingFlow({ profile, accountName }: { profile: Profile | null; accountName: string }) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(profile?.applicantType ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initialOrganization = profile && ["startup_sme", "ngo_nonprofit"].includes(profile.applicantType) ? profile.fullName : "";
  const [form, setForm] = useState({
    organizationName: initialOrganization,
    applicantType: profile?.applicantType || "",
    countryCode: profile?.countryCode || "",
    interest: profile?.interests[0] || "",
    opportunityType: profile?.opportunityTypes[0] || "",
  });
  const isOrganization = form.applicantType === "startup_sme" || form.applicantType === "ngo_nonprofit";

  async function save(payload: object) {
    const response = await fetch("/api/profile/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error((await response.json().catch(() => null))?.error?.message || t("errors.saveFailed"));
    }
  }

  async function saveOrganization() {
    const response = await fetch("/api/organization-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationType: form.applicantType, name: form.organizationName.trim(), countryCode: form.countryCode, registrationStatus: "not_registered" }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error?.message || t("flow.organizationFailed"));
  }

  async function continueFlow() {
    setError("");
    if (step === 1 && !form.applicantType) return setError(t("errors.selectAccountType"));
    if (step === 2 && isOrganization && form.organizationName.trim().length < 2) return setError(t("errors.enterOrgName"));
    if (step === 2 && (!form.countryCode || !form.interest || !form.opportunityType)) return setError(t("flow.completeChoices"));

    setSaving(true);
    try {
      if (step === 1) {
        await save({ applicantType: form.applicantType, onboardingCompleted: false, onboardingSkipped: false });
        setStep(2);
      } else {
        if (isOrganization) await saveOrganization();
        await save({
          fullName: accountName.trim() || undefined,
          countryCode: form.countryCode,
          interests: [form.interest],
          opportunityTypes: [form.opportunityType],
          onboardingCompleted: true,
          onboardingSkipped: false,
        });
        router.push("/dashboard/teaser");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("flow.registrationFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full rounded-3xl border bg-card p-5 shadow-sm sm:p-9">
        <header className="flex items-center justify-between gap-4">
          <Image src="/logo.png" alt="EasyGrantPath" width={154} height={52} className="h-auto w-32" priority />
          <span className="text-xs font-medium text-muted-foreground">{t("flow.step", {step})}</span>
        </header>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step / 3 * 100}%` }} />
        </div>

        {step === 1 ? (
          <section className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">{t("flow.question")}</h1>
            <p className="mt-2 text-muted-foreground">{t("flow.questionDesc")}</p>
            <div className="mt-6 grid gap-3">
              {accountTypes.map(([value, , , Icon]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setForm((current) => ({ ...current, applicantType: value }))}
                  className={`relative flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${form.applicantType === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                  <span className="pr-7"><span className="block font-semibold">{t(`accountTypes.${value}`)}</span><span className="mt-1 block text-sm text-muted-foreground">{t(`flow.${value}Desc`)}</span></span>
                  <span className={`absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border ${form.applicantType === value ? "border-primary bg-primary text-primary-foreground" : ""}`}>{form.applicantType === value ? <Check className="size-3.5" /> : null}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">{t("flow.details")}</h1>
            <p className="mt-2 text-muted-foreground">Just 2–3 things so we can show you relevant opportunities.</p>

            {isOrganization ? (
              <label className="mt-6 block text-sm font-medium">
                {form.applicantType === "startup_sme" ? t("flow.businessName") : t("flow.organizationName")} <span className="text-destructive">*</span>
                <Input required value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))} className="mt-2 h-11" />
              </label>
            ) : null}

            <label className="mt-5 block text-sm font-medium">
              Country <span className="text-destructive">*</span>
              <span className="relative mt-2 block">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select className="h-11 w-full appearance-none rounded-md border bg-background py-1 pl-10 pr-10 text-sm" value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value }))}>
                  <option value="">{t("flow.selectCountry")}</option>
                  {countries.map(([code]) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>

            <label className="mt-5 block text-sm font-medium">
              Primary sector / area of interest <span className="text-destructive">*</span>
              <span className="relative mt-2 block">
                <select className="h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-sm" value={form.interest} onChange={(event) => setForm((current) => ({ ...current, interest: event.target.value }))}>
                  <option value="">{t("flow.selectInterest")}</option>
                  {interests.map(([value]) => <option key={value} value={value}>{t(`interests.${value}`)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>

            <p className="mt-5 text-sm font-medium">{t("flow.preferredType")} <span className="text-destructive">*</span></p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {opportunityTypes.map(([value]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setForm((current) => ({ ...current, opportunityType: value }))}
                  className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-sm font-medium ${form.opportunityType === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50"}`}
                >
                  {t(`opportunityTypes.${value}`)}{form.opportunityType === value ? <Check className="size-4" /> : null}
                </button>
              ))}
            </div>
          </section>
        )}

        {error ? <p role="alert" className="mt-5 text-sm text-destructive">{error}</p> : null}
        <footer className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={step === 1 || saving} onClick={() => setStep(1)}>{t("flow.back")}</Button>
          <Button className="min-w-36" disabled={saving} onClick={() => void continueFlow()}>{saving ? t("flow.saving") : step === 1 ? t("flow.continue") : t("flow.seeMatch")}</Button>
        </footer>
      </div>
    </main>
  );
}
