"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CustomerActions({ userId, status, notes }: { userId: string; status: string; notes?: string }) {
  const router = useRouter(); const [value, setValue] = useState(notes || ""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function update(body: Record<string, string>) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(userId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setBusy(false); setMessage(response.ok ? "Saved." : result.error?.message || "Update failed.");
    if (response.ok) router.refresh();
  }
  return <div className="space-y-5">
    <div><h2 className="font-semibold">Account control</h2><p className="mt-1 text-sm text-muted-foreground">Suspension affects account state only; it does not falsify payment history.</p><button disabled={busy} className="mt-3 rounded-md border px-3 py-2 text-sm" onClick={() => { const reason = prompt("Reason for this account-status change?"); if (reason) void update({ accountStatus: status === "suspended" ? "active" : "suspended", reason }); }}>{status === "suspended" ? "Reactivate account" : "Suspend account"}</button></div>
    <div><label className="text-sm font-medium" htmlFor="notes">Internal notes</label><textarea id="notes" value={value} onChange={(event) => setValue(event.target.value)} maxLength={5000} rows={6} className="mt-2 w-full rounded-md border p-3 text-sm" /><button disabled={busy} className="mt-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => void update({ adminNotes: value })}>Save notes</button></div>
    {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
  </div>;
}
