// npm run check — validates the manifest and every module before you push.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "modules");
const TYPES = new Set(["text","quote","cards","panels","tracks","board","team","table","steps","ladder","ring","checklist","code","dosdonts","swatches"]);
const GROUNDS = new Set(["cream","blue","ink","lime","cobalt"]);
const errors = [], warns = [];

function read(file) {
  const p = join(root, file);
  if (!existsSync(p)) { errors.push(`${file}: listed in manifest but the file doesn't exist`); return null; }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { errors.push(`${file}: JSON typo → ${e.message}`); return null; }
}

const man = read("manifest.json");
if (man) {
  if (!Array.isArray(man.modules)) errors.push("manifest.json: needs a \"modules\" list");
  const ids = new Set(), listed = new Set();
  for (const entry of man.modules || []) {
    listed.add(entry.file);
    const m = read(entry.file);
    if (!m) continue;
    const tag = `${entry.file}`;
    for (const k of ["id", "stamp", "title"]) if (!m[k]) errors.push(`${tag}: missing "${k}"`);
    if (m.id && ids.has(m.id)) errors.push(`${tag}: id "${m.id}" is used twice`);
    ids.add(m.id);
    if (m.ground && !GROUNDS.has(m.ground)) errors.push(`${tag}: ground "${m.ground}" — use ${[...GROUNDS].join(", ")}`);
    (m.blocks || []).forEach((b, i) => { if (!TYPES.has(b.type)) errors.push(`${tag}: block ${i + 1} has unknown type "${b.type}"`); });
  }
  for (const f of readdirSync(root)) {
    if (f.endsWith(".json") && f !== "manifest.json" && !f.startsWith("_") && !listed.has(f)) warns.push(`${f}: not in manifest (won't show)`);
  }
}

warns.forEach(w => console.log("  note  " + w));
if (errors.length) { errors.forEach(e => console.log("  ERROR " + e)); console.log(`\n✗ ${errors.length} problem(s)`); process.exit(1); }
console.log(`✓ HQ modules look good (${(man?.modules || []).filter(m => m.on !== false).length} on)`);
