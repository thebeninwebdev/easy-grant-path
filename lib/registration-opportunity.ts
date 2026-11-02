import "server-only";
import { getPublicOpportunities, type PublicOpportunity } from "@/lib/public-opportunities";
import type { DevelopmentProfile } from "@/lib/user-profile";

export interface OpportunityPreview {
  slug: string; title: string; organization: string | null; fundingMin: number | null; fundingMax: number | null;
  currency: string; deadline: string | null; countries: string[]; sectors: string[]; summary: string | null; descriptionExcerpt: string | null; verified: boolean;
}
const countryAliases: Record<string, string[]> = { CI: ["cote d'ivoire", "cote divoire", "ivory coast", "west africa", "africa"], BJ: ["benin", "west africa", "africa"], BF: ["burkina faso", "west africa", "africa"], GH: ["ghana", "west africa", "africa"], GN: ["guinea", "west africa", "africa"], ML: ["mali", "west africa", "africa"], NE: ["niger", "west africa", "africa"], NG: ["nigeria", "west africa", "africa"], SN: ["senegal", "west africa", "africa"], TG: ["togo", "west africa", "africa"], CM: ["cameroon", "africa"], KE: ["kenya", "africa"], ZA: ["south africa", "africa"] };
function plain(value: string | null) { return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null; }
function words(item: PublicOpportunity) { return [item.title, ...item.sectors].join(" ").toLowerCase(); }
function score(item: PublicOpportunity, profile: DevelopmentProfile) {
  const eligibility = [...item.countries, ...item.eligibleCountries].join(" ").toLowerCase();
  const applicantTypes = item.applicantTypes.join(" ").toLowerCase();
  const aliases = countryAliases[profile.countryCode] || [profile.countryCode.toLowerCase()];
  const countryMatches = !eligibility || aliases.some((term) => eligibility.includes(term));
  if (!countryMatches) return -1;
  const applicantMatches = !applicantTypes || applicantTypes.includes(profile.applicantType.replaceAll("_", " ")) || (profile.applicantType === "startup_sme" && /business|sme|startup|enterprise/.test(applicantTypes)) || (profile.applicantType === "ngo_nonprofit" && /ngo|nonprofit|non-profit|civil society|organization/.test(applicantTypes));
  if (!applicantMatches) return -1;
  let total = eligibility ? 5 : 1;
  if (applicantTypes) total += 4;
  if (profile.interests.some((interest) => words(item).includes(interest.replaceAll("_", " ")))) total += 4;
  if (item.type === "grant" || item.type === "startup_funding") total += 2;
  return total;
}
export async function getRegistrationOpportunity(profile: DevelopmentProfile): Promise<{ opportunity: OpportunityPreview | null; strong: boolean }> {
  const data = await getPublicOpportunities({ search: "", type: "", country: "", sector: "", deadline: "", sort: "deadline", page: 1 });
  const ranked = data.items.map((item) => ({ item, score: score(item, profile) })).filter((entry) => entry.score >= 0).sort((a, b) => b.score - a.score);
  const selected = ranked[0];
  if (!selected) return { opportunity: null, strong: false };
  const description = plain(selected.item.description);
  return { strong: selected.score >= 9, opportunity: { slug: selected.item.slug, title: selected.item.title, organization: selected.item.agency || selected.item.organization, fundingMin: selected.item.fundingMin, fundingMax: selected.item.fundingMax, currency: selected.item.currency, deadline: selected.item.deadline, countries: selected.item.eligibleCountries.length ? selected.item.eligibleCountries : selected.item.countries, sectors: selected.item.sectors, summary: selected.item.summary, descriptionExcerpt: description ? description.slice(0, 360) : null, verified: selected.item.status !== "upcoming" } };
}
