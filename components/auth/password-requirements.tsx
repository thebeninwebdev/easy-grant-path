import { Check, Circle } from "lucide-react";

export function getPasswordRequirements(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "A mix of letters and numbers", met: /[A-Za-z]/.test(password) && /\d/.test(password) },
    { label: "A special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function PasswordRequirements({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);
  const complete = requirements.filter(({ met }) => met).length;
  const progress = password ? Math.max(1, complete) : 0;

  return <div aria-live="polite" className="space-y-2 pt-1">
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#087443] transition-all duration-200" style={{ width: `${(progress / requirements.length) * 100}%` }} /></div>
    <p className="text-xs font-medium text-foreground">Your password should have:</p>
    <ul className="space-y-1 text-xs text-muted-foreground">
      {requirements.map(({ label, met }) => <li className="flex items-center gap-1.5" key={label}>{met ? <Check aria-hidden="true" className="size-3.5 text-[#087443]" /> : <Circle aria-hidden="true" className="size-3.5" />}<span>{label}</span></li>)}
    </ul>
  </div>;
}
