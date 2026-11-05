import Link from "next/link";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; access?: string }> }) {
  await connection();
  const { q = "", access } = await searchParams;
  const db = await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (access) filter.accessStatus = access;
  const profiles = await UserProfile.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const users = await db.connection.db!.collection("user").find({ id: { $in: profiles.map((p) => p.userId) } }).toArray();
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = profiles.map((profile) => ({ profile, user: byId.get(profile.userId) }))
    .filter(({ profile, user }) => !q || [user?.name, user?.email, profile.fullName, profile.countryCode].some((value) => String(value || "").toLowerCase().includes(q.toLowerCase())));
  return <div className="space-y-6"><Header title="Customers" text="Profiles, access state, and account health from the live database." />
    <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search name, email, or country" className="h-10 min-w-0 flex-1 rounded-md border px-3" /><button className="rounded-md bg-primary px-4 text-sm text-primary-foreground">Search</button></form>
    <div className="overflow-x-auto rounded-xl border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Country</th><th className="p-3">Access</th><th className="p-3">Account</th><th className="p-3">Joined</th></tr></thead><tbody>
      {rows.map(({ profile, user }) => <tr key={String(profile._id)} className="border-t"><td className="p-3"><Link href={`/admin/customers/${profile.userId}`} className="font-medium text-primary">{user?.name || profile.fullName || "Unnamed"}</Link><p className="text-xs text-muted-foreground">{user?.email || profile.userId}</p></td><td className="p-3">{profile.applicantType || "-"}</td><td className="p-3">{profile.countryCode || "-"}</td><td className="p-3">{profile.accessStatus}</td><td className="p-3">{profile.accountStatus}</td><td className="p-3">{new Date(profile.createdAt).toLocaleDateString()}</td></tr>)}
      {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No customers match these filters.</td></tr>}
    </tbody></table></div><p className="text-xs text-muted-foreground">Showing up to 100 newest profiles. Payment history is unavailable until a payment provider and ledger are configured.</p>
  </div>;
}
function Header({ title, text }: { title: string; text: string }) { return <header><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-1 text-muted-foreground">{text}</p></header>; }
