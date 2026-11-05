import { notFound } from "next/navigation";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
import { ProposalApplication } from "@/models/ProposalApplication";
import { SavedOpportunity } from "@/models/SavedOpportunity";
import { CustomerActions } from "@/components/admin/customers/customer-actions";
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params; const db = await connectToDatabase();
  const [profile, user, applications, saved] = await Promise.all([
    UserProfile.findOne({ userId: id }).lean(), db.connection.db!.collection("user").findOne({ id }),
    ProposalApplication.countDocuments({ userId: id }), SavedOpportunity.countDocuments({ userId: id }),
  ]);
  if (!profile) notFound();
  return <div className="space-y-6"><header><p className="text-sm text-primary">Customer record</p><h1 className="text-3xl font-semibold">{user?.name || profile.fullName || "Unnamed customer"}</h1><p className="mt-1 text-muted-foreground">{user?.email || id}</p></header>
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><section className="rounded-xl border bg-background p-6"><h2 className="font-semibold">Profile</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><Field label="Applicant type" value={profile.applicantType} /><Field label="Country" value={profile.countryCode} /><Field label="Access" value={profile.accessStatus} /><Field label="Account" value={profile.accountStatus} /><Field label="Saved opportunities" value={saved} /><Field label="Proposal applications" value={applications} /><Field label="Joined" value={new Date(profile.createdAt).toLocaleString()} /><Field label="Last activity" value={profile.lastActivityAt ? new Date(profile.lastActivityAt).toLocaleString() : "Not recorded"} /></dl></section>
      <aside className="rounded-xl border bg-background p-6"><CustomerActions userId={id} status={profile.accountStatus} notes={profile.adminNotes} /></aside></div>
  </div>;
}
function Field({ label, value }: { label: string; value: unknown }) { return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{String(value || "-")}</dd></div>; }
