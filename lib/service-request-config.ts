import "server-only";
import { getPaystackConfig } from "@/lib/paystack-config";
import { formatPaymentAmount, getPaymentProduct, type AssistanceProductId } from "@/lib/payment-products";
export function getAssistanceServiceConfig(serviceType: AssistanceProductId) { const payment = getPaystackConfig(); const product = getPaymentProduct(serviceType); return { amount: product?.amountMinor || null, currency: product?.currency || null, provider: payment.enabled ? "paystack" as const : null, baseUrl: payment.appUrl, environment: payment.environment, enabled: Boolean(payment.enabled && product) }; }
export const formatServicePrice = formatPaymentAmount;
