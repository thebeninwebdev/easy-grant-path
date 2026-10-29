"use client";

import { CalendarDays, ExternalLink, Eye, Landmark, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminOpportunityItem } from "@/lib/admin-opportunities";
import { formatDate, formatFunding, humanize } from "./opportunity-formatters";
import { OpportunityReviewActions, type OpportunityAction } from "./opportunity-review-actions";
import { OpportunityStatusBadge } from "./opportunity-status-badge";

interface OpportunityReviewListProps {
  items: AdminOpportunityItem[];
  busyIds: Set<string>;
  onReview: (opportunity: AdminOpportunityItem) => void;
  onAction: (opportunity: AdminOpportunityItem, action: OpportunityAction) => Promise<void>;
}

function Organization({ item }: { item: AdminOpportunityItem }) {
  return <>{item.agency || item.organization || "Organization not provided"}</>;
}

export function OpportunityReviewList({ items, busyIds, onReview, onAction }: OpportunityReviewListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-[35%] px-4 py-3 font-medium">Opportunity</th>
              <th className="w-[16%] px-4 py-3 font-medium">Source & type</th>
              <th className="w-[20%] px-4 py-3 font-medium">Funding & deadline</th>
              <th className="w-[11%] px-4 py-3 font-medium">Relevance</th>
              <th className="w-[18%] px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="align-top transition-colors hover:bg-muted/30">
                <td className="px-4 py-4">
                  <button className="text-left font-medium leading-5 hover:text-primary hover:underline" onClick={() => onReview(item)}>
                    {item.title}
                  </button>
                  <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground"><Organization item={item} /></p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <OpportunityStatusBadge status={item.verificationStatus} />
                    {item.opportunityNumber ? <Badge variant="outline">#{item.opportunityNumber}</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium">{item.source.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{humanize(item.type)}</p>
                  {item.officialUrl ? <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={item.officialUrl} target="_blank" rel="noreferrer">
                    Official source <ExternalLink className="size-3" />
                  </a> : <p className="mt-2 text-xs text-muted-foreground">No source link</p>}
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium">{formatFunding(item)}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> {formatDate(item.deadline)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="flex items-center gap-1.5 font-semibold"><Sparkles className="size-3.5 text-amber-600" />{item.relevanceScore}/100</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.relevanceReasons.join(", ") || "No reason supplied"}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onReview(item)}><Eye className="size-4" /> Review</Button>
                    <OpportunityReviewActions
                      opportunity={item}
                      busy={busyIds.has(item.id)}
                      compact
                      onAction={(action) => onAction(item, action)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:hidden">
        {items.map((item) => (
          <Card key={item.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <OpportunityStatusBadge status={item.verificationStatus} />
                <Badge variant="outline">{item.source.name}</Badge>
                <Badge variant="secondary">{humanize(item.type)}</Badge>
              </div>
              <h3 className="mt-3 font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Landmark className="size-4" /><Organization item={item} /></p>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Funding</p><p className="mt-1 font-medium">{formatFunding(item)}</p></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1 font-medium">{formatDate(item.deadline)}</p></div>
                <div><p className="text-xs text-muted-foreground">Relevance</p><p className="mt-1 font-medium">{item.relevanceScore}/100</p></div>
                <div><p className="text-xs text-muted-foreground">Number</p><p className="mt-1 font-medium">{item.opportunityNumber || "Not provided"}</p></div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={() => onReview(item)}><Eye className="size-4" /> Review details</Button>
                <OpportunityReviewActions
                  opportunity={item}
                  busy={busyIds.has(item.id)}
                  onAction={(action) => onAction(item, action)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
