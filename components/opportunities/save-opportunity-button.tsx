'use client';

import { Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function SaveOpportunityButton({ opportunityId, initiallySaved, compact = false }: { opportunityId: string; initiallySaved: boolean; compact?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch('/api/saved-opportunities', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId }),
      });
      if (!response.ok) throw new Error('Could not update this saved opportunity.');
      setSaved(!saved);
      router.refresh();
      toast.success(saved ? 'Removed from saved opportunities.' : 'Saved for later.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this saved opportunity.');
    } finally { setBusy(false); }
  }
  return <Button type='button' size='sm' variant={saved ? 'secondary' : 'outline'} className={compact ? 'size-9 px-0' : ''} disabled={busy} aria-pressed={saved} onClick={() => void toggle()}>
    <Bookmark className={`size-4 ${saved ? 'fill-current' : ''}`} />{compact ? <span className='sr-only'>{saved ? 'Remove bookmark' : 'Save opportunity'}</span> : saved ? 'Saved' : 'Save'}
  </Button>;
}
