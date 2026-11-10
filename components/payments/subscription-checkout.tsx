"use client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/config";
export function SubscriptionCheckout({ label }: { label: string }) {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Payments");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: "platform_access", locale }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.checkoutUrl) throw new Error();
      window.location.assign(payload.data.checkoutUrl);
    } catch { setBusy(false); setError(t("checkoutError")); }
  }
  return <div className="mt-7">{error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}<Button className="w-full" disabled={busy} onClick={() => void start()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}{busy ? t("openingCheckout") : label}</Button></div>;
}
