import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PublicOpportunityFilters } from '@/lib/public-opportunities';
import { OPPORTUNITY_TYPES } from '@/types/opportunities';

export function DirectoryFilters({ filters, matches }: { filters: PublicOpportunityFilters; matches: boolean }) {
  return <form action='/dashboard/opportunities' className='rounded-2xl border bg-card p-4'>
    {matches ? <input type='hidden' name='view' value='matches' /> : null}
    <div className='flex items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input name='q' defaultValue={filters.search} placeholder='Search by title, agency, or keyword' className='border-0 px-0 shadow-none focus-visible:ring-0' /><Button type='submit'>Search</Button></div>
    <div className='mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-5'>
      <select name='type' defaultValue={filters.type} className='h-10 rounded-md border bg-background px-3 text-sm'><option value=''>All opportunity types</option>{OPPORTUNITY_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select>
      <Input name='country' defaultValue={filters.country} placeholder='Country or region' />
      <Input name='sector' defaultValue={filters.sector} placeholder='Sector' />
      <select name='deadline' defaultValue={filters.deadline} className='h-10 rounded-md border bg-background px-3 text-sm'><option value=''>Any deadline</option><option value='closing-soon'>Closing soon</option><option value='this-month'>This month</option><option value='next-30-days'>Next 30 days</option><option value='none'>No deadline</option></select>
      <select name='sort' defaultValue={matches && filters.sort === 'deadline' ? 'best-match' : filters.sort} className='h-10 rounded-md border bg-background px-3 text-sm'><option value={matches ? 'best-match' : 'deadline'}>{matches ? 'Best match' : 'Nearest deadline'}</option><option value='deadline'>Closing soon</option><option value='newest'>Recently added</option><option value='funding-high'>Highest funding</option></select>
    </div>
    <div className='mt-3 flex items-center justify-between'><span className='flex items-center gap-1.5 text-xs text-muted-foreground'><SlidersHorizontal className='size-3.5' /> Refine the results above</span><Button asChild variant='ghost' size='sm'><Link href={matches ? '/dashboard/opportunities?view=matches' : '/dashboard/opportunities'}>Reset</Link></Button></div>
  </form>;
}
