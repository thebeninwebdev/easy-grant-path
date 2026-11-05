import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationVerificationForm } from "@/components/verification/verification-form";
import { getOrganizationVerification } from "@/lib/verification";
import { organizationRegistrationLabel } from "@/lib/document-labels";
export const instant = false;
export default async function OrganizationPage() {
  const { profile } = await getOrganizationVerification(); const status = profile?.verificationStatus || "unverified";
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">Back to opportunities</Link>
    <Card className="mt-6"><CardContent className="p-6 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Verify your organization</h1>
      <p className="mt-2 text-muted-foreground">Submit the documents required for your organization&apos;s registration stage.</p>
      {status === "pending" ? <section className="mt-6"><p className="font-medium text-primary">Verification under review</p><p className="mt-1 text-sm text-muted-foreground">Submitted {profile?.verificationSubmittedAt ? new Date(profile.verificationSubmittedAt).toLocaleDateString("en-NG") : "recently"}. Uploads are locked until review is complete.</p></section> : null}
      {status === "verified" ? <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-semibold text-emerald-800">Organization verified</p><p className="mt-1 text-sm text-emerald-700">Registration and representative documents were approved.</p></section> : null}
      {status === "provisional" ? <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="font-semibold text-blue-900">Provisionally reviewed</p><p className="mt-1 text-sm text-blue-800">The representative was reviewed. Full registration verification requires the completed registration document.</p></section> : null}
      {status === "action_required" ? <section className="mt-6"><div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Changes requested</p><p className="mt-1 text-sm text-amber-800">{profile?.reviewNote || profile?.rejectionReason || "Please replace the requested documents."}</p></div><OrganizationVerificationForm registrationStatus={profile?.registrationStatus || "not_registered"} registrationLabel={organizationRegistrationLabel(profile?.countryCode)} /></section> : null}
      {status === "rejected" ? <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"><p className="font-semibold text-red-900">Verification was not approved</p><p className="mt-1 text-sm text-red-800">{profile?.rejectionReason || "Contact support for available next steps."}</p><a className="mt-3 inline-block text-sm font-medium underline" href="mailto:support@easygrantpath.com">Contact support</a></section> : null}
      {status === "unverified" ? <div className="mt-6"><OrganizationVerificationForm registrationStatus={profile?.registrationStatus || "not_registered"} registrationLabel={organizationRegistrationLabel(profile?.countryCode)} /></div> : null}
    </CardContent></Card>
  </main>;
}
