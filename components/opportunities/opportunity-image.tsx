"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { opportunityFaviconUrl } from "@/lib/opportunity-favicon";
export function OpportunityFavicon({ opportunity, organization, className = "" }: { opportunity: { applicationUrl?: string | null; officialUrl?: string | null; discoveryUrl?: string | null }; organization: string; className?: string }) { const favicon = opportunityFaviconUrl(opportunity); const [src, setSrc] = useState(favicon); useEffect(() => setSrc(favicon), [favicon]); return <span className={"flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background " + className}>{src ? <img src={src} alt={organization + " website icon"} className="size-full object-contain p-1" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" onError={() => src === "/favicon.ico" ? setSrc(null) : setSrc("/favicon.ico")} /> : <Landmark className="size-5 text-muted-foreground" aria-hidden="true" />}</span>; }
