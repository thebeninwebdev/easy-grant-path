"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { opportunityFaviconUrl } from "@/lib/opportunity-favicon";

type OpportunityLinks = { applicationUrl?: string | null; officialUrl?: string | null; discoveryUrl?: string | null };

export function OpportunityFavicon({ opportunity, organization, className = "" }: { opportunity: OpportunityLinks; organization: string; className?: string }) {
  const favicon = opportunityFaviconUrl(opportunity);
  return <FaviconImage key={favicon || "none"} initialSrc={favicon} organization={organization} className={className} />;
}

function FaviconImage({ initialSrc, organization, className }: { initialSrc: string | null; organization: string; className: string }) {
  const t = useTranslations("Opportunities.card");
  const [src, setSrc] = useState(initialSrc);
  return <span className={"flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background " + className}>{src ? <img src={src} alt={t("websiteIcon", {organization})} className="size-full object-contain p-1" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" onError={() => src === "/favicon.ico" ? setSrc(null) : setSrc("/favicon.ico")} /> : <Landmark className="size-5 text-muted-foreground" aria-hidden="true" />}</span>;
}
