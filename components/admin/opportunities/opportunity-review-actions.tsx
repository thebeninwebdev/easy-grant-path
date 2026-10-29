"use client";

import { Archive, Check, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminOpportunityItem } from "@/lib/admin-opportunities";

export type OpportunityAction = "verify" | "reject" | "archive";

interface OpportunityReviewActionsProps {
  opportunity: AdminOpportunityItem;
  busy: boolean;
  onAction: (action: OpportunityAction) => Promise<void>;
  compact?: boolean;
  showArchive?: boolean;
}

export function OpportunityReviewActions({
  opportunity,
  busy,
  onAction,
  compact = false,
  showArchive = false,
}: OpportunityReviewActionsProps) {
  const [confirmReject, setConfirmReject] = useState(false);

  async function reject() {
    await onAction("reject");
    setConfirmReject(false);
  }

  const isPending = opportunity.verificationStatus === "needs_review" && opportunity.status !== "archived";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isPending ? (
          <>
            <Button size={compact ? "sm" : "default"} disabled={busy} onClick={() => onAction("verify")}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              Verify
            </Button>
            <Button
              size={compact ? "sm" : "default"}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={busy}
              onClick={() => setConfirmReject(true)}
            >
              <X className="size-4" /> Reject
            </Button>
          </>
        ) : null}
        {showArchive && opportunity.status !== "archived" ? (
          <Button size={compact ? "sm" : "default"} variant="ghost" disabled={busy} onClick={() => onAction("archive")}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Archive className="size-4" />}
            Archive
          </Button>
        ) : null}
      </div>

      <Dialog open={confirmReject} onOpenChange={(open) => !busy && setConfirmReject(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this opportunity?</DialogTitle>
            <DialogDescription>
              “{opportunity.title}” will be removed from the pending review queue and moved to Rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setConfirmReject(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={reject}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Reject opportunity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
