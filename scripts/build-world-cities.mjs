/**
 * Build shared/worldCities50k.json from all-the-cities (pop >= 50k),
 * sorted by accent-folded name for binary-search typeahead.
 *
 *   node scripts/build-world-cities.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cities = require("all-the-cities");

function fold(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const MIN_POP = 50_000;
const rows = cities
  .filter((c) => (c.population || 0) >= MIN_POP && c.name && c.loc?.coordinates)
  .map((c) => ({
    name: c.name,
    folded: fold(c.name),
    country: c.country || "",
    lat: Number(c.loc.coordinates[1].toFixed(4)),
    lng: Number(c.loc.coordinates[0].toFixed(4)),
    population: c.population || 0,
  }))
  .filter((c) => c.folded.length > 0);

rows.sort(
  (a, b) => a.folded.localeCompare(b.folded) || b.population - a.population,
);

const outPath = path.join("shared", "worldCities50k.json");
fs.writeFileSync(outPath, JSON.stringify(rows));
console.log(
  `Wrote ${rows.length} cities (${Math.round(fs.statSync(outPath).size / 1024)} KB) → ${outPath}`,
);
