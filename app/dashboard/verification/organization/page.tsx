import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationVerificationForm } from "@/components/verification/verification-form";
import { organizationRegistrationLabel } from "@/lib/document-labels";
import { formatDate } from "@/lib/i18n-format";
import { getOrganizationVerification } from "@/lib/verification";

export const instant = false;

export default async function OrganizationPage() {
  const [{ profile }, t, locale] = await Promise.all([
    getOrganizationVerification(),
    getTranslations("Verification.organization"),
    getLocale(),
  ]);
  const status = profile?.verificationStatus || "unverified";
  const registrationStatus = profile?.registrationStatus || "not_registered";
  const form = <OrganizationVerificationForm registrationStatus={registrationStatus} registrationLabel={organizationRegistrationLabel(profile?.countryCode)} />;

  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">{t("backToDashboard")}</Link>
    <Card className="mt-6"><CardContent className="p-6 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      {status === "pending" ? <section className="mt-6"><p className="font-medium text-primary">{t("statuses.pending.title")}</p><p className="mt-1 text-sm text-muted-foreground">{t("statuses.pending.description", { date: profile?.verificationSubmittedAt ? formatDate(profile.verificationSubmittedAt, locale) : t("recently") })}</p></section> : null}
      {status === "verified" ? <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-semibold text-emerald-800">{t("statuses.verified.title")}</p><p className="mt-1 text-sm text-emerald-700">{t("statuses.verified.description")}</p></section> : null}
      {status === "provisional" ? <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="font-semibold text-blue-900">{t("statuses.provisional.title")}</p><p className="mt-1 text-sm text-blue-800">{t("statuses.provisional.description")}</p></section> : null}
      {status === "action_required" ? <section className="mt-6"><div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">{t("statuses.actionRequired.title")}</p><p className="mt-1 text-sm text-amber-800">{profile?.reviewNote || profile?.rejectionReason || t("statuses.actionRequired.defaultNote")}</p></div>{form}</section> : null}
      {status === "rejected" ? <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"><p className="font-semibold text-red-900">{t("statuses.rejected.title")}</p><p className="mt-1 text-sm text-red-800">{profile?.rejectionReason || t("statuses.rejected.defaultReason")}</p><a className="mt-3 inline-block text-sm font-medium underline" href="mailto:support@easygrantpath.com">{t("statuses.rejected.contactSupport")}</a></section> : null}
      {status === "unverified" ? <div className="mt-6">{form}</div> : null}
    </CardContent></Card>
  </main>;
}
