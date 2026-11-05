import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getAdminDashboard } from "@/lib/admin-dashboard";
export const metadata: Metadata = { title: "Admin overview" };
const format = new Intl.NumberFormat("en");
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await connection();
  const query = await searchParams;
  const days = [7, 30, 90].includes(Number(query.days)) ? Number(query.days) : 30;
  const data = await getAdminDashboard(days);
  const cards = [
    ["Customers", data.metrics.customers, `+${data.metrics.newCustomers} this month`, "/admin/customers"],
    ["Active access", data.metrics.activeAccess, "Recorded account access", "/admin/customers?access=active"],
    ["Published opportunities", data.metrics.published, "Verified and public", "/admin/opportunities?status=published"],
    ["Needs review", data.metrics.needsReview, "Opportunity review queue", "/admin/opportunities?verificationStatus=needs_review"],
    ["Applications", data.metrics.applications, "Proposal workspaces", "/admin/analytics"],
    ["Paid service requests", data.metrics.paidServiceRequests, "Paid writing and review requests", "/admin/service-requests"],
    ["Successful payments", data.metrics.successfulPayments, "Test and live ledger", "/admin/payments?status=successful"],
  ] as const;
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-primary">Operations</p><h1 className="text-3xl font-semibold tracking-tight">Admin overview</h1><p className="mt-1 text-muted-foreground">Live platform health and queues requiring action.</p></div>
      <div className="flex rounded-md border bg-background p-1">{[7, 30, 90].map((value) => <Link key={value} href={`/admin?days=${value}`} className={`rounded px-3 py-1.5 text-sm ${days === value ? "bg-primary text-primary-foreground" : ""}`}>{value}d</Link>)}</div>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value, note, href]) => <Link href={href} key={label} className="rounded-xl border bg-background p-5 shadow-sm transition hover:border-primary/40"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{format.format(value)}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></Link>)}
    </section>
    <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border bg-background p-6"><h2 className="text-lg font-semibold">Requires attention</h2><div className="mt-4 divide-y">
        <Queue label="Pending verifications" value={data.attention.pendingVerifications} href="/admin/verifications?status=pending" />
        <Queue label="Verified opportunities missing deadlines" value={data.attention.missingDeadline} href="/admin/opportunities" />
        <Queue label={`Failed syncs in ${days} days`} value={data.attention.failedSyncs} href="/admin/sources" />
        <Queue label="Pending payment reconciliation" value={data.attention.pendingPayments} href="/admin/payments?status=pending" />
      </div></div>
      <div className="rounded-xl border bg-background p-6"><h2 className="text-lg font-semibold">Integration readiness</h2><div className="mt-4 space-y-4">
        {Object.entries(data.capabilities).map(([name, capability]) => <div key={name}><div className="flex items-center justify-between"><p className="font-medium capitalize">{name}</p><span className={`rounded-full px-2 py-0.5 text-xs ${capability.available ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{capability.available ? "Available" : "Not configured"}</span></div><p className="mt-1 text-sm text-muted-foreground">{capability.reason}</p></div>)}
      </div></div>
    </section>
    <section className="rounded-xl border bg-background p-6"><div className="flex justify-between"><h2 className="text-lg font-semibold">Recent admin activity</h2><Link href="/admin/activity" className="text-sm text-primary">View all</Link></div>
      <div className="mt-4 divide-y">{data.activity.length ? data.activity.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3"><div><p className="text-sm font-medium">{item.summary}</p><p className="text-xs text-muted-foreground">{item.actorEmail || "System"} / {item.action}</p></div><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div>) : <p className="py-6 text-sm text-muted-foreground">No administrative changes have been recorded yet.</p>}</div>
    </section>
  </div>;
}
function Queue({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="flex items-center justify-between py-4"><span className="text-sm">{label}</span><span className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold">{value}</span></Link>;
}
