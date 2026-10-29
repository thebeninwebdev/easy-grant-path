import { Skeleton } from "@/components/ui/skeleton";

export default function OpportunityReviewLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
    </main>
  );
}
