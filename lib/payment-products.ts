import "server-only";
import { appConfig } from "@/lib/config";
export type PaymentProduct = { id: "proposal_review" | "platform_access" | "full_application_assistance"; category: "service" | "subscription"; label: string; amountMinor: number; currency: string; durationDays?: number };
export function getPaymentProduct(id: string): PaymentProduct | null {
  if (id === "proposal_review") {
    const amountMinor = Number(process.env.PROPOSAL_REVIEW_PRICE_MINOR);
    const currency = (process.env.PROPOSAL_REVIEW_CURRENCY || "").trim().toUpperCase();
    return Number.isSafeInteger(amountMinor) && amountMinor > 0 && /^[A-Z]{3}$/.test(currency) ? { id, category: "service", label: "Proposal Review", amountMinor, currency } : null;
  }
  if (id === "platform_access") {
    const plan = appConfig.platformAccess;
    if (plan.provider === "flutterwave" && Number.isSafeInteger(plan.price) && Number(plan.price) > 0 && Number.isSafeInteger(plan.durationDays) && Number(plan.durationDays) > 0) return { id, category: "subscription", label: "EasyGrantPath Access", amountMinor: Number(plan.price), currency: plan.currency, durationDays: Number(plan.durationDays) };
  }
  // Full Application Assistance has no approved price, so it remains unavailable.
  return null;
}
export function currencyFractionDigits(currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2; }
export function minorToMajorAmount(amountMinor: number, currency: string) { const digits = currencyFractionDigits(currency); return (amountMinor / 10 ** digits).toFixed(digits); }
export function majorToMinorAmount(amount: unknown, currency: string) { const numeric = typeof amount === "number" || typeof amount === "string" ? Number(amount) : Number.NaN; return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 10 ** currencyFractionDigits(currency)) : null; }
export function formatPaymentAmount(amountMinor: number, currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).format(amountMinor / 10 ** currencyFractionDigits(currency)); }