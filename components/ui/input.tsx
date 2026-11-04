import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) { return <input type={type} className={cn("flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20", className)} {...props} />; }
export { Input };
