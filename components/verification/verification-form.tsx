"use client";
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
const MAX_SIZE = 4 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
function validate(file: File | null) {
  if (!file) return "Choose a document first.";
  if (!ACCEPTED.includes(file.type)) return "Choose a PDF, JPG, or PNG file.";
  if (file.size > MAX_SIZE) return "Documents must be 4 MB or smaller.";
  return "";
}
async function privateUpload(file: File, kind: "identity" | "organization") {
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const pathname = `verification/v1/incoming/${crypto.randomUUID()}.${extension}`;
  const blob = await upload(pathname, file, { access: "private", handleUploadUrl: "/api/verification/uploads", clientPayload: JSON.stringify({ kind }), contentType: file.type });
  return { storageKey: blob.pathname, filename: file.name, mimeType: file.type, size: file.size };
}
async function apiError(response: Response) { return (await response.json().catch(() => null))?.error?.message || "The document could not be submitted. Please retry."; }
export function IdentityVerificationForm() {
  const [type, setType] = useState("national_id"); const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const router = useRouter();
  async function submit() {
    const issue = validate(file); if (issue) return setMessage(issue);
    setSaving(true); setMessage("Uploading securely&");
    try {
      const pending = await privateUpload(file!, "identity");
      setMessage("Submitting for review&");
      const response = await fetch("/api/verification/identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType: type, upload: pending }) });
      if (!response.ok) throw new Error(await apiError(response));
      setMessage("Your identity document is now under review."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed. Please retry."); }
    finally { setSaving(false); }
  }
  function select(event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0] || null; setFile(next); setMessage(validate(next)); }
  return <div className="space-y-5">
    <label className="block text-sm font-medium">Document type<select disabled={saving} className="mt-2 h-11 w-full rounded-md border bg-white px-3" value={type} onChange={(event) => setType(event.target.value)}><option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver&apos;s license</option><option value="other_government_id">Other government ID</option></select></label>
    <label className="block text-sm font-medium">Government-issued ID<input disabled={saving} className="mt-2 block w-full rounded-md border p-3 text-sm" type="file" accept={ACCEPTED.join(",")} onChange={select} /></label>
    <p className="text-xs text-muted-foreground">PDF, JPG, or PNG up to 4 MB. Files are stored privately and are only available to authorized reviewers.</p>
    {file ? <p className="break-all text-sm text-muted-foreground">Selected: {file.name}</p> : null}
    {message ? <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p> : null}
    <Button disabled={saving} onClick={() => void submit()}>{saving ? "Submitting securely&" : "Submit for review"}</Button>
  </div>;
}
export function OrganizationVerificationForm({ registrationStatus, registrationLabel }: { registrationStatus: string; registrationLabel: string }) {
  const [files, setFiles] = useState<Record<string, File | null>>({}); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const router = useRouter();
  const needsRegistration = registrationStatus === "registered";
  function choose(key: string, event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0] || null; setFiles((current) => ({ ...current, [key]: next })); setMessage(validate(next)); }
  async function submit() {
    if (needsRegistration && !files.registration_certificate) return setMessage("Upload the registration document.");
    if (!files.authorized_representative_id) return setMessage("Upload the representative ID.");
    for (const file of Object.values(files)) { const issue = validate(file); if (file && issue) return setMessage(issue); }
    setSaving(true); setMessage("Uploading securely&");
    try {
      const entries = Object.entries(files).filter((entry): entry is [string, File] => Boolean(entry[1]));
      const uploaded = [];
      for (const [type, file] of entries) uploaded.push({ type, upload: await privateUpload(file, "organization") });
      const response = await fetch("/api/verification/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: uploaded }) });
      if (!response.ok) throw new Error(await apiError(response));
      setMessage("Your organization documents are now under review."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed. Please retry."); }
    finally { setSaving(false); }
  }
  const field = (key: string, label: string) => <label className="block text-sm font-medium">{label}<input disabled={saving} className="mt-2 block w-full rounded-md border p-3 text-sm" type="file" accept={ACCEPTED.join(",")} onChange={(event) => choose(key, event)} /></label>;
  if (registrationStatus === "not_registered") return <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Verification documents are not required for this organization profile.</p>;
  return <div className="space-y-5">
    <div><h2 className="font-semibold">Required documents</h2><div className="mt-3 space-y-4">{needsRegistration ? field("registration_certificate", registrationLabel) : <p className="text-sm text-muted-foreground">Registration is in progress. Approval will be provisional until registration can be verified.</p>}{field("authorized_representative_id", "Government-issued ID of representative")}</div></div>
    <p className="text-xs text-muted-foreground">PDF, JPG, or PNG up to 4 MB each. Files are stored privately.</p>
    {message ? <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p> : null}
    <Button disabled={saving} onClick={() => void submit()}>{saving ? "Submitting securely&" : "Submit for review"}</Button>
  </div>;
}
