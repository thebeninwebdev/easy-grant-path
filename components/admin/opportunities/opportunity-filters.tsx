"use client";

import { Filter, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminOpportunityFilters } from "@/lib/admin-opportunities";
import { OPPORTUNITY_TYPES } from "@/types/opportunities";
import { humanize } from "./opportunity-formatters";

interface OpportunityFiltersProps {
  filters: AdminOpportunityFilters;
  sources: Array<{ slug: string; name: string }>;
}

export function OpportunityFilters({ filters, sources }: OpportunityFiltersProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query);
  const [source, setSource] = useState(filters.source);
  const [type, setType] = useState(filters.type);
  const [deadline, setDeadline] = useState(filters.deadline);
  const [relevanceMin, setRelevanceMin] = useState(filters.relevanceMin?.toString() ?? "");
  const [relevanceMax, setRelevanceMax] = useState(filters.relevanceMax?.toString() ?? "");

  function navigate(values: Record<string, string>) {
    const params = new URLSearchParams();
    if (filters.view !== "needs_review") params.set("view", filters.view);
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const target = params.size ? `/admin/opportunities?${params}` : "/admin/opportunities";
    startTransition(() => router.push(target));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ query: query.trim(), source, type, deadline, relevanceMin, relevanceMax });
  }

  const hasFilters = Boolean(filters.query || filters.source || filters.type || filters.deadline || filters.relevanceMin !== null || filters.relevanceMax !== null);

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search opportunities</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search title, organization, agency, or number"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
          <label>
            <span className="sr-only">Source</span>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm lg:w-40" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All sources</option>
              {sources.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Type</span>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm lg:w-40" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="">All types</option>
              {OPPORTUNITY_TYPES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Deadline status</span>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm lg:w-40" value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}>
              <option value="">Any deadline</option>
              <option value="active">Deadline active</option>
              <option value="passed">Deadline passed</option>
              <option value="none">No deadline</option>
            </select>
          </label>
          <div className="flex items-center gap-1">
            <Input aria-label="Minimum relevance score" type="number" min="0" max="100" value={relevanceMin} onChange={(event) => setRelevanceMin(event.target.value)} placeholder="Min score" className="min-w-0" />
            <span className="text-muted-foreground">–</span>
            <Input aria-label="Maximum relevance score" type="number" min="0" max="100" value={relevanceMax} onChange={(event) => setRelevanceMax(event.target.value)} placeholder="Max" className="min-w-0" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="size-3.5" /> Filters are applied on the server.
        </p>
        <div className="flex gap-2">
          {hasFilters ? (
            <Button type="button" size="sm" variant="ghost" disabled={isNavigating} onClick={() => navigate({})}>
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={isNavigating}>
            {isNavigating ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Apply filters
          </Button>
        </div>
      </div>
    </form>
  );
}
