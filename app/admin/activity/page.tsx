import { connection } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
export default async function ActivityPage() {
  await connection();
  await connectToDatabase();
  const events = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
  return <div className="space-y-6"><header><h1 className="text-3xl font-semibold">Activity log</h1><p className="mt-1 text-muted-foreground">Immutable-style audit events for privileged actions. Sensitive request data is not stored.</p></header>
    <div className="rounded-xl border bg-background"><div className="divide-y">{events.map((event) => <article key={String(event._id)} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_180px_180px]"><div><p className="font-medium">{event.summary}</p><p className="text-xs text-muted-foreground">{event.resourceType} / {event.resourceId}{event.reason ? ` / Reason: ${event.reason}` : ""}</p></div><span>{event.actorEmail || event.actorId}</span><time className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</time></article>)}{!events.length && <p className="p-8 text-center text-sm text-muted-foreground">No privileged actions have been recorded yet.</p>}</div></div>
  </div>;
}
