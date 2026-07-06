import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  hexToRgb,
  hexToHsl,
  hexToCmyk,
  hexToLab,
  hexToOklch,
  getHarmonies,
  getTintsAndShades,
  findNearestColors,
} from '../src/lib/color-math.ts';
import { slugify } from '../src/lib/slug.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dataDir = join(rootDir, 'data', 'colors');
const SHARD_SIZE = 1000;

function loadBestOfColors() {
  const pkgPath = join(
    rootDir,
    'node_modules',
    'color-name-list',
    'dist',
    'colornames.bestof.json',
  );
  const raw = readFileSync(pkgPath, 'utf-8');
  return JSON.parse(raw);
}

function dedupeBySlug(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const slug = slugify(entry.name, entry.hex);
    if (!seen.has(slug)) {
      seen.set(slug, { name: entry.name, hex: entry.hex.toLowerCase(), slug });
    }
  }
  return [...seen.values()];
}

function toLinkableEntry(n) {
  return { name: n.name, slug: n.slug, hex: n.hex };
}

// getHarmonies() computes theoretically "ideal" hues via OKLCH rotation — those exact hex values
// almost never match an existing named color, so they can't be linked to directly. Per spec §4.1
// ("每個和諧色可點擊連到該色頁面...這是內部連結網的骨架" — explicitly flagged as important), each
// harmony slot must resolve to the *nearest actual published color*, so the link always points to
// a real page. This is what actually builds the internal link mesh the whole pSEO strategy depends on.
function resolveHarmonies(entry, allEntries) {
  const raw = getHarmonies(entry.hex);
  const resolveOne = (hex) => toLinkableEntry(findNearestColors(hex, allEntries, 1)[0]);
  return {
    complementary: resolveOne(raw.complementary),
    analogous: raw.analogous.map(resolveOne),
    triadic: raw.triadic.map(resolveOne),
    splitComplementary: raw.splitComplementary.map(resolveOne),
  };
}

function buildFullRecord(entry, allEntries) {
  const nearest = findNearestColors(entry.hex, allEntries, 6).map(toLinkableEntry);
  return {
    name: entry.name,
    hex: entry.hex,
    slug: entry.slug,
    rgb: hexToRgb(entry.hex),
    hsl: hexToHsl(entry.hex),
    cmyk: hexToCmyk(entry.hex),
    lab: hexToLab(entry.hex),
    oklch: hexToOklch(entry.hex),
    harmonies: resolveHarmonies(entry, allEntries),
    tintsAndShades: getTintsAndShades(entry.hex),
    nearest,
  };
}

function main() {
  console.log('Loading color-name-list bestof dataset...');
  const raw = loadBestOfColors();
  console.log(`Loaded ${raw.length} raw entries`);

  const deduped = dedupeBySlug(raw);
  console.log(`${deduped.length} unique entries after slug dedup`);

  mkdirSync(dataDir, { recursive: true });

  const manifest = [];
  const searchIndex = [];
  let shardEntries = [];
  let shardIndex = 0;

  console.log('Computing derived values (nearest-neighbor + harmony resolution is O(n^2) over 4,945 colors — can take a few minutes)...');
  for (let i = 0; i < deduped.length; i++) {
    const entry = deduped[i];
    const record = buildFullRecord(entry, deduped);
    shardEntries.push(record);
    manifest.push({ slug: entry.slug, name: entry.name, hex: entry.hex, shard: shardIndex });
    searchIndex.push({ name: entry.name, hex: entry.hex, slug: entry.slug });

    if (shardEntries.length === SHARD_SIZE || i === deduped.length - 1) {
      const shardPath = join(dataDir, `shard-${shardIndex}.json`);
      writeFileSync(shardPath, JSON.stringify(shardEntries));
      console.log(`Wrote ${shardPath} (${shardEntries.length} colors)`);
      shardEntries = [];
      shardIndex++;
    }

    if ((i + 1) % 500 === 0) {
      console.log(`  ...${i + 1}/${deduped.length} processed`);
    }
  }

  writeFileSync(join(dataDir, 'index.json'), JSON.stringify(manifest));
  writeFileSync(join(dataDir, 'search-index.json'), JSON.stringify(searchIndex));

  const publicDir = join(rootDir, 'public');
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(join(dataDir, 'search-index.json'), join(publicDir, 'search-index.json'));

  console.log(`Done. ${manifest.length} color pages, ${shardIndex} shards.`);
}

main();
