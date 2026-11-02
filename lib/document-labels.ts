const labels: Record<string, string> = { CI: "Registration certificate / RCCM or equivalent", NG: "CAC registration document", GH: "Business/organization registration certificate" };
export function organizationRegistrationLabel(countryCode?: string) { return (countryCode && labels[countryCode.toUpperCase()]) || "Organization registration document"; }
