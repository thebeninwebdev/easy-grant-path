"use client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ClipboardCheck, FilePenLine, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SupportedLocale } from "@/lib/config";
type Service = "proposal_writing" | "proposal_review";
type Config = { price: string | null; configured: boolean };
export function ProposalAssistanceActions({ initialWhatsapp, services, compact = false, cards = false }: { initialWhatsapp: string; services: Record<Service, Config>; compact?: boolean; cards?: boolean }) {
  const t = useTranslations("Proposals.services");
  const locale = useLocale() as SupportedLocale;
  const details = {
    proposal_review: { name: t("review.name"), action: t("review.action"), description: t("review.description"), icon: ClipboardCheck },
    proposal_writing: { name: t("writing.name"), action: t("writing.action"), description: t("writing.description"), icon: FilePenLine },
  };
  const [selected, setSelected] = useState<Service | null>(null), [whatsapp, setWhatsapp] = useState(initialWhatsapp), [saveWhatsapp, setSaveWhatsapp] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const service = selected ? details[selected] : null;
  const open = (type: Service) => { setSelected(type); setMessage(""); };
  async function checkout() {
    if (!selected || busy) return;
    if (!whatsapp.trim()) return setMessage(t("whatsappRequired"));
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selected, whatsappNumber: whatsapp, saveWhatsapp, locale }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.checkoutUrl) throw new Error();
      window.location.assign(payload.data.checkoutUrl);
    } catch { setBusy(false); setMessage(t("checkoutError")); }
  }
  const actions = cards ? <div className="grid gap-4 md:grid-cols-2">{(Object.keys(details) as Service[]).map((type) => { const item = details[type], Icon = item.icon, config = services[type]; return <section key={type} className="rounded-2xl border bg-card p-5 shadow-sm"><Icon className="size-7 text-primary" /><h3 className="mt-4 text-xl font-semibold">{item.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{item.description}</p><p className="mt-4 font-semibold">{config.price || t("priceUnavailable")}</p>{!config.configured ? <p className="mt-1 text-xs text-amber-700">{t("notConfigured")}</p> : null}<Button className="mt-5 w-full" disabled={!config.configured} onClick={() => open(type)}>{item.action}</Button></section>; })}</div> : <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}><Button variant="outline" onClick={() => open("proposal_review")}>{t("review.action")}</Button><Button onClick={() => open("proposal_writing")}>{t("writing.action")}</Button></div>;
  return <>{actions}<Dialog open={Boolean(selected)} onOpenChange={(openState) => !openState && !busy && setSelected(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{service?.name}</DialogTitle><DialogDescription>{service?.description}</DialogDescription></DialogHeader>{selected ? <div className="mt-5 space-y-5"><div className="rounded-xl bg-muted/60 p-4 text-sm"><p className="text-muted-foreground">{t("paymentAmount")}</p><p className="mt-1 text-lg font-semibold">{services[selected].price || t("priceUnavailable")}</p></div><p className="rounded-xl border border-primary/15 bg-primary/[.04] p-4 text-sm text-muted-foreground">{t("securePayment")}</p><label className="block text-sm font-medium">{t("whatsappLabel")}<Input className="mt-1" type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder={t("whatsappPlaceholder")} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={saveWhatsapp} onChange={(event) => setSaveWhatsapp(event.target.checked)} />{t("saveWhatsapp")}</label>{message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>{t("cancel")}</Button><Button disabled={!services[selected].configured || busy} onClick={() => void checkout()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{busy ? t("openingCheckout") : services[selected].price ? t("payButton", { price: services[selected].price }) : t("continueToPayment")}</Button></div></div> : null}</DialogContent></Dialog></>;
}
