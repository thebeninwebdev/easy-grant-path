export type AssistanceUnavailableReason = "payment_provider" | "account_classification";

export function resolveAssistanceUnavailableReason(paymentEnabled: boolean, productAvailable: boolean): AssistanceUnavailableReason | null {
  if (!paymentEnabled) return "payment_provider";
  if (!productAvailable) return "account_classification";
  return null;
}
