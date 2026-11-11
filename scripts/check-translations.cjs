/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const locales = ["en", "fr"];
const failures = [];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { failures.push(`${file}: invalid JSON (${error.message})`); return {}; }
}

function flatten(value, prefix = "", result = new Map()) {
  if (!value || typeof value !== "object") {
    failures.push(`${prefix || "<root>"}: expected a message object`);
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") flatten(child, next, result);
    else result.set(next, child);
  }
  return result;
}

function placeholders(message) {
  if (typeof message !== "string") return [];
  return [...message.matchAll(/\{([A-Za-z][\w]*)(?=\s*[,}])/g)].map((match) => match[1]).sort();
}

const catalogs = Object.fromEntries(locales.map((locale) => {
  const file = path.join("messages", `${locale}.json`);
  return [locale, {nested: readJson(file), flat: null, file}];
}));
for (const catalog of Object.values(catalogs)) catalog.flat = flatten(catalog.nested);

const allKeys = new Set(locales.flatMap((locale) => [...catalogs[locale].flat.keys()]));
for (const key of allKeys) {
  for (const locale of locales) {
    const value = catalogs[locale].flat.get(key);
    if (!catalogs[locale].flat.has(key)) failures.push(`${catalogs[locale].file}: missing ${key}`);
    else if (typeof value !== "string") failures.push(`${catalogs[locale].file}: ${key} must be a string`);
    else if (!value.trim()) failures.push(`${catalogs[locale].file}: ${key} is empty`);
  }
  const expected = placeholders(catalogs.en.flat.get(key));
  const actual = placeholders(catalogs.fr.flat.get(key));
  if (expected.join("|") !== actual.join("|")) failures.push(`${key}: placeholder mismatch (en: ${expected.join(", ") || "none"}; fr: ${actual.join(", ") || "none"})`);
}

const typesSource = fs.readFileSync(path.join("types", "opportunities.ts"), "utf8");
const typeDeclaration = typesSource.match(/OPPORTUNITY_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/);
if (!typeDeclaration) failures.push("types/opportunities.ts: unable to read OPPORTUNITY_TYPES");
else {
  const opportunityTypes = [...typeDeclaration[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  for (const locale of locales) {
    const translatedTypes = Object.keys(catalogs[locale].nested.Opportunities?.types || {});
    for (const type of opportunityTypes) if (!translatedTypes.includes(type)) failures.push(`${catalogs[locale].file}: missing dynamic key Opportunities.types.${type}`);
    for (const type of translatedTypes) if (!opportunityTypes.includes(type)) failures.push(`${catalogs[locale].file}: invalid opportunity type translation ${type}`);
  }
}

if (failures.length) {
  console.error(`Translation validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Translation catalogs are valid (${allKeys.size} keys; missing/empty/type/placeholder/dynamic checks passed).`);
