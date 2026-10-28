"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error("Application error", error); }, [error]); return <main className="flex flex-1 items-center justify-center p-6"><div className="space-y-4 text-center"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="text-muted-foreground">Please try again.</p><Button onClick={reset}>Try again</Button></div></main>; }
