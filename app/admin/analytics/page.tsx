import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
import { Opportunity } from "@/models/Opportunity";
import { ProposalApplication } from "@/models/ProposalApplication";
export default async function AnalyticsPage() {
  await connection();
  await connectToDatabase();
  const [countries, applicants, opportunityTypes, applicationStatus] = await Promise.all([
    UserProfile.aggregate([{ $match: { countryCode: { $type: "string" } } }, { $group: { _id: "$countryCode", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    UserProfile.aggregate([{ $group: { _id: { $ifNull: ["$applicantType", "unknown"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Opportunity.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ProposalApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return <div className="space-y-6"><header><h1 className="text-3xl font-semibold">Analytics</h1><p className="mt-1 text-muted-foreground">Auditable counts from current platform records.</p></header>
    <div className="grid gap-5 md:grid-cols-2"><Breakdown title="Customers by country" rows={countries} /><Breakdown title="Applicant types" rows={applicants} /><Breakdown title="Opportunity types" rows={opportunityTypes} /><Breakdown title="Application status" rows={applicationStatus} /></div>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-medium">Financial analytics unavailable</p><p className="mt-1">Revenue, refunds, MRR, and conversion cannot be calculated safely because no payment provider or transaction ledger is configured.</p></div>
  </div>;
}
function Breakdown({ title, rows }: { title: string; rows: Array<{ _id: string; count: number }> }) { const max = Math.max(1, ...rows.map((r) => r.count)); return <section className="rounded-xl border bg-background p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => <div key={String(row._id)}><div className="flex justify-between text-sm"><span>{row._id || "Unknown"}</span><strong>{row.count}</strong></div><div className="mt-1 h-2 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${(row.count / max) * 100}%` }} /></div></div>)}{!rows.length && <p className="text-sm text-muted-foreground">No data yet.</p>}</div></section>; }
