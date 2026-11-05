import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { IdentityVerificationForm } from "@/components/verification/verification-form";
import { getIdentityVerification } from "@/lib/verification";
export const instant = false;
export default async function IdentityPage() {
  const item = await getIdentityVerification(); const status = item?.verificationStatus || "unverified";
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">Back to opportunities</Link>
    <Card className="mt-6"><CardContent className="p-6 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Verify your identity</h1>
      <p className="mt-2 text-muted-foreground">Upload one government-issued ID so an authorized reviewer can confirm your identity.</p>
      <p className="mt-4 rounded-lg bg-muted p-3 text-sm">Opportunity discovery and ordinary proposal drafting remain available while review is pending.</p>
      {status === "pending" ? <section className="mt-6" aria-live="polite"><p className="font-medium text-primary">Verification under review</p><p className="mt-1 text-sm text-muted-foreground">Submitted {item?.submittedAt ? new Date(item.submittedAt).toLocaleDateString("en-NG") : "recently"}. Duplicate submissions are disabled while review is active.</p></section> : null}
      {status === "verified" ? <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-semibold text-emerald-800">Identity verified</p><p className="mt-1 text-sm text-emerald-700">No further action is required.</p></section> : null}
      {status === "action_required" ? <section className="mt-6"><div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Changes requested</p><p className="mt-1 text-sm text-amber-800">{item?.reviewNote || item?.rejectionReason || "Please upload a clearer or corrected document."}</p></div><IdentityVerificationForm /></section> : null}
      {status === "rejected" ? <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"><p className="font-semibold text-red-900">Verification was not approved</p><p className="mt-1 text-sm text-red-800">{item?.rejectionReason || "Contact support if you believe this decision should be reviewed."}</p><a className="mt-3 inline-block text-sm font-medium underline" href="mailto:support@easygrantpath.com">Contact support</a></section> : null}
      {status === "unverified" ? <div className="mt-6"><IdentityVerificationForm /></div> : null}
    </CardContent></Card>
  </main>;
}
