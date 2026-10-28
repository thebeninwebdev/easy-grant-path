import Link from "next/link";
export default function NotFound() { return <main className="flex flex-1 items-center justify-center p-6"><div className="space-y-3 text-center"><p className="text-sm font-medium text-muted-foreground">404</p><h1 className="text-2xl font-semibold">Page not found</h1><Link className="text-sm underline" href="/">Return home</Link></div></main>; }
