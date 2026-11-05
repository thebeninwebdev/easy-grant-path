"use client";
import { useState } from "react";
import { LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Props = { configured: boolean; environment: "test" | "live"; price: string | null; initialWhatsapp: string };
export function ProposalReviewCheckout({ configured, environment, price, initialWhatsapp }: Props) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp); const [consent, setConsent] = useState(Boolean(initialWhatsapp)); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function proceed() {
    if (!configured || busy) return; const changed = whatsapp.trim() !== initialWhatsapp;
    if ((!initialWhatsapp || changed) && !consent) { setMessage("Confirm that we may save this WhatsApp number before continuing."); return; }
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: "proposal_review", whatsappNumber: whatsapp, saveWhatsapp: !initialWhatsapp || changed }) }); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.data?.checkoutUrl) throw new Error(payload?.error?.message || "Checkout could not be started."); window.location.assign(payload.data.checkoutUrl); }
    catch (error) { setBusy(false); setMessage(error instanceof Error ? error.message : "Checkout could not be started."); }
  }
  return <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
    <div className="border-b bg-primary/[.04] p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-primary">Professional support</p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${environment === "test" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{environment === "test" ? "Test payment" : "Live payment"}</span></div><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">Proposal Review</h1><p className="mt-2 max-w-2xl text-muted-foreground">Get professional feedback on your proposal. Once payment is verified, our team will contact you on WhatsApp to arrange your review.</p></div><p className="text-2xl font-semibold">{price || "Price not configured"}</p></div></div>
    <div className="space-y-6 p-6 sm:p-8"><div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground"><MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" /><p>All review and communication happens outside EasyGrantPath. You do not need to select or upload a proposal here.</p></div>
      <label className="block text-sm font-medium">WhatsApp number<span className="mt-1 block text-xs font-normal text-muted-foreground">Use international format with country code, such as +2348012345678.</span><Input className="mt-2" type="tel" autoComplete="tel" value={whatsapp} onChange={(event) => { setWhatsapp(event.target.value); setMessage(""); }} placeholder="+2348012345678" /></label>
      {(!initialWhatsapp || whatsapp.trim() !== initialWhatsapp) ? <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree that EasyGrantPath may save this number and use it to contact me about this service request.</span></label> : null}
      {!configured ? <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-medium">Online payment is not configured for this environment.</p><p className="mt-1">The correct Flutterwave credentials, webhook secret, application URL, service price, and email settings are required.</p></div> : null}
      {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
      <Button size="lg" className="w-full sm:w-auto" disabled={!configured || busy} onClick={() => void proceed()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{busy ? "Opening secure checkout…" : "Proceed to Payment"}</Button>
    </div>
  </section>;
}