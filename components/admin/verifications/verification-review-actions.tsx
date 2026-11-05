"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export function VerificationReviewActions({ id, status }: { id: string; status: string }) {
  const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const router = useRouter();
  async function review(status: "verified" | "action_required" | "rejected") {
    if (status !== "verified" && !reason.trim()) return setError("Enter a reason for rejection or resubmission.");
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/verifications/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reason: reason.trim() || undefined }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error?.message || "Could not save review.");
      router.push("/admin/verifications"); router.refresh();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save review."); }
    finally { setSaving(false); }
  }
  return <div className="mt-7 border-t pt-6">
    <label className="block text-sm font-medium">Decision reason (required for rejection or resubmission)<Textarea disabled={saving} className="mt-2" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    <div className="mt-4 flex flex-wrap gap-3">{status === "pending" ? <><Button disabled={saving} onClick={() => void review("verified")}>Approve</Button><Button disabled={saving} variant="destructive" onClick={() => void review("rejected")}>Reject</Button></> : null}<Button disabled={saving} variant="outline" onClick={() => void review("action_required")}>{status === "pending" ? "Request resubmission" : "Start re-verification"}</Button></div>
  </div>;
}
