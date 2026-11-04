'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  label: string;
  error?: string;
  guidance?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput({ id, label, error, guidance, className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const fieldId = id || props.name || 'password';
  const describedBy = error ? `${fieldId}-error` : guidance ? `${fieldId}-guidance` : undefined;
  return <div>
    <label htmlFor={fieldId} className='text-sm font-medium'>{label}</label>
    <div className='relative mt-2'>
      <Input ref={ref} id={fieldId} type={visible ? 'text' : 'password'} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={cn('h-12 pr-12', error && 'border-destructive focus-visible:ring-destructive', className)} {...props} />
      <button type='button' aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible((current) => !current)} className='absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'>{visible ? <EyeOff className='size-[18px]' aria-hidden='true' /> : <Eye className='size-[18px]' aria-hidden='true' />}</button>
    </div>
    {error ? <p id={`${fieldId}-error`} role='alert' className='mt-1.5 text-xs text-destructive'>{error}</p> : guidance ? <p id={`${fieldId}-guidance`} className='mt-1.5 text-xs text-muted-foreground'>{guidance}</p> : null}
  </div>;
});
