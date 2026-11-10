"use client";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RotateCw, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
type State = "verifying" | "successful" | "pending" | "failed" | "cancelled";
type PaymentDetails = { productId: string; proposalTitle?: string | null; amountMinor: number; currency: string; reference: string; whatsappNumber?: string | null };
export function PaymentCallback({ reference, transactionId, statusHint }: { reference?: string; transactionId?: string; statusHint?: string }) {
  const t = useTranslations("Payments.callback");
  const locale = useLocale();
  const [state, setState] = useState<State>(!reference ? statusHint === "cancelled" ? "cancelled" : "failed" : "verifying");
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const verify = useCallback(async () => {
    if (!reference) return; setState("verifying");
    try {
      const response = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, ...(transactionId ? { transactionId } : {}) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 503 || payload?.error?.code === "PAYMENT_VERIFICATION_PENDING") { setState("pending"); return; }
        throw new Error();
      }
      setPayment(payload?.data || null); setState("successful");
    } catch { setState(statusHint === "cancelled" ? "cancelled" : "failed"); }
  }, [reference, statusHint, transactionId]);
  useEffect(() => { const timer = window.setTimeout(() => void verify(), 0); return () => window.clearTimeout(timer); }, [verify]);
  const icon = state === "successful" ? <CheckCircle2 className="mx-auto size-12 text-emerald-700" /> : state === "pending" ? <Clock3 className="mx-auto size-12 text-amber-700" /> : state === "verifying" ? <LoaderCircle className="mx-auto size-12 animate-spin text-primary" /> : <XCircle className="mx-auto size-12 text-destructive" />;
  const title = t(state + ".title" as never), copy = t(state + ".description" as never);
  const service = payment ? t(("services." + payment.productId) as never) : "";
  return <section className="mx-auto max-w-xl rounded-3xl border bg-card p-7 text-center shadow-sm sm:p-10" lang={locale}>{icon}<h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1><p className="mx-auto mt-3 max-w-md text-muted-foreground">{copy}</p>{state === "successful" && payment ? <dl className="mt-6 grid gap-3 rounded-xl bg-muted/60 p-4 text-left text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{t("details.service")}</dt><dd className="font-medium">{service}</dd></div>{payment.proposalTitle ? <div><dt className="text-muted-foreground">{t("details.proposal")}</dt><dd className="font-medium">{payment.proposalTitle}</dd></div> : null}<div><dt className="text-muted-foreground">{t("details.reference")}</dt><dd className="font-mono text-xs">{payment.reference}</dd></div>{payment.whatsappNumber ? <div><dt className="text-muted-foreground">{t("details.contactNumber")}</dt><dd className="font-medium">{payment.whatsappNumber}</dd></div> : null}</dl> : null}<div className="mt-7 flex flex-wrap justify-center gap-3">{state === "pending" || state === "failed" ? <Button onClick={() => void verify()}><RotateCw className="size-4" />{t("checkAgain")}</Button> : null}<Button asChild variant="outline"><Link href={state === "successful" && payment?.proposalTitle ? "/dashboard/proposals" : "/dashboard/payments"}>{state === "successful" && payment?.proposalTitle ? t("returnToProposals") : t("viewPaymentHistory")}</Link></Button></div></section>;
}
