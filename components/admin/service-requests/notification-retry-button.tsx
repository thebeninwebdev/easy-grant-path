"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function NotificationRetryButton() {
  const [state, setState] = useState<"ready" | "busy" | "done" | "error">("ready");
  async function retry() { setState("busy"); const response = await fetch("/api/admin/service-requests/notifications/retry", { method: "POST" }); setState(response.ok ? "done" : "error"); if (response.ok) window.location.reload(); }
  return <Button variant="outline" size="sm" disabled={state === "busy"} onClick={() => void retry()}>{state === "busy" ? "Retrying…" : state === "error" ? "Retry failed" : state === "done" ? "Retried" : "Retry email notifications"}</Button>;
}
