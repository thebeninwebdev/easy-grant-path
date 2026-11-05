import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { GrantSource } from "@/models/GrantSource";
import { SourceSyncRun } from "@/models/SourceSyncRun";
export default async function SourcesPage() {
  await connection();
  await connectToDatabase();
  const [sources, runs] = await Promise.all([GrantSource.find().sort({ name: 1 }).lean(), SourceSyncRun.find().sort({ startedAt: -1 }).limit(20).lean()]);
  return <div className="space-y-6"><header><h1 className="text-3xl font-semibold">Sources & sync</h1><p className="mt-1 text-muted-foreground">Source health and recent ingestion outcomes.</p></header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sources.map((source) => <article key={String(source._id)} className="rounded-xl border bg-background p-5"><div className="flex justify-between"><h2 className="font-semibold">{source.name}</h2><span className={source.enabled ? "text-emerald-700" : "text-muted-foreground"}>{source.enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-sm text-muted-foreground">{source.type} / {source.trustLevel}</p><dl className="mt-4 text-sm"><dt>Last successful sync</dt><dd className="text-muted-foreground">{source.lastSuccessfulSyncAt ? new Date(source.lastSuccessfulSyncAt).toLocaleString() : "Never"}</dd>{source.lastError && <><dt className="mt-2 text-destructive">Last error</dt><dd className="text-xs text-muted-foreground">{source.lastError}</dd></>}</dl></article>)}</div>
    <div className="rounded-xl border bg-background p-5"><h2 className="font-semibold">Recent runs</h2><div className="mt-3 divide-y">{runs.map((run) => <div key={String(run._id)} className="grid grid-cols-2 gap-2 py-3 text-sm md:grid-cols-5"><span className="font-medium">{run.sourceSlug}</span><span>{run.status}</span><span>Created {run.created}</span><span>Updated {run.updated}</span><span className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span></div>)}{!runs.length && <p className="py-6 text-sm text-muted-foreground">No sync runs recorded.</p>}</div></div>
  </div>;
}
