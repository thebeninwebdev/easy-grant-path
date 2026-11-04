"use client";

/* Runtime-discovered hosts are validated server-side and cannot be safely enumerated in next/image remotePatterns. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { ImageIcon, Landmark } from "lucide-react";
import type { OpportunityImageMetadata } from "@/services/opportunity-extraction/image-discovery";

export function OpportunityBanner({ image, alt, eager = false, className = "" }: { image: OpportunityImageMetadata | null; alt: string; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image?.url]);
  return <div className={"relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-emerald-50 " + className}>
    {image && !failed
      ? <img src={image.url} alt={image.alt || alt} className="h-full w-full object-cover" width={image.width} height={image.height} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <div className="flex h-full items-center justify-center" role="img" aria-label="No opportunity image available"><ImageIcon className="size-8 text-muted-foreground/45" /></div>}
  </div>;
}

export function OrganizationLogo({ image, organization, className = "" }: { image: OpportunityImageMetadata | null; organization: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image?.url]);
  return <div className={"flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background " + className}>
    {image && !failed
      ? <img src={image.url} alt={image.alt || organization + " logo"} className="max-h-full max-w-full object-contain p-1" width={image.width} height={image.height} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <Landmark className="size-5 text-muted-foreground" aria-hidden="true" />}
  </div>;
}
