"use client";

import { Archive, BadgeCheck, CircleX, Inbox, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
  AdminOpportunityCounts,
  AdminOpportunityFilters,
  AdminOpportunityItem,
  AdminOpportunityResult,
  AdminOpportunityView,
} from "@/lib/admin-opportunities";
import { cn } from "@/lib/utils";
import { OpportunityFilters } from "./opportunity-filters";
import { OpportunityReviewDetails } from "./opportunity-review-details";
import { OpportunityReviewList } from "./opportunity-review-list";
import type { OpportunityAction } from "./opportunity-review-actions";

const views: Array<{ key: AdminOpportunityView; label: string; icon: typeof Inbox }> = [
  { key: "needs_review", label: "Needs review", icon: Inbox },
  { key: "verified", label: "Verified", icon: BadgeCheck },
  { key: "rejected", label: "Rejected", icon: CircleX },
  { key: "archived", label: "Archived", icon: Archive },
];

interface OpportunityReviewWorkspaceProps {
  initialData: AdminOpportunityResult;
  filters: AdminOpportunityFilters;
}

function paramsFor(filters: AdminOpportunityFilters, changes: Record<string, string | number | null>) {
  const values: Record<string, string> = {
    view: filters.view,
    query: filters.query,
    source: filters.source,
    type: filters.type,
    deadline: filters.deadline,
    relevanceMin: filters.relevanceMin?.toString() ?? "",
    relevanceMax: filters.relevanceMax?.toString() ?? "",
    page: filters.page.toString(),
  };
  Object.entries(changes).forEach(([key, value]) => { values[key] = value === null ? "" : String(value); });
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (!value || (key === "view" && value === "needs_review") || (key === "page" && value === "1")) return;
    params.set(key, value);
  });
  return params.size ? `/admin/opportunities?${params}` : "/admin/opportunities";
}

function bucket(item: AdminOpportunityItem): keyof AdminOpportunityCounts | null {
  if (item.status === "archived") return "archived";
  if (["needs_review", "verified", "rejected"].includes(item.verificationStatus)) {
    return item.verificationStatus as keyof AdminOpportunityCounts;
  }
  return null;
}

export function OpportunityReviewWorkspace({ initialData, filters }: OpportunityReviewWorkspaceProps) {
  const [items, setItems] = useState(initialData.items);
  const [counts, setCounts] = useState(initialData.counts);
  const [total, setTotal] = useState(initialData.total);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const busyIdsRef = useRef(new Set<string>());
  const [selected, setSelected] = useState<AdminOpportunityItem | null>(null);

  const hasActiveFilters = Boolean(filters.query || filters.source || filters.type || filters.deadline || filters.relevanceMin !== null || filters.relevanceMax !== null);
  const totalPages = Math.max(1, Math.ceil(total / initialData.pageSize));

  async function mutate(opportunity: AdminOpportunityItem, action: OpportunityAction) {
    if (busyIdsRef.current.has(opportunity.id)) return;
    const originalIndex = items.findIndex((item) => item.id === opportunity.id);
    const from = bucket(opportunity);
    const to: keyof AdminOpportunityCounts = action === "verify" ? "verified" : action === "reject" ? "rejected" : "archived";

    busyIdsRef.current.add(opportunity.id);
    setBusyIds((current) => new Set(current).add(opportunity.id));
    setItems((current) => current.filter((item) => item.id !== opportunity.id));
    setTotal((current) => Math.max(0, current - 1));
    setCounts((current) => ({
      ...current,
      ...(from ? { [from]: Math.max(0, current[from] - 1) } : {}),
      [to]: current[to] + (from === to ? 0 : 1),
    }));

    try {
      const response = await fetch(`/api/admin/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "The opportunity could not be updated.");

      setSelected(null);
      toast.success(action === "verify" ? "Opportunity verified successfully." : action === "reject" ? "Opportunity rejected." : "Opportunity archived.");
    } catch (error) {
      setItems((current) => {
        if (current.some((item) => item.id === opportunity.id)) return current;
        const restored = [...current];
        restored.splice(Math.max(0, originalIndex), 0, opportunity);
        return restored;
      });
      setTotal((current) => current + 1);
      setCounts((current) => ({
        ...current,
        ...(from ? { [from]: current[from] + 1 } : {}),
        [to]: Math.max(0, current[to] - (from === to ? 0 : 1)),
      }));
      toast.error(error instanceof Error ? error.message : "The opportunity could not be updated.");
    } finally {
      busyIdsRef.current.delete(opportunity.id);
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(opportunity.id);
        return next;
      });
    }
  }

  const emptyMessage = useMemo(() => {
    if (hasActiveFilters) return "No opportunities match your search or filters.";
    if (filters.view === "needs_review") return "No opportunities are waiting for review.";
    if (filters.view === "rejected") return "There are no rejected opportunities.";
    if (filters.view === "verified") return "There are no verified opportunities yet.";
    return "There are no archived opportunities.";
  }, [filters.view, hasActiveFilters]);

  return (
    <div className="space-y-5">
      <nav className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Opportunity review status">
        {views.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={paramsFor(filters, { view: key, page: 1 })}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40",
              filters.view === key && "border-primary ring-1 ring-primary/20",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <Icon className={cn("size-4 text-muted-foreground", filters.view === key && "text-primary")} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{counts[key].toLocaleString()}</p>
          </Link>
        ))}
      </nav>

      <OpportunityFilters filters={filters} sources={initialData.sourceOptions} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "opportunity" : "opportunities"}
          {hasActiveFilters ? " matching filters" : ""}
        </p>
        {total > 0 ? <p className="text-xs text-muted-foreground">Page {filters.page} of {totalPages}</p> : null}
      </div>

      {items.length ? (
        <OpportunityReviewList items={items} busyIds={busyIds} onReview={setSelected} onAction={mutate} />
      ) : (
        <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <SearchX className="mx-auto size-9 text-muted-foreground/60" />
          <h2 className="mt-4 font-semibold">{emptyMessage}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {hasActiveFilters ? "Try clearing one or more filters." : "New imported records will appear here when they are available."}
          </p>
          {hasActiveFilters ? <Button asChild variant="outline" className="mt-5"><Link href={paramsFor(filters, { query: null, source: null, type: null, deadline: null, relevanceMin: null, relevanceMax: null, page: 1 })}>Clear filters</Link></Button> : null}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between rounded-xl border bg-card p-3" aria-label="Pagination">
          <Button asChild={filters.page > 1} variant="outline" size="sm" disabled={filters.page <= 1}>
            {filters.page > 1 ? <Link href={paramsFor(filters, { page: filters.page - 1 })}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span className="text-sm text-muted-foreground">Page {filters.page} of {totalPages}</span>
          <Button asChild={filters.page < totalPages} variant="outline" size="sm" disabled={filters.page >= totalPages}>
            {filters.page < totalPages ? <Link href={paramsFor(filters, { page: filters.page + 1 })}>Next</Link> : <span>Next</span>}
          </Button>
        </nav>
      ) : null}

      <OpportunityReviewDetails
        opportunity={selected}
        busy={selected ? busyIds.has(selected.id) : false}
        onOpenChange={(open) => !open && setSelected(null)}
        onAction={mutate}
      />
    </div>
  );
}
