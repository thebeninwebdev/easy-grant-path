import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

const benefits = [
  'Discover relevant funding opportunities',
  'Find grants suited to your profile',
  'Prepare and organize stronger proposals',
];

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className='grid min-h-screen bg-card lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]'>
    <section className='flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 xl:px-20'>
      <Link href='/' className='w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'><Image src='/logo.png' alt='EasyGrantPath' width={164} height={55} className='h-auto w-36 sm:w-40' priority /></Link>
      <div className='mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-12 sm:py-16'>
        <header><p className='text-sm font-semibold tracking-wide text-primary'>Welcome to EasyGrantPath</p><h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>{title}</h1><p className='mt-3 text-base leading-7 text-muted-foreground'>{description}</p></header>
        {children}
      </div>
      <footer className='text-center text-xs text-muted-foreground sm:text-left'>© EasyGrantPath. Funding opportunities, made clearer.</footer>
    </section>
    <aside className='relative hidden overflow-hidden bg-[oklch(0.29_0.085_158)] px-12 text-white lg:flex lg:flex-col lg:justify-center xl:px-16' aria-label='About EasyGrantPath'>
      <div className='absolute inset-0 opacity-30' aria-hidden='true' style={{ backgroundImage: 'radial-gradient(circle at 75% 20%, rgba(255,255,255,.18), transparent 24%), radial-gradient(circle at 15% 85%, rgba(158,226,185,.18), transparent 30%)' }} />
      <div className='absolute right-[-7rem] top-[-6rem] size-72 rounded-full border border-white/10' aria-hidden='true' />
      <div className='absolute bottom-[-8rem] left-[-6rem] size-80 rounded-full border border-white/10' aria-hidden='true' />
      <div className='relative max-w-lg'><span className='inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50'>FUNDING, WITH DIRECTION</span><h2 className='mt-7 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl'>Your next opportunity starts here.</h2><p className='mt-5 text-base leading-7 text-emerald-50/80'>Discover credible funding opportunities, explore programs suited to your goals, and prepare stronger applications with EasyGrantPath.</p><ul className='mt-10 space-y-4'>{benefits.map((benefit) => <li key={benefit} className='flex items-center gap-3 text-sm text-emerald-50'><span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10'><CheckCircle2 className='size-4' /></span>{benefit}</li>)}</ul></div>
    </aside>
  </main>;
}
