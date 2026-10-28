"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { USER_ROLES } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export function UserMenu() { const router = useRouter(); const { data: session } = authClient.useSession(); const user = session?.user as { name?: string; email?: string; role?: string } | undefined; if (!user) return null; async function signOut() { await authClient.signOut(); router.replace("/login"); router.refresh(); } return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">{user.name ?? "Account"}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel><span className="block">{user.name}</span><span className="font-normal text-muted-foreground">{user.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => router.push("/dashboard")}>Dashboard</DropdownMenuItem>{user.role === USER_ROLES.ADMIN && <DropdownMenuItem onSelect={() => router.push("/admin")}>Admin</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>; }
