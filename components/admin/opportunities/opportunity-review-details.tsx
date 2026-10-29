"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { AdminOpportunityItem } from "@/lib/admin-opportunities";
import { formatDate, formatFunding, humanize } from "./opportunity-formatters";
import { OpportunityReviewActions, type OpportunityAction } from "./opportunity-review-actions";
import { OpportunityStatusBadge } from "./opportunity-status-badge";

interface OpportunityReviewDetailsProps {
  opportunity: AdminOpportunityItem | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (opportunity: AdminOpportunityItem, action: OpportunityAction) => Promise<void>;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children || "Not provided"}</dd>
    </div>
  );
}

function TagList({ values }: { values: string[] }) {
  if (!values.length) return <span className="text-muted-foreground">Not provided</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => <Badge key={value} variant="secondary">{value}</Badge>)}
    </div>
  );
}

export function OpportunityReviewDetails({ opportunity, busy, onOpenChange, onAction }: OpportunityReviewDetailsProps) {
  return (
    <Dialog open={Boolean(opportunity)} onOpenChange={onOpenChange}>
      {opportunity ? (
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
          <DialogHeader className="border-b bg-muted/40 px-6 py-5 pr-14">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <OpportunityStatusBadge status={opportunity.verificationStatus} />
              <OpportunityStatusBadge status={opportunity.status} />
              <Badge variant="outline">Imported from {opportunity.source.name}</Badge>
            </div>
            <DialogTitle className="text-xl leading-snug">{opportunity.title}</DialogTitle>
            <DialogDescription>
              Review imported information against the official source before verifying it for EasyGrantPath users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-7 px-6 py-6">
            <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-medium text-emerald-950">Verify with the issuing source</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      EasyGrantPath imported this record; the grant is issued by the organization shown on the official page.
                    </p>
                  </div>
                </div>
                {opportunity.officialUrl ? <Button asChild className="shrink-0">
                  <a href={opportunity.officialUrl} target="_blank" rel="noreferrer">
                    View official opportunity <ExternalLink className="size-4" />
                  </a>
                </Button> : <Badge variant="outline">No official URL provided</Badge>}
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-semibold">Overview</h3>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Organization">{opportunity.organization}</Detail>
                <Detail label="Agency">{opportunity.agency}</Detail>
                <Detail label="Opportunity number">{opportunity.opportunityNumber}</Detail>
                <Detail label="Grant type">{humanize(opportunity.type)}</Detail>
                <Detail label="Funding">{formatFunding(opportunity)}</Detail>
                <Detail label="Currency">{opportunity.currency}</Detail>
                <Detail label="Opening date">{formatDate(opportunity.openingDate)}</Detail>
                <Detail label="Deadline">{formatDate(opportunity.deadline)}</Detail>
                <Detail label="Relevance score">{opportunity.relevanceScore}/100</Detail>
              </dl>
            </section>

            <Separator />

            <section className="space-y-5">
              <div>
                <h3 className="font-semibold">Summary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {opportunity.summary || "No summary was supplied by the source."}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Full description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {opportunity.description || "No full description was supplied by the source."}
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="mb-4 font-semibold">Eligibility and focus</h3>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label="Applicant types"><TagList values={opportunity.applicantTypes} /></Detail>
                <Detail label="Sectors"><TagList values={opportunity.sectors} /></Detail>
                <Detail label="Countries"><TagList values={opportunity.countries} /></Detail>
                <Detail label="Eligible countries"><TagList values={opportunity.eligibleCountries} /></Detail>
              </dl>
            </section>

            <Separator />

            <section>
              <h3 className="mb-4 font-semibold">Source and verification</h3>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Source">{opportunity.source.name}</Detail>
                <Detail label="Source type">{humanize(opportunity.source.type)}</Detail>
                <Detail label="Source external ID">{opportunity.source.externalId}</Detail>
                <Detail label="Last checked">{formatDate(opportunity.lastCheckedAt)}</Detail>
                <Detail label="Source last updated">{formatDate(opportunity.sourceLastUpdatedAt)}</Detail>
                <Detail label="Verified at">{formatDate(opportunity.verifiedAt)}</Detail>
                <Detail label="Verification state"><OpportunityStatusBadge status={opportunity.verificationStatus} /></Detail>
                <Detail label="Current status"><OpportunityStatusBadge status={opportunity.status} /></Detail>
                <Detail label="Discovery page">
                  {opportunity.discoveryUrl ? (
                    <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={opportunity.discoveryUrl} target="_blank" rel="noreferrer">
                      Open discovery URL <ExternalLink className="size-3.5" />
                    </a>
                  ) : "Not provided"}
                </Detail>
              </dl>
              <div className="mt-5">
                <Detail label="Relevance reasons"><TagList values={opportunity.relevanceReasons} /></Detail>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <OpportunityReviewActions
              opportunity={opportunity}
              busy={busy}
              showArchive
              onAction={(action) => onAction(opportunity, action)}
            />
            <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
