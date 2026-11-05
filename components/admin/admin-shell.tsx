"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
const nav: Array<[string, string]> = [
  ["/admin", "Overview"],
  ["/admin/opportunities", "Opportunities"],
  ["/admin/customers", "Customers"],
  ["/admin/payments", "Payments"],
  ["/admin/service-requests", "Service Requests"],
  ["/admin/verifications", "Verifications"],
  ["/admin/sources", "Sources & sync"],
  ["/admin/proposal-templates", "Templates"],
  ["/admin/analytics", "Analytics"],
  ["/admin/activity", "Activity log"],
];

export function AdminShell(props: {
  children: React.ReactNode; name: string; email: string; attentionCount: number;
}) {
  const path = usePathname();
  const router = useRouter();
  return <div className="min-h-screen bg-muted/25 lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="border-b bg-background lg:min-h-screen lg:border-r">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="font-semibold">EasyGrantPath <span className="text-primary">Admin</span></Link>
        {!!props.attentionCount && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">{props.attentionCount}</span>}
      </div>
      <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
        {nav.map(([href, label]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return <Link key={href} href={href} className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{label}</Link>;
        })}
      </nav>
    </aside>
    <div className="min-w-0">
      <header className="flex min-h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <form action="/admin/search" className="hidden w-full max-w-md sm:block"><input name="q" aria-label="Search admin records" placeholder="Search opportunities or customers" className="h-9 w-full rounded-md border bg-background px-3 text-sm" /></form>
        <div className="ml-auto text-right"><p className="text-sm font-medium">{props.name}</p><p className="text-xs text-muted-foreground">{props.email}</p></div>
        <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void authClient.signOut().then(() => { router.push("/sign-in"); router.refresh(); })}>Sign out</button>
      </header>
      <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{props.children}</main>
    </div>
  </div>;
}
