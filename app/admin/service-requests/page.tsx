import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { NotificationRetryButton } from "@/components/admin/service-requests/notification-retry-button";
import { formatServicePrice } from "@/lib/service-request-config";
import { whatsappUrl } from "@/lib/service-request-policy";
import { listAdminServiceRequests } from "@/lib/service-requests";
export const metadata: Metadata = { title: "Service Requests" };
export const instant = false;
const message = "Hello, this is the EasyGrantPath team. We're reaching out regarding your proposal review request.";
export default async function ServiceRequestsPage() {
  const items = await listAdminServiceRequests(); const failed = items.some((item) => item.adminNotificationStatus === "failed");
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Customer support</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Service Requests</h1><p className="mt-2 text-muted-foreground">Paid requests awaiting direct WhatsApp contact. Reviews and communication happen outside EasyGrantPath.</p></div>{failed ? <NotificationRetryButton /> : null}</header>
    <div className="overflow-x-auto rounded-xl border bg-background"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/50"><tr><th className="p-4">Customer</th><th className="p-4">Service</th><th className="p-4">Amount</th><th className="p-4">Payment confirmed</th><th className="p-4">WhatsApp</th><th className="p-4">Email notice</th><th className="p-4">Contact</th></tr></thead><tbody>{items.map((item) => { const href = whatsappUrl(item.customerWhatsapp, message); return <tr className="border-t" key={String(item._id)}><td className="p-4"><p className="font-medium">{item.customerName}</p><p className="text-xs text-muted-foreground">{item.customerEmail}</p></td><td className="p-4">Proposal Review</td><td className="p-4">{formatServicePrice(item.amount, item.currency)}</td><td className="p-4">{item.paymentConfirmedAt ? new Date(item.paymentConfirmedAt).toLocaleString("en-NG") : "Confirmed"}</td><td className="p-4 font-mono text-xs">{item.customerWhatsapp}</td><td className="p-4 capitalize">{item.adminNotificationStatus}</td><td className="p-4">{href ? <a className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href={href} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Contact on WhatsApp</a> : "Invalid number"}</td></tr>; })}</tbody></table>{!items.length ? <p className="p-10 text-center text-sm text-muted-foreground">No paid service requests yet.</p> : null}</div>
  </div>;
}
