import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireCurrentUserId } from "@/lib/development-user";
import { formatPaymentAmount } from "@/lib/payment-products";
import { listUserPayments } from "@/lib/payments";
import { getDevelopmentProfileForUserId, hasActiveAccess } from "@/lib/user-profile";
import { formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Payments.meta"); return { title: t("history") }; }
export default async function PaymentHistoryPage() {
  const [userId, locale, t] = await Promise.all([requireCurrentUserId(), getLocale() as Promise<SupportedLocale>, getTranslations("Payments.history")]);
  const [payments, profile] = await Promise.all([listUserPayments(userId), getDevelopmentProfileForUserId(userId)]);
  const active = hasActiveAccess(profile);
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"><header><p className="text-sm font-medium text-primary">{t("kicker")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 text-muted-foreground">{t("description")}</p></header>
    {profile?.paid ? <section className={"mt-6 rounded-2xl border p-5 " + (active ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}><h2 className="font-semibold">{active ? t("access.active") : t("access.expired")}</h2><p className="mt-1 text-sm text-muted-foreground">{profile.accessExpiresAt ? active ? t("access.expires", { date: formatDate(profile.accessExpiresAt, locale) }) : t("access.expiredOn", { date: formatDate(profile.accessExpiresAt, locale) }) : t("access.noExpiration")}</p></section> : null}
    <div className="mt-7 overflow-x-auto rounded-2xl border bg-card"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/50"><tr>{(["product","amount","status","environment","reference","date"] as const).map((key) => <th className="p-4" key={key}>{t(("headers." + key) as never)}</th>)}</tr></thead><tbody>{payments.map((payment) => <tr className="border-t" key={payment.id}><td className="p-4 font-medium">{t(("products." + payment.productId) as never)}</td><td className="p-4">{formatPaymentAmount(Number(payment.amountMinor), String(payment.currency), locale)}</td><td className="p-4">{t(("statuses." + payment.status) as never)}{(payment.productId === "proposal_writing" || payment.productId === "proposal_review") && payment.status === "successful" ? <p className="mt-1 text-xs text-muted-foreground">{t("whatsappNote")}</p> : null}</td><td className="p-4"><span className={"rounded-full px-2 py-1 text-xs font-medium " + (payment.environment === "live" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{t(("environments." + payment.environment) as never)}</span></td><td className="p-4 font-mono text-xs">{String(payment.reference)}</td><td className="p-4">{formatDate(String(payment.createdAt), locale, { hour: "2-digit", minute: "2-digit" })}</td></tr>)}</tbody></table>{!payments.length ? <p className="p-10 text-center text-sm text-muted-foreground">{t("empty")}</p> : null}</div>
  </main>;
}
