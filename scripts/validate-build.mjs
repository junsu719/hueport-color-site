import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

function fail(message) {
  console.error(`❌ Build validation failed: ${message}`);
  process.exitCode = 1;
}

function main() {
  if (!existsSync(distDir)) {
    fail(`dist/ directory not found at ${distDir}`);
    return;
  }

  const colorDir = join(distDir, 'color');
  if (!existsSync(colorDir)) {
    fail('dist/color/ directory not found — no color pages were generated');
    return;
  }

  const colorPageCount = readdirSync(colorDir).length;
  console.log(`Found ${colorPageCount} generated color page directories.`);
  if (colorPageCount < 4000) {
    fail(`expected at least 4000 color pages, found ${colorPageCount}`);
    return;
  }

  const manifestPath = join(rootDir, 'data', 'colors', 'index.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const sampleSlugs = [manifest[0].slug, manifest[Math.floor(manifest.length / 2)].slug, manifest.at(-1).slug];

  for (const slug of sampleSlugs) {
    const pagePath = join(colorDir, slug, 'index.html');
    if (!existsSync(pagePath)) {
      fail(`expected page not found: dist/color/${slug}/index.html`);
      return;
    }
    const html = readFileSync(pagePath, 'utf-8');
    if (!html.includes('play.google.com/store/apps/details')) {
      fail(`page ${slug} is missing the Play Store CTA link`);
      return;
    }
    if (!html.includes('utm_source=colorsite')) {
      fail(`page ${slug} is missing UTM parameters on its CTA link`);
      return;
    }
    if (!html.includes('BreadcrumbList')) {
      fail(`page ${slug} is missing BreadcrumbList JSON-LD`);
      return;
    }
  }
  console.log(`Verified ${sampleSlugs.length} sample pages contain CTA + UTM links + breadcrumb JSON-LD.`);

  const colorsLetterDir = join(distDir, 'colors');
  if (!existsSync(colorsLetterDir)) {
    fail('dist/colors/ directory not found — no A-Z index pages were generated');
    return;
  }
  const letterPageCount = readdirSync(colorsLetterDir).filter((name) => name !== 'index.html').length;
  console.log(`Found ${letterPageCount} generated colors/[letter] page directories.`);
  if (letterPageCount < 20) {
    fail(`expected at least 20 letter pages, found ${letterPageCount}`);
    return;
  }

  const requiredFiles = [
    'index.html',
    'app/index.html',
    'tools/index.html',
    'tools/hex-to-rgb/index.html',
    'tools/color-picker/index.html',
    'colors/index.html',
    'sitemap-index.xml',
    'robots.txt',
    'search-index.json',
  ];
  for (const file of requiredFiles) {
    if (!existsSync(join(distDir, file))) {
      fail(`required output file missing: dist/${file}`);
      return;
    }
  }
  console.log('Verified all required static pages and files exist.');

  console.log('✅ Build validation passed.');
}

main();
