"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Bookmark, Compass, CreditCard, MessageCircle, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const bareRoutes = ["/dashboard/onboarding", "/dashboard/teaser", "/dashboard/activate"];

function NavContent({ pathname, verificationHref, name, email, mobile = false, onSignOut }: { pathname: string; verificationHref: string; name: string; email: string; mobile?: boolean; onSignOut: () => void }) {
  const t = useTranslations("Dashboard.nav");
  const items = [
    { label: t("overview"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("discoverOpportunities"), href: "/dashboard/opportunities", icon: Compass },
    { label: t("myMatches"), href: "/dashboard/opportunities?view=matches", icon: Sparkles },
    { label: t("savedOpportunities"), href: "/dashboard/saved", icon: Bookmark },
    { label: t("myProposals"), href: "/dashboard/proposals", icon: FileText },
    { label: t("proposalServices"), href: "/dashboard/assistance", icon: MessageCircle },
    { label: t("payments"), href: "/dashboard/payments", icon: CreditCard },
    { label: t("verification"), href: verificationHref, icon: ShieldCheck },
    { label: t("accountProfile"), href: "/dashboard/settings", icon: Settings },
  ];
  return <div className="flex h-full flex-col">
    <Link href="/dashboard" className="flex h-20 items-center border-b px-6"><Image src="/logo.png" alt="EasyGrantPath" width={160} height={54} className="h-auto w-36" priority /></Link>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label={t("navigationLabel")}>
      {items.map(({ label, href, icon: Icon }) => {
        const base = href.split("?")[0];
        const active = base === "/dashboard" ? pathname === base : pathname === base || pathname.startsWith(base + "/");
        const link = <Link href={href as never} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-primary/10 text-primary")}>
          <Icon className="size-[18px]" /><span>{label}</span>
        </Link>;
        return mobile ? <SheetClose key={label} asChild>{link}</SheetClose> : <div key={label}>{link}</div>;
      })}
    </nav>
    <div className="border-t p-3">
      <LanguageSwitcher className="mb-2 w-full justify-center" compact />
      <div className="flex items-center gap-3 rounded-xl p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="size-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name || t("yourAccount")}</p><p className="truncate text-xs text-muted-foreground">{email}</p></div>
      </div>
      <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={onSignOut}><LogOut className="size-4" /> {t("signOut")}</Button>
    </div>
  </div>;
}

export function DashboardShell({ children, name, email, applicantType }: { children: ReactNode; name: string; email: string; applicantType?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = useTranslations("Navigation");
  if (bareRoutes.some((route) => pathname.startsWith(route))) return <><div className="fixed right-4 top-4 z-50"><LanguageSwitcher compact /></div>{children}</>;
  const organization = ["startup_sme", "ngo_nonprofit", "community_organization"].includes(applicantType || "");
  const verificationHref = organization ? "/dashboard/verification/organization" : "/dashboard/verification/identity";
  async function signOut() { await authClient.signOut(); router.push("/sign-in"); router.refresh(); }
  return <div className="min-h-screen bg-muted/25 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block"><NavContent pathname={pathname} verificationHref={verificationHref} name={name} email={email} onSignOut={() => void signOut()} /></aside>
    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard"><Image src="/logo.png" alt="EasyGrantPath" width={132} height={44} className="h-auto w-28" priority /></Link>
        <div className="flex items-center gap-2"><LanguageSwitcher compact /><Sheet><SheetTrigger asChild><Button variant="outline" className="size-10 p-0" aria-label={nav("openNavigation")}><Menu className="size-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="w-[min(88vw,320px)] p-0"><NavContent mobile pathname={pathname} verificationHref={verificationHref} name={name} email={email} onSignOut={() => void signOut()} /></SheetContent>
        </Sheet></div>
      </header>
      <div className="min-w-0">{children}</div>
    </div>
  </div>;
}
