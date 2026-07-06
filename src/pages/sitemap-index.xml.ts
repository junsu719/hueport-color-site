import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface SearchEntry {
  name: string;
  hex: string;
  slug: string;
}

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? 'https://hueport-color-site.pages.dev';

  const searchIndexPath = join(process.cwd(), 'data', 'colors', 'search-index.json');
  const allColors: SearchEntry[] = JSON.parse(readFileSync(searchIndexPath, 'utf-8'));

  const staticPaths = [
    '/',
    '/app/',
    '/tools/',
    '/tools/hex-to-rgb/',
    '/tools/color-picker/',
    '/colors/',
  ];
  const colorPaths = allColors.map((c) => `/color/${c.slug}/`);
  const letters = new Set(
    allColors.map((c) => (/^[a-z]/i.test(c.name) ? c.name[0].toUpperCase() : '#')),
  );
  const letterPaths = [...letters].map((l) => `/colors/${l}/`);

  const allPaths = [...staticPaths, ...colorPaths, ...letterPaths];

  const urlEntries = allPaths
    .map((path) => `  <url><loc>${base}${path}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
