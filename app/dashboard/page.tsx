import type { Metadata } from "next";
export const metadata: Metadata = { title: "Dashboard" };
export default function DashboardPage() { return <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6"><header><h1 className="text-xl font-semibold">EasyGrantPath Dashboard</h1></header><section className="space-y-2"><p>Welcome to the dashboard.</p><p className="text-muted-foreground">Core platform features are under development.</p></section></main>; }
