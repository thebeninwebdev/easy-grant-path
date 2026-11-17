"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { upload } from "@vercel/blob/client";
import { FileCheck2, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_SIZE = 4 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
type Translator = ReturnType<typeof useTranslations>;

function validate(file: File | null, t: Translator) {
  if (!file) return t("errors.chooseFirst");
  if (!ACCEPTED.includes(file.type)) return t("errors.invalidType");
  if (file.size > MAX_SIZE) return t("errors.tooLarge");
  return "";
}

async function privateUpload(file: File, kind: "identity" | "organization") {
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const pathname = `verification/v1/incoming/${crypto.randomUUID()}.${extension}`;
  const blob = await upload(pathname, file, { access: "private", handleUploadUrl: "/api/verification/uploads", clientPayload: JSON.stringify({ kind }), contentType: file.type });
  return { storageKey: blob.pathname, filename: file.name, mimeType: file.type, size: file.size };
}

async function apiError(response: Response, fallback: string) {
  return (await response.json().catch(() => null))?.error?.message || fallback;
}

export function IdentityVerificationForm() {
  const t = useTranslations("Verification.identity");
  const [type, setType] = useState("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  async function submit() {
    const issue = validate(file, t);
    if (issue) return setMessage(issue);
    setSaving(true); setProgress(20); setMessage(t("uploading"));
    try {
      const pending = await privateUpload(file!, "identity");
      setProgress(70); setMessage(t("submittingReview"));
      const response = await fetch("/api/verification/identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType: type, upload: pending }) });
      if (!response.ok) throw new Error(await apiError(response, t("errors.submitFailed")));
      setProgress(100); setMessage(t("submitted")); router.refresh();
    } catch (error) {
      setProgress(0); setMessage(error instanceof Error ? error.message : t("errors.uploadFailed"));
    } finally { setSaving(false); }
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    setFile(next); setProgress(0); setMessage(next ? validate(next, t) : "");
  }

  return <div className="space-y-5">
    <label className="block text-sm font-medium">{t("documentType")}<select disabled={saving} className="mt-2 h-11 w-full rounded-md border bg-background px-3" value={type} onChange={(event) => setType(event.target.value)}><option value="national_id">{t("nationalId")}</option><option value="passport">{t("passport")}</option><option value="drivers_license">{t("driversLicense")}</option><option value="other_government_id">{t("otherGovId")}</option></select></label>
    <label className="block text-sm font-medium">{t("fileLabel")}<input disabled={saving} className="mt-2 block w-full rounded-xl border bg-background p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-medium file:text-primary" type="file" accept={ACCEPTED.join(",")} onChange={select} /></label>
    <div className="flex gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p>{t("fileHint")}</p></div>
    {file ? <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm"><FileCheck2 className="size-4 shrink-0 text-primary" /><span className="min-w-0 truncate">{t("selectedFile", { name: file.name })}</span><span className="ml-auto shrink-0 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div> : null}
    {progress > 0 ? <div aria-label={t("uploadProgress")} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} role="progressbar" className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div> : null}
    {message ? <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p> : null}
    <Button className="w-full sm:w-auto" disabled={saving || !file} onClick={() => void submit()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}{saving ? t("submitting") : t("submit")}</Button>
  </div>;
}

export function OrganizationVerificationForm({ registrationStatus, registrationLabel }: { registrationStatus: string; registrationLabel: string }) {
  const t = useTranslations("Verification.organization");
  const identityT = useTranslations("Verification.identity");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const needsRegistration = registrationStatus === "registered";
  function choose(key: string, event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0] || null; setFiles((current) => ({ ...current, [key]: next })); setMessage(next ? validate(next, identityT) : ""); }
  async function submit() {
    if (needsRegistration && !files.registration_certificate) return setMessage(t("form.uploadRegistration"));
    if (!files.authorized_representative_id) return setMessage(t("form.uploadRepresentative"));
    setSaving(true); setMessage(identityT("uploading"));
    try {
      const uploads = await Promise.all(Object.entries(files).filter((entry): entry is [string, File] => Boolean(entry[1])).map(async ([documentType, file]) => ({ documentType, upload: await privateUpload(file, "organization") })));
      setMessage(identityT("submittingReview"));
      const response = await fetch("/api/verification/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploads }) });
      if (!response.ok) throw new Error(await apiError(response, identityT("errors.submitFailed")));
      setMessage(t("form.submitted")); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : identityT("errors.uploadFailed")); }
    finally { setSaving(false); }
  }
  if (registrationStatus === "not_registered") return <p className="text-sm text-muted-foreground">{t("form.notRequired")}</p>;
  return <div className="space-y-5"><p className="text-sm font-medium">{t("form.required", { status: registrationLabel })}</p>{registrationStatus === "in_progress" ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("form.registrationProgress")}</p> : null}{needsRegistration ? <label className="block text-sm font-medium">{registrationLabel}<input disabled={saving} type="file" accept={ACCEPTED.join(",")} onChange={(event) => choose("registration_certificate", event)} className="mt-2 block w-full rounded-md border p-3 text-sm" /></label> : null}<label className="block text-sm font-medium">{t("form.representativeId")}<input disabled={saving} type="file" accept={ACCEPTED.join(",")} onChange={(event) => choose("authorized_representative_id", event)} className="mt-2 block w-full rounded-md border p-3 text-sm" /></label><p className="text-xs text-muted-foreground">{t("form.privateHint")}</p>{message ? <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p> : null}<Button disabled={saving} onClick={() => void submit()}>{saving ? t("submitting") : t("submit")}</Button></div>;
}
