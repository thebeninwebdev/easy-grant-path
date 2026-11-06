import { timingSafeEqual } from "crypto";

export type SyncSecretProblem = "sync_secret_missing" | "sync_secret_too_short" | "sync_secret_has_whitespace";

export type SyncAuthorizationResult =
  | { authorized: true }
  | { authorized: false; reason: SyncSecretProblem | "bearer_token_missing" | "bearer_token_malformed" | "bearer_token_invalid"; tokenPresent: boolean };

export function getSyncSecretProblem(secret = process.env.SYNC_SECRET): SyncSecretProblem | null {
  if (!secret) return "sync_secret_missing";
  if (secret.length < 32) return "sync_secret_too_short";
  if (secret !== secret.trim() || /[\r\n]/.test(secret)) return "sync_secret_has_whitespace";
  return null;
}

export function authorizeSyncRequest(authorization: string | null, secret = process.env.SYNC_SECRET): SyncAuthorizationResult {
  const secretProblem = getSyncSecretProblem(secret);
  if (secretProblem) return { authorized: false, reason: secretProblem, tokenPresent: Boolean(authorization) };
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!authorization) return { authorized: false, reason: "bearer_token_missing", tokenPresent: false };
  if (!match) return { authorized: false, reason: "bearer_token_malformed", tokenPresent: true };
  const token = match[1];
  const secretValue = secret as string;
  if (token.length !== secretValue.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secretValue))) {
    return { authorized: false, reason: "bearer_token_invalid", tokenPresent: true };
  }
  return { authorized: true };
}