import Link from "next/link";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import { UserProfile } from "@/models/UserProfile";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const q = (await searchParams).q?.trim() || ""; await connectToDatabase();
  const safe = q.replace(/[.*+?^()|[\]\\]/g, "\\$&"); const expression = new RegExp(safe, "i");
  const [opportunities, customers] = q ? await Promise.all([
    Opportunity.find({ $or: [{ title: expression }, { organization: expression }, { agency: expression }] }).limit(20).lean(),
    UserProfile.find({ $or: [{ fullName: expression }, { countryCode: expression }] }).limit(20).lean(),
  ]) : [[], []];
  return <div className="space-y-6"><header><h1 className="text-3xl font-semibold">Search</h1><p className="mt-1 text-muted-foreground">{q ? `Results for "${q}"` : "Enter a search term in the admin header."}</p></header>
    <Results title="Opportunities" empty={!opportunities.length}>{opportunities.map((item) => <Link key={String(item._id)} href={`/admin/opportunities/${item._id}`} className="block border-t py-3 first:border-0"><p className="font-medium text-primary">{item.title}</p><p className="text-sm text-muted-foreground">{item.organization || item.agency || item.source?.name}</p></Link>)}</Results>
    <Results title="Customers" empty={!customers.length}>{customers.map((item) => <Link key={String(item._id)} href={`/admin/customers/${item.userId}`} className="block border-t py-3 first:border-0"><p className="font-medium text-primary">{item.fullName || item.userId}</p><p className="text-sm text-muted-foreground">{item.applicantType || "Unknown type"} / {item.countryCode || "Unknown country"}</p></Link>)}</Results>
  </div>;
}
function Results({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) { return <section className="rounded-xl border bg-background p-5"><h2 className="font-semibold">{title}</h2><div className="mt-3">{empty ? <p className="text-sm text-muted-foreground">No results.</p> : children}</div></section>; }
