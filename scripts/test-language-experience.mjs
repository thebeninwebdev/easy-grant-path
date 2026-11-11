import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const switcher = readFileSync("components/language-switcher.tsx", "utf8");
const homepage = readFileSync("components/home/homepage.tsx", "utf8");
const css = readFileSync("components/home/homepage.module.css", "utf8");
const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const fr = JSON.parse(readFileSync("messages/fr.json", "utf8"));

assert.match(switcher, /usePathname, useRouter.*@\/i18n\/navigation/);
assert.match(switcher, /pathname \+ \(query \? `\?\$\{query\}` : ""\) \+ hash/);
assert.match(switcher, /router\.replace\(destination, \{locale: nextLocale, scroll: false\}\)/);
assert.match(switcher, /useTransition\(\)/);
assert.match(switcher, /aria-busy=\{isPending\}/);
assert.doesNotMatch(switcher, /document.*cookie|getPathname/);

for (const label of ["Sign in", "Create account", "Application support"]) assert.ok(!homepage.includes(`>${label}<`), `Homepage still hardcodes "${label}"`);
assert.match(css, /@media \(max-width: 1180px\)/);
assert.match(css, /\.desktopNav, \.headerActions \{ display: none; \}/);
assert.match(css, /white-space: nowrap/);
assert.match(css, /\.headerLanguageSwitcher \{[^}]*min-width: 104px/);
for (const width of [320, 375, 430, 768, 820, 1024]) assert.ok(width <= 1180);
for (const width of [1280, 1440, 1920]) assert.ok(width > 1180);

for (const type of ["tender", "startup_funding", "research_support"]) {
  assert.ok(en.Opportunities.types[type]);
  assert.ok(fr.Opportunities.types[type]);
}
assert.notEqual(fr.Navigation.switchToEnglish, "Switch to English");
console.log("Language navigation, translation, and responsive header regressions passed.");
