import "server-only";
import { getFlutterwaveConfig } from "@/lib/flutterwave-config";
import { formatPaymentAmount, getPaymentProduct, type AssistanceProductId } from "@/lib/payment-products";
export function getAssistanceServiceConfig(serviceType: AssistanceProductId) { const payment = getFlutterwaveConfig(); const product = getPaymentProduct(serviceType); return { amount: product?.amountMinor || null, currency: product?.currency || null, provider: payment.enabled ? "flutterwave" as const : null, baseUrl: payment.appUrl, environment: payment.environment, enabled: Boolean(payment.enabled && product) }; }
export const formatServicePrice = formatPaymentAmount;
