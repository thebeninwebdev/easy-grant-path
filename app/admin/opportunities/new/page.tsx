import type { Metadata } from "next";
import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { OpportunityCreateForm } from "@/components/admin/opportunities/opportunity-create-form";

export const metadata: Metadata = { title: "Add opportunity" };

export default function NewOpportunityPage() {
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-7">
      <Link href="/admin/opportunities" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Opportunity review</Link>
      <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><PlusCircle className="size-5" /></div><div><h1 className="text-2xl font-semibold tracking-tight">Add opportunity</h1><p className="mt-1 text-sm text-muted-foreground">Enter details manually or import a public page, then review before saving.</p></div></div>
    </header>
    <OpportunityCreateForm />
  </main>;
}
