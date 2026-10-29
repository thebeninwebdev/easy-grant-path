import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Admin" };
export default function AdminPage() { return <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6"><header><h1 className="text-xl font-semibold">EasyGrantPath Admin</h1><p className="mt-1 text-sm text-muted-foreground">Development administration tools</p></header><section className="space-y-2"><p>Welcome to the admin area.</p><Link className="underline" href="/admin/opportunities">Review imported opportunities</Link></section></main>; }
