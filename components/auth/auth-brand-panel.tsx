import { BadgeCheck, Compass, FileCheck2 } from "lucide-react";

const benefits = [
  { icon: Compass, title: "Discover real opportunities", description: "From trusted global and regional sources" },
  { icon: BadgeCheck, title: "Get expert support", description: "Step-by-step application guidance" },
  { icon: FileCheck2, title: "Prepare stronger applications", description: "Professional support for proposals and documents" },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden rounded-2xl bg-[#eaf4ed] p-8 text-[#102b20] lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#cfe6d5]" />
      <div className="relative">
        <p className="mb-12 inline-flex rounded-full border border-[#b8d7c1] bg-white/65 px-3 py-1 text-xs font-medium text-[#087443]">Built for people doing meaningful work</p>
        <h2 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">Funding opportunities <span className="text-[#087443]">made easier.</span></h2>
        <p className="mt-5 max-w-md text-sm leading-6 text-[#355346]">EasyGrantPath helps individuals, startups, NGOs, and organizations discover suitable funding opportunities and access professional application support services.</p>
        <div className="mt-10 space-y-6">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div className="flex items-start gap-4" key={title}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d5eed6] text-[#087443]"><Icon aria-hidden="true" className="size-5" /></span>
              <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#486357]">{description}</p></div>
            </div>
          ))}
        </div>
      </div>
      <p className="relative mt-12 max-w-sm border-t border-[#bad9c2] pt-5 text-sm italic leading-6 text-[#29483a]">&quot;Empowering people and organizations across Africa to access the funding they need.&quot;</p>
    </aside>
  );
}
