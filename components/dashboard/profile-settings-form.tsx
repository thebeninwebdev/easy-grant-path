'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const countries = [['CI', 'Cote d\'Ivoire'], ['BJ', 'Benin'], ['BF', 'Burkina Faso'], ['GH', 'Ghana'], ['GN', 'Guinea'], ['ML', 'Mali'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['SN', 'Senegal'], ['TG', 'Togo'], ['CM', 'Cameroon'], ['KE', 'Kenya'], ['ZA', 'South Africa']] as const;
const applicants = [['individual', 'Individual'], ['student', 'Student'], ['startup_sme', 'Startup / SME'], ['ngo_nonprofit', 'NGO / Nonprofit'], ['researcher_academic', 'Researcher / Academic'], ['community_organization', 'Community organization'], ['other', 'Other']] as const;
const interests = [['agriculture', 'Agriculture'], ['climate', 'Climate / Environment'], ['education', 'Education'], ['entrepreneurship', 'Entrepreneurship / SME'], ['health', 'Health'], ['technology', 'Technology / Innovation'], ['women_girls', 'Women and Girls'], ['youth', 'Youth Development'], ['community_development', 'Community Development'], ['research', 'Research'], ['leadership', 'Leadership'], ['scholarships_study', 'Scholarships / Study']] as const;
const opportunityTypes = [['grant', 'Grants'], ['fellowship', 'Fellowships'], ['scholarship', 'Scholarships'], ['accelerator', 'Training / Accelerators'], ['other', 'Other']] as const;
const goals = [['find_opportunities', 'Find opportunities'], ['check_eligibility', 'Check eligibility'], ['prepare_applications', 'Prepare applications'], ['write_proposals', 'Write proposals']] as const;

type Form = { countryCode: string; applicantType: string; interests: string[]; opportunityTypes: string[]; primaryGoal: string };

export function ProfileSettingsForm({ initial }: { initial: Form }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  function toggle(key: 'interests' | 'opportunityTypes', value: string, max: number) {
    setForm((current) => {
      const selected = current[key].includes(value);
      if (!selected && current[key].length >= max) { toast.error(`Choose up to ${max} options.`); return current; }
      return { ...current, [key]: selected ? current[key].filter((item) => item !== value) : [...current[key], value] };
    });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.interests.length || !form.opportunityTypes.length) return toast.error('Choose at least one interest and opportunity type.');
    setSaving(true);
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Could not update your profile.');
      toast.success('Funding preferences updated.');
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update your profile.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className='space-y-7 rounded-2xl border bg-card p-5 sm:p-7'>
    <div className='grid gap-5 sm:grid-cols-2'><Field label='Country'><select required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm' value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>{countries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label='Applicant type'><select required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm' value={form.applicantType} onChange={(event) => setForm({ ...form, applicantType: event.target.value })}>{applicants.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
    <ChoiceGroup title='Interests' hint='Choose up to 3' items={interests} selected={form.interests} onToggle={(value) => toggle('interests', value, 3)} />
    <ChoiceGroup title='Preferred opportunity types' hint='Choose up to 3' items={opportunityTypes} selected={form.opportunityTypes} onToggle={(value) => toggle('opportunityTypes', value, 3)} />
    <Field label='Primary funding goal'><select required className='mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm' value={form.primaryGoal} onChange={(event) => setForm({ ...form, primaryGoal: event.target.value })}><option value=''>Choose your main goal</option>{goals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
    <div className='flex justify-end border-t pt-5'><Button type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save preferences'}</Button></div>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className='block text-sm font-medium'>{label}{children}</label>; }
function ChoiceGroup({ title, hint, items, selected, onToggle }: { title: string; hint: string; items: readonly (readonly [string, string])[]; selected: string[]; onToggle: (value: string) => void }) {
  return <fieldset><div className='flex items-center justify-between gap-3'><legend className='text-sm font-medium'>{title}</legend><span className='text-xs text-muted-foreground'>{hint}</span></div><div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'>{items.map(([value, label]) => { const active = selected.includes(value); return <button key={value} type='button' aria-pressed={active} onClick={() => onToggle(value)} className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-sm transition-colors ${active ? 'border-primary bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}>{label}{active ? <Check className='size-4' /> : null}</button>; })}</div></fieldset>;
}
