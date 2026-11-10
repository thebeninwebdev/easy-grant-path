const fs = require("node:fs");
const path = require("node:path");
function flatten(value, prefix = "", result = []) { for (const [key, child] of Object.entries(value)) { const next = prefix ? `${prefix}.${key}` : key; if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, next, result); else result.push(next); } return result.sort(); }
const en = flatten(JSON.parse(fs.readFileSync(path.join("messages", "en.json"), "utf8")));
const fr = flatten(JSON.parse(fs.readFileSync(path.join("messages", "fr.json"), "utf8")));
const missingFr = en.filter((key) => !fr.includes(key));
const missingEn = fr.filter((key) => !en.includes(key));
if (missingFr.length || missingEn.length) { console.error("Missing in French:", missingFr); console.error("Missing in English:", missingEn); process.exit(1); }
console.log(`Translation catalogs match (${en.length} keys).`);