import type { Metadata } from "next";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-session";
export const metadata: Metadata = { title: "Admin" };
export default async function AdminPage() { await requireAdmin(); return <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6"><header className="flex items-center justify-between"><h1 className="text-xl font-semibold">EasyGrantPath Admin</h1><UserMenu /></header><section className="space-y-2"><p>Welcome to the admin area.</p><Link className="underline" href="/admin/opportunities">Review imported opportunities</Link></section></main>; }
