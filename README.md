# HuePort Color Site

Programmatic-SEO static site (color reference pages + free tools) driving organic search traffic
to HuePort's app store listing. Full spec: `hueport-color-seo-site-spec.md`. Decisions made during
implementation: `DECISIONS.md`.

## Requirements

- Node.js LTS (see `.nvmrc`) — install via `nvm install --lts` if you don't already have it.
- Develop and build **inside WSL2 Ubuntu**, not native Windows (see `CLAUDE.md` for why).

## Build

```bash
npm install
npm run build
```

This runs, in order:
1. `scripts/prepare-data.mjs` — reads `color-name-list`'s curated `bestof` dataset (~4,945 colors),
   computes every derived value, and writes sharded JSON to `data/colors/` (gitignored, regenerated
   every build).
2. `astro build` — outputs the static site to **`dist/`** (color pages, A–Z index, tools, app page,
   homepage, sitemap, robots.txt — ~4,978 pages total).
3. `scripts/validate-build.mjs` — fails the build (non-zero exit code) if the page count, sample
   page content (CTA/UTM links, breadcrumb JSON-LD), or required static files don't match Phase 1's
   acceptance criteria.

**Output directory for Cloudflare Pages: `dist`**
**Build command for Cloudflare Pages: `npm run build`**

## Local development

```bash
npm run dev
```

Serves at `http://localhost:4321`.

## Tests

```bash
npm test
```

Runs Vitest against `src/lib/*.ts` (color math, slug generation, UTM links, text-variant rotation).

## Site structure

- `/` — homepage with client-side color search + featured colors
- `/color/[slug]/` — one page per color (values, harmonies, tints/shades, code snippets, nearest colors)
- `/colors/` — A–Z overview, links into `/colors/[letter]/`
- `/colors/[letter]/` — all colors starting with that letter
- `/tools/`, `/tools/hex-to-rgb/`, `/tools/color-picker/` — free browser-based tools
- `/app/` — HuePort app landing page (FAQ + Play Store link)

Every page shares one `Header` (logo + Tools/Colors/Get the App nav, in `src/layouts/Base.astro`).
Color and tool pages additionally render a `Breadcrumb` (with BreadcrumbList JSON-LD).

## Deploying (Jun does this manually)

1. Push this repo to a new GitHub repo (not part of the TrueHue Flutter repo).
2. In the Cloudflare Pages dashboard: connect the GitHub repo, set build command `npm run build`,
   output directory `dist`.
3. **Once Cloudflare assigns the real `*.pages.dev` subdomain**, update the placeholder domain in
   two places, then commit and let it redeploy:
   - `astro.config.mjs` → `site:` value
   - `public/robots.txt` → `Sitemap:` line
   Everything else (canonical URLs, sitemap entries, OG image URLs) derives from `astro.config.mjs`'s
   `site` value automatically.
4. After the first successful deploy with the correct domain, submit the sitemap
   (`/sitemap-index.xml`) in Google Search Console manually.

No API tokens or Cloudflare credentials are needed by Claude for any of this — deployment is
entirely Jun's step.

## Post-launch checkpoints (operational — track manually, not code)

- **Week 6–8:** if Search Console indexed pages < 1,000 → stop and debug (sitemap, content
  quality) rather than continuing to wait — that's a technical-problem signal, not normal SEO lag.
- **Month 6:** if indexed pages < 5,000 or organic clicks < 500/month → do not proceed to Phase 2
  (full 30k-page scale-up). The site itself is never taken down regardless of these numbers.

## Phase 2 (not built yet, tracked in the spec)

- Migrate to Cloudflare Workers Static Assets (100k file limit) to support the full ~31,912-color
  dataset (Cloudflare Pages alone caps at 20,000 files).
- Recompute nearest-neighbor "similar colors" against the full dataset (Phase 1 only searches
  within the 4,945-color subset it actually published — see `DECISIONS.md` #3).
- Remaining 5 tool pages, `/palette/` pages, dynamic per-color OG images.
