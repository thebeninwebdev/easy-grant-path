import "server-only";
import { getPaystackConfig } from "@/lib/paystack-config";
import { formatPaymentAmount, getPaymentProduct, type AssistanceProductId } from "@/lib/payment-products";
export function getAssistanceServiceConfig(serviceType: AssistanceProductId, applicantType?: string | null) { const payment = getPaystackConfig(); const product = getPaymentProduct(serviceType, applicantType); return { amount: product?.amountMinor || null, currency: product?.currency || null, provider: payment.enabled ? "paystack" as const : null, baseUrl: payment.appUrl, environment: payment.environment, enabled: Boolean(payment.enabled && product) }; }
export function getAssistancePaymentAvailability() { const payment = getPaystackConfig(); return { enabled: payment.enabled, environment: payment.environment }; }
export const formatServicePrice = formatPaymentAmount;
