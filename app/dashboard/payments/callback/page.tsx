import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaymentCallback } from "@/components/payments/payment-callback";
export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Payments.meta"); return { title: t("callback") }; }
export default async function PaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; tx_ref?: string; transaction_id?: string; status?: string }> }) { const query = await searchParams; return <main className="px-4 py-12 sm:px-6"><PaymentCallback reference={query.reference || query.tx_ref} transactionId={query.transaction_id} statusHint={query.status} /></main>; }
