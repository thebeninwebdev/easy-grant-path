import Link from "next/link";
import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ProposalTemplate } from "@/models/ProposalTemplate";
import "@/models/Opportunity";
export default async function TemplatesPage() {
  await connection();
  await connectToDatabase();
  const templates = await ProposalTemplate.find().populate("opportunityId", "title").sort({ updatedAt: -1 }).lean();
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold">Proposal templates</h1><p className="mt-1 text-muted-foreground">Opportunity-specific and reusable general proposal structures.</p></div><Link href="/admin/proposal-templates/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">New general template</Link></header>
    <div className="overflow-x-auto rounded-xl border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Template</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Sections</th><th className="p-3">Updated</th></tr></thead><tbody>
      {templates.map((template) => { const opportunity = template.opportunityId as unknown as { _id: string; title: string } | null; const general = template.scope === "general" || !opportunity?._id; return <tr key={String(template._id)} className="border-t"><td className="p-3">{general ? <span className="font-medium">{template.title}</span> : <Link className="font-medium text-primary" href={`/admin/opportunities/${opportunity._id}/proposal`}>{template.title}</Link>}<p className="text-xs text-muted-foreground">{general ? "Reusable general template" : opportunity?.title || "Opportunity unavailable"}</p></td><td className="p-3">{template.templateType}</td><td className="p-3">{template.status}</td><td className="p-3">{template.sections.length}</td><td className="p-3">{new Date(template.updatedAt).toLocaleDateString()}</td></tr>; })}
      {!templates.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No templates have been created.</td></tr>}
    </tbody></table></div></div>;
}
