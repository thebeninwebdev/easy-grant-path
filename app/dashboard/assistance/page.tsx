import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProposalAssistanceActions } from "@/components/services/proposal-assistance-actions";
import { getCurrentSession } from "@/lib/development-user";
import { connectToDatabase } from "@/lib/db";
import { UserProfile } from "@/models/UserProfile";
import { formatServicePrice, getAssistanceServiceConfig } from "@/lib/service-request-config";
import { listUserAssistanceRequests } from "@/lib/service-requests";
import { formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Assistance"); return { title: t("meta") }; }
export default async function AssistancePage() {
  const session = await getCurrentSession(); if (!session) return null;
  const [locale, t, payments] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Assistance"), getTranslations("Payments")]);
  await connectToDatabase();
  const [profile, items] = await Promise.all([UserProfile.findOne({ userId: session.user.id }).lean(), listUserAssistanceRequests(session.user.id)]);
  const writing = getAssistanceServiceConfig("proposal_writing"), review = getAssistanceServiceConfig("proposal_review");
  const services = { proposal_writing: { configured: writing.enabled, price: writing.amount && writing.currency ? formatServicePrice(writing.amount, writing.currency, locale) : null }, proposal_review: { configured: review.enabled, price: review.amount && review.currency ? formatServicePrice(review.amount, review.currency, locale) : null } };
  return <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6"><header><p className="text-sm font-medium text-primary">{t("kicker")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p></header><section className="mt-7"><ProposalAssistanceActions cards initialWhatsapp={String(profile?.whatsappNumber || "")} services={services} /></section><section className="mt-8 rounded-2xl border bg-muted/30 p-5"><h2 className="font-semibold">{t("howItWorks.title")}</h2><ol className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{([1,2,3,4] as const).map((step) => <li key={step}>{t(("howItWorks.steps." + step) as never)}</li>)}</ol></section><h2 className="mt-10 text-xl font-semibold">{t("requests.title")}</h2><div className="mt-4 overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/50"><tr>{(["service","amount","paymentStatus","date","reference"] as const).map((key) => <th className="p-4" key={key}>{t(("requests.headers." + key) as never)}</th>)}</tr></thead><tbody>{items.map((item) => <tr className="border-t" key={String(item._id)}><td className="p-4 font-medium">{payments(("history.products." + item.serviceType) as never)}</td><td className="p-4">{formatServicePrice(item.amount, item.currency, locale)}</td><td className="p-4">{item.paymentStatus === "paid" ? t("requests.paidNote") : payments(("history.statuses." + item.paymentStatus) as never)}</td><td className="p-4">{formatDate(item.createdAt, locale)}</td><td className="p-4 font-mono text-xs">{item.paymentReference}</td></tr>)}</tbody></table>{!items.length ? <p className="p-10 text-center text-sm text-muted-foreground">{t("requests.empty")}</p> : null}</div><Link className="mt-5 inline-block text-sm font-medium text-primary hover:underline" href="/dashboard">{t("requests.backToDashboard")}</Link></main>;
}
