"use client";

import { useMemo } from "react";
import { sanitizeOpportunityHtml } from "@/lib/opportunity-content";
import { cn } from "@/lib/utils";

interface OpportunityRichContentProps {
  content: string | null | undefined;
  fallback?: string;
  className?: string;
}

export function OpportunityRichContent({ content, fallback = "No full description was supplied by the source.", className }: OpportunityRichContentProps) {
  const safeHtml = useMemo(() => sanitizeOpportunityHtml(content), [content]);
  if (!safeHtml) return <p className={cn("text-sm leading-6 text-muted-foreground", className)}>{fallback}</p>;

  return <div
    className={cn(
      "min-w-0 break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]",
      "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_br]:leading-7",
      "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground",
      "[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
      "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-foreground",
      "[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-foreground",
      "[&_h5]:my-3 [&_h5]:font-semibold [&_h5]:text-foreground [&_h6]:my-3 [&_h6]:font-semibold [&_h6]:text-foreground",
      "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6",
      "[&_li>ul]:my-1.5 [&_li>ol]:my-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground",
      "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
      "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary/80",
      className,
    )}
    dangerouslySetInnerHTML={{ __html: safeHtml }}
  />;
}
