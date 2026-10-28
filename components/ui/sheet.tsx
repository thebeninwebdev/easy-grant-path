"use client";
import type * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const Sheet = DialogPrimitive.Root; const SheetTrigger = DialogPrimitive.Trigger; const SheetClose = DialogPrimitive.Close;
function SheetContent({ className, children, side = "right", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left" }) { const sides = { top: "inset-x-0 top-0 border-b", right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", bottom: "inset-x-0 bottom-0 border-t", left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm" }; return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" /><DialogPrimitive.Content className={cn("fixed z-50 bg-background p-6 shadow-lg", sides[side], className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4"><X className="size-4" /><span className="sr-only">Close</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>; }
export { Sheet, SheetClose, SheetContent, SheetTrigger };
