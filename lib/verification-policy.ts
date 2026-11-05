export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "provisional", "action_required", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type AdminReviewTarget = "verified" | "action_required" | "rejected";
export type OrganizationRegistrationStatus = "registered" | "in_progress" | "not_registered";

export function canUserSubmitVerification(status: VerificationStatus | null | undefined) {
  return !status || status === "unverified" || status === "action_required";
}

export function canAdminTransitionVerification(from: VerificationStatus, to: AdminReviewTarget) {
  if (from === "pending") return ["verified", "action_required", "rejected"].includes(to);
  if (["verified", "provisional"].includes(from)) return to === "action_required";
  return false;
}

export function resolvedOrganizationApprovalStatus(status: OrganizationRegistrationStatus) {
  return status === "registered" ? "verified" as const : "provisional" as const;
}

export function requiredOrganizationDocumentTypes(status: OrganizationRegistrationStatus) {
  if (status === "registered") return ["registration_certificate", "authorized_representative_id"] as const;
  if (status === "in_progress") return ["authorized_representative_id"] as const;
  return [] as const;
}

export type DetectedDocumentContent = {
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  extension: "pdf" | "jpg" | "png";
};

function includesSequence(bytes: Uint8Array, signature: number[], start = 0) {
  outer: for (let index = Math.max(0, start); index <= bytes.length - signature.length; index += 1) {
    for (let offset = 0; offset < signature.length; offset += 1) {
      if (bytes[index + offset] !== signature[offset]) continue outer;
    }
    return true;
  }
  return false;
}

export function detectDocumentContent(bytes: Uint8Array): DetectedDocumentContent | null {
  if (bytes.length >= 12 && [0x25, 0x50, 0x44, 0x46, 0x2d].every((v, i) => bytes[i] === v) && includesSequence(bytes, [0x25, 0x25, 0x45, 0x4f, 0x46], bytes.length - 2048)) return { mimeType: "application/pdf", extension: "pdf" };
  if (bytes.length >= 12 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v) && includesSequence(bytes, [0x49, 0x45, 0x4e, 0x44], bytes.length - 32)) return { mimeType: "image/png", extension: "png" };
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) return { mimeType: "image/jpeg", extension: "jpg" };
  return null;
}

export function sanitizeDocumentFilename(filename: string, extension: string) {
  const base = filename.normalize("NFKC").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9 _.-]/g, "_").replace(/\s+/g, " ").trim().slice(0, 100) || "verification-document";
  return `${base}.${extension}`;
}