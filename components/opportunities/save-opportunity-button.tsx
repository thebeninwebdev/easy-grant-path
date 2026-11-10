"use client";

import { useTranslations } from "next-intl";
import { Bookmark } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SaveOpportunityButton({ opportunityId, initiallySaved, compact = false }: { opportunityId: string; initiallySaved: boolean; compact?: boolean }) {
  const router = useRouter();
  const t = useTranslations("Opportunities.card");
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch("/api/saved-opportunities", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId }) });
      if (!response.ok) throw new Error();
      setSaved(!saved); router.refresh();
      toast.success(saved ? t("removedToast") : t("savedToast"));
    } catch { toast.error(t("saveError")); }
    finally { setBusy(false); }
  }
  return <Button type="button" size="sm" variant={saved ? "secondary" : "outline"} className={compact ? "size-9 px-0" : ""} disabled={busy} aria-pressed={saved} onClick={() => void toggle()}>
    <Bookmark className={"size-4 " + (saved ? "fill-current" : "")} />{compact ? <span className="sr-only">{saved ? t("removeBookmark") : t("saveOpportunity")}</span> : saved ? t("saved") : t("saveOpportunity")}
  </Button>;
}
