import "server-only";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { formatPaymentAmount, getPaymentProduct } from "@/lib/payment-products";
export function getProposalReviewConfig() { const payment = getFlutterwaveConfig(); const product = getPaymentProduct("proposal_review"); const notificationsReady = Boolean(process.env.ADMIN_NOTIFICATION_EMAIL && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL); return { amount: product?.amountMinor || null, currency: product?.currency || null, provider: payment.enabled ? "flutterwave" as const : null, baseUrl: payment.appUrl, environment: payment.environment, enabled: Boolean(payment.enabled && product && notificationsReady) }; }
export const formatServicePrice = formatPaymentAmount;