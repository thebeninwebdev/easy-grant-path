import type { Metadata } from "next";
import { ArrowLeft, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OpportunityReviewWorkspace } from "@/components/admin/opportunities/opportunity-review-workspace";
import { getAdminOpportunities, parseAdminOpportunityFilters } from "@/lib/admin-opportunities";

export const metadata: Metadata = { title: "Opportunity review" };

export default async function OpportunityReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminOpportunityFilters(await searchParams);
  const data = await getAdminOpportunities(filters);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Admin home
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Opportunity review</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Validate imported funding data before it reaches EasyGrantPath users.
              </p>
            </div>
          </div>
        </div>
        <Button asChild><Link href="/admin/opportunities/new"><Plus className="size-4" /> Add opportunity</Link></Button>
      </header>

      <OpportunityReviewWorkspace key={JSON.stringify(filters)} initialData={data} filters={filters} />
    </main>
  );
}
