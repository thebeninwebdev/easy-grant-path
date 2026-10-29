import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { humanize } from "./opportunity-formatters";

const styles: Record<string, string> = {
  needs_review: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  open: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closing_soon: "border-orange-200 bg-orange-50 text-orange-800",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
  archived: "border-slate-200 bg-slate-100 text-slate-700",
  upcoming: "border-blue-200 bg-blue-50 text-blue-800",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
};

export function OpportunityStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {humanize(status)}
    </Badge>
  );
}
