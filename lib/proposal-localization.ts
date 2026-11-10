import "server-only";
import en from "@/messages/proposal-presets/en.json";
import fr from "@/messages/proposal-presets/fr.json";
import { normalizeProposalStarterId } from "@/lib/proposal-presets";
import type { SupportedLocale } from "@/lib/config";

type LocalizableSection = { key: string; title: string; guidance: string; prompt?: string; example?: string; placeholder?: string };
type LocalizableTemplate<TSection extends LocalizableSection> = { title: string; description: string; templateType: string; sections: TSection[] };

export function localizeProposalTemplate<TSection extends LocalizableSection, T extends LocalizableTemplate<TSection>>(template: T, locale: SupportedLocale): T {
  if (locale !== "fr") return template;
  const id = normalizeProposalStarterId(template.templateType);
  const english = en[id], french = fr[id];
  if (!english || !french) return template;
  return {
    ...template,
    name: undefined,
    title: template.title === english.name ? french.name : template.title,
    description: template.description === english.description ? french.description : template.description,
    sections: template.sections.map((section) => {
      const source = english.sections[section.key as keyof typeof english.sections] as Record<string, string> | undefined;
      const translated = french.sections[section.key as keyof typeof french.sections] as Record<string, string> | undefined;
      if (!source || !translated) return section;
      const replace = (field: "title" | "guidance" | "prompt" | "example" | "placeholder") => {
        const current = section[field] || "";
        return current === (source[field] || "") ? translated[field] || current : current;
      };
      return { ...section, title: replace("title"), guidance: replace("guidance"), prompt: replace("prompt"), example: replace("example"), placeholder: replace("placeholder") };
    }),
  } as T;
}
