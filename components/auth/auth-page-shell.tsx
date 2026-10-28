import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function AuthPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <main className="flex flex-1 items-center justify-center p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{description}</p></CardHeader><CardContent>{children}</CardContent></Card></main>; }
