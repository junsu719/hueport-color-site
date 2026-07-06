# HuePort Color Site — Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally-verify a static Astro site (color detail pages, 2 tools, app landing page, homepage, sitemap/robots/JSON-LD) that produces a deployable `dist/` output via a single `npm run build`, ready for Jun to connect to Cloudflare Pages himself.

**Architecture:** Astro (SSG, zero client JS by default) + Tailwind CSS v4 (`@tailwindcss/vite`). A build-time data pipeline (`scripts/prepare-data.mjs`) reads the `color-name-list` npm package's curated `bestof` dataset (4,945 colors — used as the Phase 1 "top ~5,000" subset), precomputes every derived value (RGB/HSL/CMYK/LAB/OKLCH, harmony colors, tints/shades, 6 nearest neighbors) using `culori`, and writes sharded JSON that `getStaticPaths()` consumes to generate one page per color. Two client-side tool pages (hex↔rgb, color-picker) use vanilla JS, no framework. All outbound store links funnel through one `AppCTA.astro` component backed by a tested `utm.ts` helper.

**Tech Stack:** Astro 7.0.6, Tailwind CSS 4.3.2 (`@tailwindcss/vite`), culori 4.0.2, color-name-list 14.45.0, Vitest 4.1.9, Node.js LTS via nvm on WSL2 Ubuntu.

**Scope boundary (per Jun's decision #3):** This plan stops at "repo is deployable." It does NOT push to GitHub, does NOT touch Cloudflare Pages, does NOT submit to Search Console. The last task produces a README with the exact build command and output directory so Jun can wire up Cloudflare Pages himself.

---

## Context Jun confirmed before this plan (do not re-litigate)

1. **Abandon/checkpoint criteria:** At week 6–8 post-launch, if Search Console indexed pages < 1,000 → stop and debug sitemap/content-quality (technical problem), don't just wait. The 6-month gate for Phase 2 (<5,000 indexed / <500 traffic/mo → do not proceed) stands. Site is never taken down regardless. *(Operational — nothing to build for this now; documented in README so it isn't lost.)*
2. **Repo:** Independent new repo, NOT inside the TrueHue Flutter monorepo.
3. **Deployment:** Jun does it himself via the Cloudflare dashboard (GitHub connect, build command, manual Search Console submission). No API tokens needed. Claude's job ends at "build succeeds locally, output dir confirmed."
4. **Dev environment:** WSL2 Ubuntu, not native Windows — this repo processes thousands of generated files and native Windows filesystem (path length / CRLF / perf) causes problems for this kind of Node workload.
5. Domain: `*.pages.dev` subdomain for now (custom domain is a later, separate decision). All packages: free tier only.

## Verified facts (checked live during planning, not assumed)

- `color-name-list@14.45.0` ships `dist/colornames.json` (31,912 entries) and `dist/colornames.bestof.json` (**4,945 entries** — this is the built-in "popular/curated" subset the spec asked for; no extra popularity-ranking logic needed for Phase 1).
- `culori@4.0.2`'s `converter('oklch')`, `converter('rgb')`, `converter('hsl')`, `converter('lab')`, `formatHex({mode:'oklch',l,c,h})`, and `differenceEuclidean('oklab')` all work as expected (hand-verified against `#b3460f`, see Task 2/4 test fixtures below — values are real, not guessed).
- culori has **no CMYK converter** (CMYK isn't colorimetric/device-independent) — Task 2 implements the standard naive RGB→CMYK formula manually, display-only, not press-accurate.
- WSL2 Ubuntu 26.04 currently has **no Node.js installed** (only Windows' `npm` is reachable through PATH interop, via `/mnt/c/Program Files/nodejs/npm` — not usable, it's Windows binaries). Task 0 installs Node via nvm inside WSL2.
- Windows-side tools (Read/Write/Edit) can reach the WSL2 filesystem via the UNC path `\\wsl.localhost\Ubuntu\home\junsu\projects\hueport-color-site\...` — verified working. All `npm`/`node`/`git` commands must run *inside* WSL2 (`wsl -e bash -lc "cd ~/projects/hueport-color-site && ..."`), never on the Windows side, or you're back on the slow/broken filesystem path this decision was meant to avoid.

## Decisions logged to `DECISIONS.md` (Task 0 writes these — implementation-level calls made autonomously per the Bible, §1/§11)

1. Phase 1's "top ~5,000 popular colors" = `color-name-list`'s built-in `bestof` list (4,945 entries) — no custom popularity ranking built.
2. CMYK computed with the standard naive RGB→CMYK formula (display-only) since culori has no CMYK mode.
3. "6 nearest named colors" computed only within the Phase 1 published subset (4,945), so every internal link resolves to a page that exists. Phase 2 (full 31,912) will need this recomputed against the full set — flagged as follow-up, not built now.
4. Cloudflare Web Analytics custom click-event tracking (spec §5's "打一個自訂事件 beacon") is **not implemented** — couldn't verify the free tier exposes a stable custom-event API without Zaraz (a separate product), and it isn't in the Phase 1 acceptance checklist. Pageviews are covered by CF's zero-code Web Analytics snippet, which Jun enables from the dashboard. UTM links (the part that actually matters for attribution) are fully implemented and tested.
5. Project lives at `~/projects/hueport-color-site` on WSL2's native ext4 filesystem, fully decoupled from `D:\dev\TrueHue`. The original spec file at `D:\dev\TrueHue\hueport-color-site\hueport-color-seo-site-spec.md` is copied (not deleted) into the new repo.
6. Tailwind integration uses the v4-native `@tailwindcss/vite` Vite plugin, not the older `@astrojs/tailwind` integration package — that's the officially recommended path for Tailwind v4 and matches the versions verified above.

---

## File Structure

```
~/projects/hueport-color-site/           (WSL2 native filesystem, independent git repo)
├── CLAUDE.md                             # points back to ~/claude-bible + this repo's own rules
├── DECISIONS.md                          # the 6 decisions above, Bible-mandated log
├── README.md                             # build/deploy instructions for Jun (Task 19)
├── .gitignore
├── .nvmrc
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── scripts/
│   ├── prepare-data.mjs                  # Task 8 — data pipeline, run before every build
│   └── validate-build.mjs                # Task 18 — post-build sanity checks
├── data/                                  # gitignored, regenerated by prepare-data.mjs
│   └── colors/
│       ├── index.json                    # manifest: [{slug,name,hex,shard}]
│       ├── search-index.json             # [{name,hex,slug}] for homepage search
│       └── shard-0.json … shard-4.json   # ~1,000 full color records each
├── src/
│   ├── lib/
│   │   ├── color-math.ts                 # Tasks 2–4b
│   │   ├── slug.ts                       # Task 5
│   │   ├── utm.ts                        # Task 6
│   │   └── text-variants.ts              # Task 7
│   ├── layouts/
│   │   └── Base.astro                    # Task 1
│   ├── components/
│   │   ├── ColorSwatch.astro             # Task 9
│   │   ├── ValueTable.astro               # Task 9
│   │   ├── HarmonyGrid.astro              # Task 9
│   │   ├── CopyButton.astro               # Task 9
│   │   └── AppCTA.astro                   # Task 9
│   ├── styles/
│   │   └── global.css                    # Task 1
│   └── pages/
│       ├── index.astro                    # Task 15
│       ├── app.astro                      # Task 14
│       ├── color/
│       │   └── [slug].astro               # Task 10
│       ├── colors/
│       │   └── [letter].astro             # Task 16
│       ├── tools/
│       │   ├── index.astro                # Task 13
│       │   ├── hex-to-rgb.astro           # Task 11
│       │   └── color-picker.astro         # Task 12
│       └── sitemap-index.xml.ts           # Task 17
├── public/
│   └── robots.txt                        # Task 17
└── tests/
    ├── color-math.test.ts                 # Tasks 2–4b
    ├── slug.test.ts                       # Task 5
    ├── utm.test.ts                         # Task 6
    └── text-variants.test.ts              # Task 7
```

---

### Task 0: WSL2 environment + independent repo bootstrap

**Files:**
- Create: `~/.nvm` (via install script)
- Create: `~/projects/hueport-color-site/.gitignore`
- Create: `~/projects/hueport-color-site/.nvmrc`
- Create: `~/projects/hueport-color-site/DECISIONS.md`
- Create: `~/projects/hueport-color-site/CLAUDE.md`
- Create: `~/projects/hueport-color-site/hueport-color-seo-site-spec.md` (copied from Windows side)
- Modify: `D:\dev\TrueHue\.gitignore` (add one line so the old folder stops showing as untracked noise in the Flutter repo)

- [ ] **Step 1: Install nvm and Node LTS inside WSL2**

Run (all subsequent commands in this task run via `wsl -e bash -lc "..."` from the Windows-side Bash tool):

```bash
wsl -e bash -lc "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
```

Expected: installs nvm into `~/.nvm` and appends init lines to `~/.bashrc`.

- [ ] **Step 2: Load nvm in the current shell and install Node LTS**

```bash
wsl -e bash -lc "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\"; nvm install --lts && nvm alias default lts/* && node --version && npm --version"
```

Expected: prints a Node version ≥ 20.x and an npm version. If this fails with "nvm: command not found," the shell didn't source `~/.bashrc` — re-run with `bash -lc` (login shell) rather than `bash -c`.

- [ ] **Step 3: Create the project directory (already pre-created for this plan file, but re-run to confirm)**

```bash
wsl -e bash -lc "mkdir -p ~/projects/hueport-color-site/{scripts,src/lib,src/layouts,src/components,src/styles,src/pages/color,src/pages/colors,src/pages/tools,public,tests,data,docs} && echo ok"
```

- [ ] **Step 4: Copy the spec file into the new repo**

```bash
wsl -e bash -lc "cp '/mnt/d/dev/TrueHue/hueport-color-site/hueport-color-seo-site-spec.md' ~/projects/hueport-color-site/hueport-color-seo-site-spec.md && echo copied"
```

- [ ] **Step 5: Write `.nvmrc`**

Write `~/projects/hueport-color-site/.nvmrc` (path from Windows side: `\\wsl.localhost\Ubuntu\home\junsu\projects\hueport-color-site\.nvmrc`):

```
lts/*
```

- [ ] **Step 6: Write `.gitignore`**

```gitignore
node_modules/
dist/
data/
.astro/
*.log
.DS_Store
```

- [ ] **Step 7: Write `DECISIONS.md`**

```markdown
# Decisions Log — hueport-color-site

Per the Bible's escape-hatch/amendment rules: implementation-level calls made autonomously, logged here, not asked about mid-flight.

## 2026-07-06 — Phase 1 planning decisions

1. **"Top ~5,000 popular colors" data source**: used `color-name-list`'s built-in `bestof` curated list (4,945 entries) instead of building custom popularity-ranking logic. Close enough to the spec's "~5,000" target, and it's exactly the kind of curated subset the spec asked for.
2. **CMYK conversion**: culori has no CMYK color mode (CMYK is device-dependent, not colorimetric). Implemented the standard naive RGB→CMYK formula by hand. Display-only value, not press-accurate — matches what every other web color tool does.
3. **Nearest-neighbor scope**: "6 closest named colors" computed only within the Phase 1 published subset (4,945 colors), so every generated internal link points to a page that actually exists. Must be recomputed against the full 31,912-color set when Phase 2 expands page count — not done yet.
4. **Cloudflare custom event tracking**: spec §5 asked for a custom analytics event on CTA click. Skipped for Phase 1 — couldn't verify the CF Web Analytics free tier has a stable custom-event API without Zaraz (a separate product), and it's not in the Phase 1 acceptance checklist. UTM links (the part that actually drives attribution) are fully implemented and tested. Revisit if Jun wants in-page click analytics later.
5. **Repo location**: moved to WSL2 native filesystem (`~/projects/hueport-color-site`), fully decoupled from `D:\dev\TrueHue`, per Jun's decision to develop on WSL2 rather than native Windows for this file-heavy Node workload.
6. **Tailwind integration**: used the v4-native `@tailwindcss/vite` Vite plugin (not the older `@astrojs/tailwind` package) — the officially recommended path for Tailwind v4.
```

- [ ] **Step 8: Write `CLAUDE.md`**

```markdown
# hueport-color-site — Project Rules

> Independent repo. Governed by `~/claude-bible/` (global Bible) for process; this file only holds
> project-specific facts not covered there.

## What this is
Programmatic SEO site (Astro, static) driving organic traffic to HuePort's app store listings.
Full spec: `hueport-color-seo-site-spec.md` in this repo.

## 回覆語言規範
與 Jun 討論本專案時，全程使用繁體中文回覆。技術術語（套件名、指令、程式碼、變數名、檔案路徑等）保留原文，不需翻譯。

## Environment
- Develop and build **inside WSL2 Ubuntu only** (`~/projects/hueport-color-site`). Do not run
  `npm`/`node` from the Windows side — this repo generates thousands of files and native Windows
  filesystem access is unreliable for this workload.
- Node via nvm (`.nvmrc` pins the version). `nvm use` before any npm command if in a fresh shell.

## Build
- `npm run build` runs the data pipeline (`scripts/prepare-data.mjs`) then `astro build`, then
  validates output (`scripts/validate-build.mjs`). Output directory: `dist/`.
- `data/` is gitignored and fully regenerated by the data pipeline on every build — never hand-edit
  files under `data/`.

## Deployment
Jun deploys manually via the Cloudflare Pages dashboard (GitHub connect, build command
`npm run build`, output directory `dist`). Claude does not have deployment credentials for this
project and should not attempt to deploy.

## Post-launch checkpoints (operational, not code — tracked by Jun)
- Week 6–8: if Search Console indexed pages < 1,000, treat as a technical problem (sitemap /
  content quality) and debug — don't just keep waiting.
- Month 6: <5,000 indexed pages or <500 monthly organic clicks → do not proceed to Phase 2 scale-up.
  Site stays live either way.
```

- [ ] **Step 9: `git init` the new repo**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git init && git add -A && git commit -m 'chore: bootstrap hueport-color-site repo, spec, and decisions log'"
```

Expected: `git log` shows one commit.

- [ ] **Step 10: Stop the old Windows-side folder from cluttering the TrueHue repo's `git status`**

Read `D:\dev\TrueHue\.gitignore`, then add this line at the end (if not already present):

```gitignore
hueport-color-site/
```

Then verify:

```bash
cd /d/dev/TrueHue && git status --porcelain | grep -i hueport-color-site
```

Expected: no output (previously printed `?? hueport-color-site/`).

- [ ] **Step 11: Commit the TrueHue `.gitignore` change**

```bash
cd /d/dev/TrueHue && git add .gitignore && git commit -m "chore: ignore hueport-color-site (moved to its own repo on WSL2)"
```

---

### Task 1: Astro + Tailwind v4 project skeleton

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/styles/global.css`
- Create: `src/layouts/Base.astro`
- Create: `vitest.config.ts`

All file paths below are relative to `~/projects/hueport-color-site/` and can be written via the Windows-side Write tool using the UNC prefix `\\wsl.localhost\Ubuntu\home\junsu\projects\hueport-color-site\`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "hueport-color-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "prepare-data": "node scripts/prepare-data.mjs",
    "dev": "npm run prepare-data && astro dev",
    "build": "npm run prepare-data && astro build && node scripts/validate-build.mjs",
    "preview": "astro preview",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "7.0.6",
    "culori": "4.0.2",
    "color-name-list": "14.45.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.2",
    "tailwindcss": "4.3.2",
    "vitest": "4.1.9"
  }
}
```

- [ ] **Step 2: Write `astro.config.mjs`**

`site` is a placeholder — Cloudflare Pages assigns the actual `*.pages.dev` subdomain when Jun
creates the project (it may not be exactly `hueport-color-site.pages.dev` if that name is taken).
This value feeds `Astro.site`, which the sitemap, robots.txt, canonical URLs, and OG image URLs all
derive from — **update this one line once Jun has the real Cloudflare Pages URL, then rebuild**;
everything downstream picks it up automatically. Called out again in Task 19's README.

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hueport-color-site.pages.dev', // placeholder — update once Cloudflare Pages assigns the real subdomain
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "data", "node_modules"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Write `src/styles/global.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Write `src/layouts/Base.astro`**

Per spec §4.1 SEO requirements, Phase 1 uses a single static OG image across every page (per-color
dynamic OG images are explicitly Phase 2). `ogImagePath` defaults to `/og-image.png`, added in
Step 8 below.

```astro
---
import '../styles/global.css';

export interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  ogImagePath?: string;
}

const { title, description, canonicalPath, ogImagePath = '/og-image.png' } = Astro.props;
const site = Astro.site ?? new URL('https://hueport-color-site.pages.dev');
const canonicalUrl = new URL(canonicalPath, site).toString();
const ogImageUrl = new URL(ogImagePath, site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={ogImageUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImageUrl} />
    <slot name="head" />
  </head>
  <body class="min-h-screen bg-white text-neutral-900 antialiased">
    <slot />
  </body>
</html>
```

- [ ] **Step 7: Add the Phase 1 shared OG image**

Reuse HuePort's existing app icon as the single site-wide OG image (spec §4.1: "Phase 1 用單一模板圖" — one static image is explicitly sufficient; per-color dynamic OG images are Phase 2 scope, not built now).

```bash
wsl -e bash -lc "mkdir -p ~/projects/hueport-color-site/public && cp '/mnt/d/dev/TrueHue/assets/icon.png' ~/projects/hueport-color-site/public/og-image.png && ls -la ~/projects/hueport-color-site/public/og-image.png"
```

Expected: file copied, non-zero size. If `assets/icon.png` has moved in the TrueHue repo by the time this runs, find its current path first (`find /mnt/d/dev/TrueHue -iname "icon.png"`) rather than guessing.

- [ ] **Step 8: Install dependencies and verify Astro boots**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && export NVM_DIR=\"\$HOME/.nvm\"; \. \"\$NVM_DIR/nvm.sh\"; nvm use; npm install"
```

Expected: installs without error. This will take a minute or two the first time.

- [ ] **Step 9: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add -A && git commit -m 'feat: astro + tailwind v4 project skeleton'"
```

---

### Task 2: `color-math.ts` — core conversions (RGB/HSL/CMYK/LAB/OKLCH)

**Files:**
- Create: `src/lib/color-math.ts`
- Test: `tests/color-math.test.ts`

Reference fixture used throughout Tasks 2–4b (`#b3460f`), values hand-verified with culori 4.0.2 during planning — these are real computed outputs, not estimates:

| conversion | value |
|---|---|
| rgb | `{r:179, g:70, b:15}` |
| hsl | `{h:20, s:85, l:38}` |
| cmyk | `{c:0, m:61, y:92, k:30}` |
| lab | `{l:45, a:44, b:52}` |
| oklch | `{l:0.54, c:0.154, h:42}` |

- [ ] **Step 1: Write the failing test**

Create `tests/color-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, hexToHsl, hexToCmyk, hexToLab, hexToOklch } from '../src/lib/color-math';

describe('color-math conversions', () => {
  const hex = '#b3460f';

  it('converts hex to rgb', () => {
    expect(hexToRgb(hex)).toEqual({ r: 179, g: 70, b: 15 });
  });

  it('converts hex to hsl', () => {
    expect(hexToHsl(hex)).toEqual({ h: 20, s: 85, l: 38 });
  });

  it('converts hex to cmyk', () => {
    expect(hexToCmyk(hex)).toEqual({ c: 0, m: 61, y: 92, k: 30 });
  });

  it('converts hex to lab', () => {
    expect(hexToLab(hex)).toEqual({ l: 45, a: 44, b: 52 });
  });

  it('converts hex to oklch', () => {
    expect(hexToOklch(hex)).toEqual({ l: 0.54, c: 0.154, h: 42 });
  });

  it('throws on invalid hex', () => {
    expect(() => hexToRgb('not-a-color')).toThrow('Invalid hex color');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: FAIL — `Cannot find module '../src/lib/color-math'`.

- [ ] **Step 3: Write `src/lib/color-math.ts`**

```ts
import { converter, formatHex } from 'culori';

const toRgbMode = converter('rgb');
const toHslMode = converter('hsl');
const toLabMode = converter('lab');
const toOklchMode = converter('oklch');

export interface RgbValue {
  r: number;
  g: number;
  b: number;
}

export interface HslValue {
  h: number;
  s: number;
  l: number;
}

export interface CmykValue {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface LabValue {
  l: number;
  a: number;
  b: number;
}

export interface OklchValue {
  l: number;
  c: number;
  h: number;
}

export function hexToRgb(hex: string): RgbValue {
  const c = toRgbMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: Math.round(c.r * 255),
    g: Math.round(c.g * 255),
    b: Math.round(c.b * 255),
  };
}

export function hexToHsl(hex: string): HslValue {
  const c = toHslMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  return {
    h: Math.round(c.h ?? 0),
    s: Math.round(c.s * 100),
    l: Math.round(c.l * 100),
  };
}

export function hexToCmyk(hex: string): CmykValue {
  // culori has no CMYK mode (CMYK is device-dependent, not colorimetric).
  // Standard naive RGB->CMYK formula, display-only — see DECISIONS.md #2.
  const { r, g, b } = hexToRgb(hex);
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rf - k) / (1 - k);
  const m = (1 - gf - k) / (1 - k);
  const y = (1 - bf - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function hexToLab(hex: string): LabValue {
  const c = toLabMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  return {
    l: Math.round(c.l),
    a: Math.round(c.a),
    b: Math.round(c.b),
  };
}

export function hexToOklch(hex: string): OklchValue {
  const c = toOklchMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  return {
    l: Math.round(c.l * 100) / 100,
    c: Math.round(c.c * 1000) / 1000,
    h: Math.round(c.h ?? 0),
  };
}

export { formatHex };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/color-math.test.ts src/lib/color-math.ts && git commit -m 'feat: hex to rgb/hsl/cmyk/lab/oklch conversions'"
```

---

### Task 3: `color-math.ts` — harmonies and tints/shades

**Files:**
- Modify: `src/lib/color-math.ts`
- Modify: `tests/color-math.test.ts`

Reference values for `#b3460f` (hand-verified with culori during planning):

- complementary: `#007eac`
- analogous: `['#a25900', '#b43d55']`
- triadic: `['#008750', '#625dc3']`
- splitComplementary: `['#008784', '#0f6ec3']`
- tints (5, lightest last): `['#cd5e2e', '#e87648', '#ff8f60', '#ffa879', '#ffc191']`
- shades (5, darkest last): `['#952900', '#770200', '#5a0000', '#3d0000', '#200000']`

- [ ] **Step 1: Add the failing tests**

Append to `tests/color-math.test.ts` (inside the same file, new `describe` block):

```ts
import { getHarmonies, getTintsAndShades } from '../src/lib/color-math';

describe('color-math harmonies and tints/shades', () => {
  const hex = '#b3460f';

  it('computes complementary/analogous/triadic/split-complementary', () => {
    const harmonies = getHarmonies(hex);
    expect(harmonies.complementary).toBe('#007eac');
    expect(harmonies.analogous).toEqual(['#a25900', '#b43d55']);
    expect(harmonies.triadic).toEqual(['#008750', '#625dc3']);
    expect(harmonies.splitComplementary).toEqual(['#008784', '#0f6ec3']);
  });

  it('computes 5 tints and 5 shades', () => {
    const { tints, shades } = getTintsAndShades(hex);
    expect(tints).toEqual(['#cd5e2e', '#e87648', '#ff8f60', '#ffa879', '#ffc191']);
    expect(shades).toEqual(['#952900', '#770200', '#5a0000', '#3d0000', '#200000']);
  });
});
```

(Update the import at the top of the test file to pull in `getHarmonies, getTintsAndShades` alongside the existing imports from `../src/lib/color-math` — merge into the single existing import statement rather than duplicating it.)

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: FAIL — `getHarmonies is not a function`.

- [ ] **Step 3: Append to `src/lib/color-math.ts`**

```ts
function rotateHue(hex: string, degrees: number): string {
  const c = toOklchMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  const h = ((c.h ?? 0) + degrees + 360) % 360;
  return formatHex({ mode: 'oklch', l: c.l, c: c.c, h });
}

export interface Harmonies {
  complementary: string;
  analogous: [string, string];
  triadic: [string, string];
  splitComplementary: [string, string];
}

export function getHarmonies(hex: string): Harmonies {
  return {
    complementary: rotateHue(hex, 180),
    analogous: [rotateHue(hex, 30), rotateHue(hex, -30)],
    triadic: [rotateHue(hex, 120), rotateHue(hex, -120)],
    splitComplementary: [rotateHue(hex, 150), rotateHue(hex, -150)],
  };
}

export interface TintsAndShades {
  tints: string[];
  shades: string[];
}

export function getTintsAndShades(hex: string): TintsAndShades {
  const c = toOklchMode(hex);
  if (!c) throw new Error(`Invalid hex color: ${hex}`);
  const tints: string[] = [];
  const shades: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const tintL = c.l + (1 - c.l) * (i / 6);
    const shadeL = c.l * (1 - i / 6);
    tints.push(formatHex({ mode: 'oklch', l: tintL, c: c.c, h: c.h }));
    shades.push(formatHex({ mode: 'oklch', l: shadeL, c: c.c, h: c.h }));
  }
  return { tints, shades };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: PASS, 8 tests total.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/color-math.test.ts src/lib/color-math.ts && git commit -m 'feat: color harmonies and tints/shades'"
```

---

### Task 4: `color-math.ts` — nearest-neighbor search

**Files:**
- Modify: `src/lib/color-math.ts`
- Modify: `tests/color-math.test.ts`

Reference fixture (hand-verified distances via `differenceEuclidean('oklab')` during planning, target `#ff0000`, ascending distance order excluding self): `near(#fe0000)` → `darkred(#cc0000)` → `orange(#ff8000)` → `pink(#ff99aa)` → `green(#00ff00)` → `blue(#0000ff)`.

- [ ] **Step 1: Add the failing test**

Append to `tests/color-math.test.ts`:

```ts
import { findNearestColors, type ColorEntry } from '../src/lib/color-math';

describe('color-math findNearestColors', () => {
  const target = '#ff0000';
  const candidates: ColorEntry[] = [
    { name: 'Self Red', hex: '#ff0000', slug: 'self-red' },
    { name: 'Near Red', hex: '#fe0000', slug: 'near-red' },
    { name: 'Dark Red', hex: '#cc0000', slug: 'dark-red' },
    { name: 'Orange', hex: '#ff8000', slug: 'orange' },
    { name: 'Pink', hex: '#ff99aa', slug: 'pink' },
    { name: 'Blue', hex: '#0000ff', slug: 'blue' },
    { name: 'Green', hex: '#00ff00', slug: 'green' },
  ];

  it('excludes the exact-match self entry and sorts by ascending distance', () => {
    const result = findNearestColors(target, candidates, 6);
    expect(result.map((r) => r.slug)).toEqual([
      'near-red',
      'dark-red',
      'orange',
      'pink',
      'green',
      'blue',
    ]);
  });

  it('respects the count parameter', () => {
    const result = findNearestColors(target, candidates, 2);
    expect(result.map((r) => r.slug)).toEqual(['near-red', 'dark-red']);
  });
});
```

(Merge the `findNearestColors, type ColorEntry` import into the single existing import from `../src/lib/color-math` at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: FAIL — `findNearestColors is not a function`.

- [ ] **Step 3: Append to `src/lib/color-math.ts`**

```ts
import { differenceEuclidean } from 'culori';

const oklabDistance = differenceEuclidean('oklab');

export interface ColorEntry {
  name: string;
  hex: string;
  slug: string;
}

export function findNearestColors(
  target: string,
  candidates: ColorEntry[],
  count = 6,
): ColorEntry[] {
  return candidates
    .filter((entry) => entry.hex.toLowerCase() !== target.toLowerCase())
    .map((entry) => ({ entry, distance: oklabDistance(target, entry.hex) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((x) => x.entry);
}
```

Move the `import { differenceEuclidean } from 'culori';` line up to join the existing `import { converter, formatHex } from 'culori';` line at the top of the file as a single combined import, rather than leaving two separate `culori` imports.

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: PASS, 10 tests total.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/color-math.test.ts src/lib/color-math.ts && git commit -m 'feat: nearest-neighbor color search'"
```

---

### Task 4b: `color-math.ts` — nearest Tailwind v4 class (spec §4.1 point 5's "Tailwind 近似 class")

**Files:**
- Modify: `src/lib/color-math.ts`
- Modify: `tests/color-math.test.ts`

Tailwind v4's default palette is defined natively in OKLCH (see the installed
`node_modules/tailwindcss/theme.css` — Tailwind v4 changed the palette definition from v3's plain
hex to OKLCH). The hex values below are the real `*-500` (base tone) swatches for each of
Tailwind's 22 default color families, converted from their actual OKLCH definitions during
planning — verified, not guessed. Only the `-500` weight is used, as a lightweight "closest hue
family" hint, not a full 11-shade match (going deeper isn't worth the table size for a one-line
code-snippet hint).

- [ ] **Step 1: Add the failing test**

Append to `tests/color-math.test.ts`:

```ts
import { hexToTailwindClass } from '../src/lib/color-math';

describe('hexToTailwindClass', () => {
  it('finds the closest Tailwind v4 default 500-weight swatch by OKLab distance', () => {
    // Verified against the real algorithm during planning — stone-500 (#79716b) narrowly
    // beats red-500 (#fb2c36) for this particular burnt-orange target, a good reminder that
    // OKLab-nearest isn't always the intuitively "obvious" hue match.
    expect(hexToTailwindClass('#b3460f')).toEqual({ className: 'bg-stone-500', hex: '#79716b' });
  });
});
```

(Merge the `hexToTailwindClass` import into the single existing import from `../src/lib/color-math` at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: FAIL — `hexToTailwindClass is not a function`.

- [ ] **Step 3: Append to `src/lib/color-math.ts`** (after `findNearestColors`, so it can reuse `oklabDistance`)

```ts
const TAILWIND_500_PALETTE: Array<{ name: string; hex: string }> = [
  { name: 'red-500', hex: '#fb2c36' },
  { name: 'orange-500', hex: '#ff6900' },
  { name: 'amber-500', hex: '#fe9a00' },
  { name: 'yellow-500', hex: '#f0b100' },
  { name: 'lime-500', hex: '#7ccf00' },
  { name: 'green-500', hex: '#00c950' },
  { name: 'emerald-500', hex: '#00bc7d' },
  { name: 'teal-500', hex: '#00bba7' },
  { name: 'cyan-500', hex: '#00b8db' },
  { name: 'sky-500', hex: '#00a6f4' },
  { name: 'blue-500', hex: '#2b7fff' },
  { name: 'indigo-500', hex: '#615fff' },
  { name: 'violet-500', hex: '#8e51ff' },
  { name: 'purple-500', hex: '#ad46ff' },
  { name: 'fuchsia-500', hex: '#e12afb' },
  { name: 'pink-500', hex: '#f6339a' },
  { name: 'rose-500', hex: '#ff2056' },
  { name: 'slate-500', hex: '#62748e' },
  { name: 'gray-500', hex: '#6a7282' },
  { name: 'zinc-500', hex: '#71717b' },
  { name: 'neutral-500', hex: '#737373' },
  { name: 'stone-500', hex: '#79716b' },
];

export interface TailwindMatch {
  className: string;
  hex: string;
}

export function hexToTailwindClass(hex: string): TailwindMatch {
  let best = TAILWIND_500_PALETTE[0];
  let bestDistance = oklabDistance(hex, best.hex);
  for (const candidate of TAILWIND_500_PALETTE.slice(1)) {
    const distance = oklabDistance(hex, candidate.hex);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { className: `bg-${best.name}`, hex: best.hex };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/color-math.test.ts"
```

Expected: PASS, 11 tests total.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/color-math.test.ts src/lib/color-math.ts && git commit -m 'feat: nearest Tailwind v4 class lookup for color-page code snippets'"
```

---

### Task 5: `slug.ts` — slug generation

**Files:**
- Create: `src/lib/slug.ts`
- Test: `tests/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/slug';

describe('slugify', () => {
  it('lowercases and kebab-cases the name, appends the hex without #', () => {
    expect(slugify('Sienna', '#B3460F')).toBe('sienna-b3460f');
  });

  it('strips accents/diacritics', () => {
    expect(slugify('À l’Orange', '#f2850d')).toBe('a-l-orange-f2850d');
  });

  it('collapses multiple separators and trims leading/trailing dashes', () => {
    expect(slugify('  A   Lot -- of Love!! ', '#ffbcc5')).toBe('a-lot-of-love-ffbcc5');
  });

  it('produces distinct slugs for same name with different hex', () => {
    const a = slugify('Abbey', '#4c4f56');
    const b = slugify('Abbey', '#111111');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/slug.test.ts"
```

Expected: FAIL — `Cannot find module '../src/lib/slug'`.

- [ ] **Step 3: Write `src/lib/slug.ts`**

```ts
export function slugify(name: string, hex: string): string {
  const kebabName = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const hexPart = hex.replace('#', '').toLowerCase();
  return `${kebabName}-${hexPart}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/slug.test.ts"
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/slug.test.ts src/lib/slug.ts && git commit -m 'feat: color slug generation'"
```

---

### Task 6: `utm.ts` — Play Store link builder

**Files:**
- Create: `src/lib/utm.ts`
- Test: `tests/utm.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildPlayStoreUrl } from '../src/lib/utm';

describe('buildPlayStoreUrl', () => {
  it('builds a URL with the correct base and required UTM params for a color page', () => {
    const url = buildPlayStoreUrl('color', 'sienna-b3460f');
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://play.google.com/store/apps/details');
    expect(parsed.searchParams.get('id')).toBe('com.truehue.studio');
    expect(parsed.searchParams.get('utm_source')).toBe('colorsite');
    expect(parsed.searchParams.get('utm_medium')).toBe('referral');
    expect(parsed.searchParams.get('utm_campaign')).toBe('color');
    expect(parsed.searchParams.get('utm_content')).toBe('sienna-b3460f');
  });

  it('accepts all four page types', () => {
    for (const pageType of ['color', 'tool', 'app', 'home'] as const) {
      const url = buildPlayStoreUrl(pageType, 'some-slug');
      expect(new URL(url).searchParams.get('utm_campaign')).toBe(pageType);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/utm.test.ts"
```

Expected: FAIL — `Cannot find module '../src/lib/utm'`.

- [ ] **Step 3: Write `src/lib/utm.ts`**

```ts
export type PageType = 'color' | 'tool' | 'app' | 'home';

const PLAY_STORE_BASE = 'https://play.google.com/store/apps/details';
const PLAY_STORE_PACKAGE = 'com.truehue.studio';

export function buildPlayStoreUrl(pageType: PageType, pageSlug: string): string {
  const params = new URLSearchParams({
    id: PLAY_STORE_PACKAGE,
    utm_source: 'colorsite',
    utm_medium: 'referral',
    utm_campaign: pageType,
    utm_content: pageSlug,
  });
  return `${PLAY_STORE_BASE}?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/utm.test.ts"
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/utm.test.ts src/lib/utm.ts && git commit -m 'feat: Play Store UTM link builder'"
```

---

### Task 7: `text-variants.ts` — anti-duplicate-content sentence rotation

**Files:**
- Create: `src/lib/text-variants.ts`
- Test: `tests/text-variants.test.ts`

Per spec §7.3: avoid long identical sentences across ~5,000 near-identical template pages. This picks one of 4 intro-sentence templates deterministically from the color's hex value.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getIntroText } from '../src/lib/text-variants';

describe('getIntroText', () => {
  it('is deterministic for the same hex', () => {
    const a = getIntroText('Sienna', '#b3460f');
    const b = getIntroText('Sienna', '#b3460f');
    expect(a).toBe(b);
  });

  it('picks one of exactly 4 templates, and different hexes can pick different templates', () => {
    const seen = new Set<string>();
    // enough distinct hex inputs to sample all 4 buckets
    const samples = ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'];
    for (const hex of samples) {
      seen.add(getIntroText('Test Color', hex));
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(seen.size).toBeLessThanOrEqual(4);
  });

  it('includes the color name and hex in the rendered text', () => {
    const text = getIntroText('Sienna', '#b3460f');
    expect(text).toContain('Sienna');
    expect(text).toContain('#b3460f');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/text-variants.test.ts"
```

Expected: FAIL — `Cannot find module '../src/lib/text-variants'`.

- [ ] **Step 3: Write `src/lib/text-variants.ts`**

```ts
function hashHex(hex: string): number {
  let hash = 0;
  for (const char of hex) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

const TEMPLATES: Array<(name: string, hex: string) => string> = [
  (name, hex) => `${name} is a color with the hex code ${hex}. Below you'll find its exact RGB, HSL, CMYK, and OKLCH values, ready to copy into any design tool.`,
  (name, hex) => `Looking for the precise values behind ${name} (${hex})? This page breaks it down into every color format designers and developers actually use.`,
  (name, hex) => `${name}, represented by the hex value ${hex}, pairs naturally with the complementary and analogous shades shown further down this page.`,
  (name, hex) => `Here's everything about the color ${name} (${hex}) — its numeric values, nearby shades, and colors that share its hue family.`,
];

export function getIntroText(name: string, hex: string): string {
  const index = hashHex(hex) % TEMPLATES.length;
  return TEMPLATES[index](name, hex);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx vitest run tests/text-variants.test.ts"
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add tests/text-variants.test.ts src/lib/text-variants.ts && git commit -m 'feat: anti-duplicate-content intro text rotation'"
```

---

### Task 8: `scripts/prepare-data.mjs` — the data pipeline

**Files:**
- Create: `scripts/prepare-data.mjs`

This is a plain Node script (not TypeScript, run directly with `node`), since it's a build-time-only script, not part of the tested library surface. It reuses the already-tested logic from `src/lib/*.ts` by importing them directly — Node can execute `.ts` files here because `astro`'s toolchain registers a TS loader; if that turns out not to work standalone, the fallback is documented in Step 4.

- [ ] **Step 1: Write `scripts/prepare-data.mjs`**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  console.log(`Done. ${manifest.length} color pages, ${shardIndex} shards.`);
}

main();
```

- [ ] **Step 2: Try running it — check whether Node can import `.ts` files directly**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && node scripts/prepare-data.mjs"
```

Expected: either it works (Node 22.6+ has native `--experimental-strip-types`, or the installed LTS supports it out of the box), printing progress lines ending in `Done. 4945 color pages, 5 shards.` — **or** it fails with a syntax/import error on the `.ts` extension.

- [ ] **Step 3: If Step 2 failed on the `.ts` imports, fall back to running it through `tsx`**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm install --save-dev tsx"
```

Then change the `package.json` script from `"prepare-data": "node scripts/prepare-data.mjs"` to `"prepare-data": "tsx scripts/prepare-data.mjs"`, and re-run:

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npx tsx scripts/prepare-data.mjs"
```

Expected: `Done. 4945 color pages, 5 shards.`

- [ ] **Step 4: Verify the output files**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && ls data/colors/ && node -e \"console.log(JSON.parse(require('fs').readFileSync('data/colors/index.json')).length)\""
```

Expected: `index.json`, `search-index.json`, `shard-0.json` … `shard-4.json`; the count printed is `4945`.

- [ ] **Step 5: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add scripts/prepare-data.mjs package.json && git commit -m 'feat: data pipeline generating sharded color JSON from color-name-list bestof'"
```

(`data/` itself is gitignored per Task 0 — only the script and any `package.json` changes get committed.)

---

### Task 9: Shared Astro components

**Files:**
- Create: `src/components/ColorSwatch.astro`
- Create: `src/components/ValueTable.astro`
- Create: `src/components/HarmonyGrid.astro`
- Create: `src/components/CopyButton.astro`
- Create: `src/components/AppCTA.astro`

These aren't unit-tested individually (Astro components are integration-tested by the build-output check in Task 18) — but each has a single, obvious responsibility per the file structure plan.

- [ ] **Step 1: Write `src/components/CopyButton.astro`**

```astro
---
export interface Props {
  value: string;
  label: string;
}
const { value, label } = Astro.props;
---
<button
  type="button"
  class="copy-button inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
  data-copy-value={value}
  aria-label={`Copy ${label}`}
>
  <span>{label}</span>
  <span class="copy-feedback text-xs text-neutral-500" aria-hidden="true"></span>
</button>

<script>
  document.querySelectorAll<HTMLButtonElement>('.copy-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copyValue ?? '';
      await navigator.clipboard.writeText(value);
      const feedback = button.querySelector('.copy-feedback');
      if (feedback) {
        feedback.textContent = 'Copied!';
        setTimeout(() => {
          feedback.textContent = '';
        }, 1500);
      }
    });
  });
</script>
```

- [ ] **Step 2: Write `src/components/ColorSwatch.astro`**

```astro
---
export interface Props {
  hex: string;
  name?: string;
  size?: 'sm' | 'lg';
  href?: string;
}
const { hex, name, size = 'sm', href } = Astro.props;
const dimension = size === 'lg' ? 'h-48 w-full' : 'h-16 w-16';
const Tag = href ? 'a' : 'div';
---
<Tag
  href={href}
  class={`block rounded-lg border border-neutral-200 ${dimension}`}
  style={`background-color: ${hex};`}
  title={name ?? hex}
  aria-label={name ?? hex}
></Tag>
```

- [ ] **Step 3: Write `src/components/ValueTable.astro`**

```astro
---
import CopyButton from './CopyButton.astro';
import type { RgbValue, HslValue, CmykValue, LabValue, OklchValue } from '../lib/color-math';

export interface Props {
  hex: string;
  rgb: RgbValue;
  hsl: HslValue;
  cmyk: CmykValue;
  lab: LabValue;
  oklch: OklchValue;
}
const { hex, rgb, hsl, cmyk, lab, oklch } = Astro.props;

const rows = [
  { label: 'HEX', value: hex },
  { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
  { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
  { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
  { label: 'LAB', value: `lab(${lab.l}, ${lab.a}, ${lab.b})` },
  { label: 'OKLCH', value: `oklch(${oklch.l} ${oklch.c} ${oklch.h})` },
];
---
<table class="w-full border-collapse text-left">
  <tbody>
    {rows.map((row) => (
      <tr class="border-b border-neutral-200">
        <th class="py-2 pr-4 font-mono text-sm text-neutral-500">{row.label}</th>
        <td class="py-2 font-mono text-sm">{row.value}</td>
        <td class="py-2 text-right"><CopyButton value={row.value} label="Copy" /></td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 4: Write `src/components/HarmonyGrid.astro`**

Per spec §4.1 ("每個和諧色可點擊連到該色頁面...這是內部連結網的骨架" — explicitly flagged as
important), each harmony swatch must link to a real color page. `prepare-data.mjs` (Task 8)
resolves each theoretical harmony hue to the nearest *actual published* color before this component
ever sees it, so `harmonies` here is already a set of real, linkable `{name, slug, hex}` entries —
this component just renders them as links, it doesn't do any color math itself.

```astro
---
import ColorSwatch from './ColorSwatch.astro';

interface HarmonyEntry {
  name: string;
  slug: string;
  hex: string;
}

export interface ResolvedHarmonies {
  complementary: HarmonyEntry;
  analogous: HarmonyEntry[];
  triadic: HarmonyEntry[];
  splitComplementary: HarmonyEntry[];
}

export interface Props {
  harmonies: ResolvedHarmonies;
}
const { harmonies } = Astro.props;

const groups: Array<{ label: string; entries: HarmonyEntry[] }> = [
  { label: 'Complementary', entries: [harmonies.complementary] },
  { label: 'Analogous', entries: harmonies.analogous },
  { label: 'Triadic', entries: harmonies.triadic },
  { label: 'Split-Complementary', entries: harmonies.splitComplementary },
];
---
<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
  {groups.map((group) => (
    <div>
      <p class="mb-2 text-sm font-medium text-neutral-600">{group.label}</p>
      <div class="flex gap-2">
        {group.entries.map((entry) => (
          <ColorSwatch hex={entry.hex} name={entry.name} href={`/color/${entry.slug}/`} />
        ))}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Write `src/components/AppCTA.astro`**

```astro
---
import { buildPlayStoreUrl, type PageType } from '../lib/utm';

export interface Props {
  pageType: PageType;
  pageSlug: string;
  message?: string;
}
const {
  pageType,
  pageSlug,
  message = 'Spotted this color in the real world? Capture it instantly with HuePort.',
} = Astro.props;

const playStoreUrl = buildPlayStoreUrl(pageType, pageSlug);
---
<div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
  <p class="mb-4 text-lg">{message}</p>
  <div class="flex flex-wrap justify-center gap-3">
    <a
      href={playStoreUrl}
      class="rounded-full bg-neutral-900 px-5 py-2 text-white"
      rel="noopener"
    >
      Get it on Google Play
    </a>
  </div>
</div>
```

(No App Store button yet — HuePort iOS is still in TestFlight review per the project's own `CLAUDE.md`; add it once there's a public App Store URL. Noted, not built as a dead link.)

- [ ] **Step 6: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/components && git commit -m 'feat: shared color-page components (swatch, value table, harmony grid, copy button, app CTA)'"
```

---

### Task 10: `/color/[slug].astro` — the core page type

**Files:**
- Create: `src/pages/color/[slug].astro`

- [ ] **Step 1: Write `src/pages/color/[slug].astro`**

```astro
---
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Base from '../../layouts/Base.astro';
import ColorSwatch from '../../components/ColorSwatch.astro';
import ValueTable from '../../components/ValueTable.astro';
import HarmonyGrid from '../../components/HarmonyGrid.astro';
import AppCTA from '../../components/AppCTA.astro';
import { getIntroText } from '../../lib/text-variants';
import { hexToTailwindClass } from '../../lib/color-math';

interface ColorRecord {
  name: string;
  hex: string;
  slug: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  cmyk: { c: number; m: number; y: number; k: number };
  lab: { l: number; a: number; b: number };
  oklch: { l: number; c: number; h: number };
  harmonies: {
    complementary: { name: string; slug: string; hex: string };
    analogous: Array<{ name: string; slug: string; hex: string }>;
    triadic: Array<{ name: string; slug: string; hex: string }>;
    splitComplementary: Array<{ name: string; slug: string; hex: string }>;
  };
  tintsAndShades: { tints: string[]; shades: string[] };
  nearest: Array<{ name: string; slug: string; hex: string }>;
}

export async function getStaticPaths() {
  const dataDir = join(process.cwd(), 'data', 'colors');
  const manifest: Array<{ slug: string; shard: number }> = JSON.parse(
    readFileSync(join(dataDir, 'index.json'), 'utf-8'),
  );

  const shardCache = new Map<number, ColorRecord[]>();
  function loadShard(shard: number): ColorRecord[] {
    if (!shardCache.has(shard)) {
      const shardData = JSON.parse(
        readFileSync(join(dataDir, `shard-${shard}.json`), 'utf-8'),
      );
      shardCache.set(shard, shardData);
    }
    return shardCache.get(shard)!;
  }

  return manifest.map((entry) => {
    const shard = loadShard(entry.shard);
    const record = shard.find((r) => r.slug === entry.slug)!;
    return { params: { slug: entry.slug }, props: { record } };
  });
}

const { record } = Astro.props as { record: ColorRecord };
const title = `${record.name} Color — ${record.hex} | HEX, RGB, HSL & Palettes`;
const description = `${record.name} (${record.hex}) — view RGB, HSL, CMYK, LAB and OKLCH values, complementary and analogous palettes, tints, shades, and the closest named colors.`;
const introText = getIntroText(record.name, record.hex);
const tailwindMatch = hexToTailwindClass(record.hex);

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: title,
      description,
      url: `https://hueport-color-site.pages.dev/color/${record.slug}/`,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hueport-color-site.pages.dev/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: record.name,
          item: `https://hueport-color-site.pages.dev/color/${record.slug}/`,
        },
      ],
    },
  ],
};
---
<Base title={title} description={description} canonicalPath={`/color/${record.slug}/`}>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  </Fragment>

  <main class="mx-auto max-w-3xl px-4 py-10">
    <ColorSwatch hex={record.hex} name={record.name} size="lg" />
    <h1 class="mt-6 text-3xl font-semibold">{record.name}</h1>
    <p class="mt-2 font-mono text-neutral-500">{record.hex}</p>
    <p class="mt-4 text-neutral-700">{introText}</p>

    <section class="mt-8">
      <h2 class="mb-4 text-xl font-semibold">Color values</h2>
      <ValueTable
        hex={record.hex}
        rgb={record.rgb}
        hsl={record.hsl}
        cmyk={record.cmyk}
        lab={record.lab}
        oklch={record.oklch}
      />
    </section>

    <section class="mt-10">
      <h2 class="mb-4 text-xl font-semibold">Color harmonies</h2>
      <HarmonyGrid harmonies={record.harmonies} />
    </section>

    <section class="mt-10">
      <h2 class="mb-4 text-xl font-semibold">Tints &amp; shades</h2>
      <div class="flex flex-wrap gap-2">
        {record.tintsAndShades.tints.map((hex) => <ColorSwatch hex={hex} name={hex} />)}
        <ColorSwatch hex={record.hex} name={record.hex} />
        {record.tintsAndShades.shades.map((hex) => <ColorSwatch hex={hex} name={hex} />)}
      </div>
    </section>

    <section class="mt-10">
      <h2 class="mb-4 text-xl font-semibold">Code snippets</h2>
      <pre class="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-sm text-white"><code>{`color: ${record.hex};
background-color: ${record.hex};

/* Tailwind CSS (closest default swatch, not an exact match) */
${tailwindMatch.className}  /* ≈ ${tailwindMatch.hex} */

/* Flutter */
Color(0xFF${record.hex.replace('#', '').toUpperCase()})

/* Swift / UIKit */
UIColor(red: ${(record.rgb.r / 255).toFixed(2)}, green: ${(record.rgb.g / 255).toFixed(2)}, blue: ${(record.rgb.b / 255).toFixed(2)}, alpha: 1.0)`}</code></pre>
    </section>

    <section class="mt-10">
      <h2 class="mb-4 text-xl font-semibold">Similar named colors</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {record.nearest.map((n) => (
          <a href={`/color/${n.slug}/`} class="flex items-center gap-2 rounded border border-neutral-200 p-2">
            <ColorSwatch hex={n.hex} name={n.name} />
            <span class="text-sm">{n.name}</span>
          </a>
        ))}
      </div>
    </section>

    <div class="mt-10">
      <AppCTA pageType="color" pageSlug={record.slug} />
    </div>
  </main>
</Base>
```

- [ ] **Step 2: Run the dev server and spot-check one page**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run dev &" 
sleep 3
curl -s http://localhost:4321/color/sienna-b3460f/ | grep -o '<h1[^<]*</h1>'
```

Expected: an `<h1>` containing a color name (exact slug depends on what's in the `bestof` dataset — if `sienna-b3460f` doesn't exist, check `data/colors/index.json` for any real slug and curl that instead). Stop the dev server afterward (`kill %1` or Ctrl+C in an interactive shell).

- [ ] **Step 3: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/color && git commit -m 'feat: color detail page template with getStaticPaths'"
```

---

### Task 11: `/tools/hex-to-rgb.astro`

**Files:**
- Create: `src/pages/tools/hex-to-rgb.astro`

- [ ] **Step 1: Write `src/pages/tools/hex-to-rgb.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import AppCTA from '../../components/AppCTA.astro';

const title = 'HEX to RGB Converter (and RGB to HEX) | Free Online Tool';
const description = 'Convert HEX color codes to RGB and back, instantly, in your browser. No upload, no tracking, no signup.';
---
<Base title={title} description={description} canonicalPath="/tools/hex-to-rgb/">
  <main class="mx-auto max-w-xl px-4 py-10">
    <h1 class="text-3xl font-semibold">HEX ↔ RGB Converter</h1>
    <p class="mt-2 text-neutral-600">Type into either field — the other updates instantly.</p>

    <div class="mt-8 space-y-6">
      <label class="block">
        <span class="text-sm font-medium text-neutral-600">HEX</span>
        <input
          id="hex-input"
          type="text"
          value="#3B82F6"
          class="mt-1 w-full rounded border border-neutral-300 px-3 py-2 font-mono"
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-neutral-600">RGB</span>
        <input
          id="rgb-input"
          type="text"
          value="rgb(59, 130, 246)"
          class="mt-1 w-full rounded border border-neutral-300 px-3 py-2 font-mono"
        />
      </label>
      <div id="preview" class="h-24 w-full rounded-lg border border-neutral-200" style="background-color:#3B82F6;"></div>
    </div>

    <div class="mt-10">
      <AppCTA pageType="tool" pageSlug="hex-to-rgb" />
    </div>
  </main>

  <script>
    const hexInput = document.getElementById('hex-input') as HTMLInputElement;
    const rgbInput = document.getElementById('rgb-input') as HTMLInputElement;
    const preview = document.getElementById('preview') as HTMLDivElement;

    function hexToRgbString(hex: string): string | null {
      const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
      if (!match) return null;
      const num = parseInt(match[1], 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgb(${r}, ${g}, ${b})`;
    }

    function rgbToHexString(rgb: string): string | null {
      const match = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.exec(rgb.trim());
      if (!match) return null;
      const [, r, g, b] = match;
      const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    hexInput.addEventListener('input', () => {
      const rgb = hexToRgbString(hexInput.value);
      if (rgb) {
        rgbInput.value = rgb;
        preview.style.backgroundColor = hexInput.value;
      }
    });

    rgbInput.addEventListener('input', () => {
      const hex = rgbToHexString(rgbInput.value);
      if (hex) {
        hexInput.value = hex;
        preview.style.backgroundColor = hex;
      }
    });
  </script>
</Base>
```

- [ ] **Step 2: Manual check in dev server**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run dev &"
sleep 3
curl -s http://localhost:4321/tools/hex-to-rgb/ | grep -o '<h1[^<]*</h1>'
kill %1
```

Expected: `<h1 class="text-3xl font-semibold">HEX ↔ RGB Converter</h1>`.

- [ ] **Step 3: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/tools/hex-to-rgb.astro && git commit -m 'feat: hex-to-rgb tool page'"
```

---

### Task 12: `/tools/color-picker.astro`

**Files:**
- Create: `src/pages/tools/color-picker.astro`

- [ ] **Step 1: Write `src/pages/tools/color-picker.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import AppCTA from '../../components/AppCTA.astro';

const title = 'Online Color Picker — Pick Colors From an Image | Free Tool';
const description = 'Upload an image and click anywhere to pick its exact color as HEX, RGB, and HSL. Runs entirely in your browser — nothing is uploaded.';
---
<Base title={title} description={description} canonicalPath="/tools/color-picker/">
  <main class="mx-auto max-w-xl px-4 py-10">
    <h1 class="text-3xl font-semibold">Color Picker</h1>
    <p class="mt-2 text-neutral-600">
      Upload an image, then click anywhere on it to sample that pixel's color. Everything happens
      in your browser — the image is never uploaded anywhere.
    </p>

    <input id="image-input" type="file" accept="image/*" class="mt-6 block" />
    <canvas id="canvas" class="mt-4 max-w-full rounded-lg border border-neutral-200"></canvas>

    <div class="mt-6 flex items-center gap-4">
      <div id="picked-swatch" class="h-16 w-16 rounded-lg border border-neutral-200"></div>
      <div>
        <p id="picked-hex" class="font-mono">—</p>
        <p id="picked-rgb" class="font-mono text-sm text-neutral-500">—</p>
      </div>
    </div>

    <div class="mt-10">
      <AppCTA
        pageType="tool"
        pageSlug="color-picker"
        message="Need to pick colors from the real world, not just the screen? Try HuePort."
      />
    </div>
  </main>

  <script>
    const imageInput = document.getElementById('image-input') as HTMLInputElement;
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const pickedSwatch = document.getElementById('picked-swatch') as HTMLDivElement;
    const pickedHex = document.getElementById('picked-hex') as HTMLParagraphElement;
    const pickedRgb = document.getElementById('picked-rgb') as HTMLParagraphElement;

    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((event.clientX - rect.left) * scaleX);
      const y = Math.floor((event.clientY - rect.top) * scaleY);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      pickedSwatch.style.backgroundColor = hex;
      pickedHex.textContent = hex;
      pickedRgb.textContent = `rgb(${r}, ${g}, ${b})`;
    });
  </script>
</Base>
```

- [ ] **Step 2: Manual check in dev server**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run dev &"
sleep 3
curl -s http://localhost:4321/tools/color-picker/ | grep -o '<h1[^<]*</h1>'
kill %1
```

Expected: `<h1 class="text-3xl font-semibold">Color Picker</h1>`.

- [ ] **Step 3: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/tools/color-picker.astro && git commit -m 'feat: color-picker tool page (canvas-based image sampling)'"
```

---

### Task 13: `/tools/index.astro` — tools overview

**Files:**
- Create: `src/pages/tools/index.astro`

- [ ] **Step 1: Write `src/pages/tools/index.astro`**

```astro
---
import Base from '../../layouts/Base.astro';

const title = 'Free Color Tools — Converters, Picker & More | HuePort';
const description = 'Free browser-based color tools: HEX to RGB converter, color picker, and more. No signup, no tracking.';

const tools = [
  { href: '/tools/hex-to-rgb/', name: 'HEX to RGB Converter', blurb: 'Convert between HEX and RGB instantly.' },
  { href: '/tools/color-picker/', name: 'Color Picker', blurb: 'Pick exact colors from any uploaded image.' },
];
---
<Base title={title} description={description} canonicalPath="/tools/">
  <main class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="text-3xl font-semibold">Color Tools</h1>
    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      {tools.map((tool) => (
        <a href={tool.href} class="rounded-xl border border-neutral-200 p-6 hover:border-neutral-400">
          <h2 class="text-lg font-medium">{tool.name}</h2>
          <p class="mt-1 text-sm text-neutral-600">{tool.blurb}</p>
        </a>
      ))}
    </div>
  </main>
</Base>
```

- [ ] **Step 2: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/tools/index.astro && git commit -m 'feat: tools overview page'"
```

---

### Task 14: `/app/` — HuePort landing page

**Files:**
- Create: `src/pages/app.astro`

- [ ] **Step 1: Write `src/pages/app.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import { buildPlayStoreUrl } from '../lib/utm';

const title = 'HuePort — Instant Real-World Color Capture App';
const description = 'HuePort turns your phone camera into a real-time color meter: HEX, RGB, HSL and CMYK values for anything you point it at. One-time purchase, no subscription.';
const playStoreUrl = buildPlayStoreUrl('app', 'landing');

const faqs = [
  {
    q: 'Does HuePort require a subscription?',
    a: 'No. HuePort is a one-time purchase (hueport_pro) that unlocks every feature permanently — no recurring fees.',
  },
  {
    q: 'How does real-time color capture work?',
    a: 'Point your camera at anything and HuePort reads the color under the reticle live, showing HEX, RGB, HSL and CMYK values instantly.',
  },
  {
    q: 'Can I save colors I find?',
    a: 'Yes — every captured color can be saved to your personal color gallery for later reference.',
  },
  {
    q: 'Is HuePort available on iOS?',
    a: 'HuePort is currently in TestFlight external testing on iOS, with a public App Store release planned once review completes.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
};
---
<Base title={title} description={description} canonicalPath="/app/">
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  </Fragment>

  <main class="mx-auto max-w-2xl px-4 py-16 text-center">
    <h1 class="text-4xl font-semibold">HuePort</h1>
    <p class="mt-4 text-xl text-neutral-600">
      Point your camera at anything. See its exact color, instantly.
    </p>
    <a
      href={playStoreUrl}
      class="mt-8 inline-block rounded-full bg-neutral-900 px-6 py-3 text-white"
      rel="noopener"
    >
      Get it on Google Play
    </a>

    <section class="mt-16 grid gap-8 text-left sm:grid-cols-3">
      <div>
        <h2 class="font-medium">Capture instantly</h2>
        <p class="mt-1 text-sm text-neutral-600">Live camera color reading — no photo, no wait.</p>
      </div>
      <div>
        <h2 class="font-medium">Every format you need</h2>
        <p class="mt-1 text-sm text-neutral-600">HEX, RGB, HSL, CMYK, and more, all at once.</p>
      </div>
      <div>
        <h2 class="font-medium">Build your palette</h2>
        <p class="mt-1 text-sm text-neutral-600">Save colors to a personal gallery as you go.</p>
      </div>
    </section>

    <section class="mt-16 text-left">
      <h2 class="text-2xl font-semibold">One-time purchase. No subscription.</h2>
      <p class="mt-2 text-neutral-600">
        HuePort's full feature set unlocks with a single purchase (hueport_pro) — pay once, own it
        forever.
      </p>
    </section>

    <section class="mt-16 text-left">
      <h2 class="text-2xl font-semibold">FAQ</h2>
      <div class="mt-4 space-y-6">
        {faqs.map((faq) => (
          <div>
            <h3 class="font-medium">{faq.q}</h3>
            <p class="mt-1 text-sm text-neutral-600">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  </main>
</Base>
```

- [ ] **Step 2: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/app.astro && git commit -m 'feat: HuePort app landing page with FAQ JSON-LD'"
```

---

### Task 15: Homepage + client-side search

**Files:**
- Create: `src/pages/index.astro`
- Create: `public/search-index.json` — **not** created directly; copied from `data/colors/search-index.json` at build time (Step 2 below wires this up)

- [ ] **Step 1: Write `src/pages/index.astro`**

```astro
---
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Base from '../layouts/Base.astro';
import ColorSwatch from '../components/ColorSwatch.astro';
import AppCTA from '../components/AppCTA.astro';

const title = 'HuePort Color — Search, Convert, and Explore Colors';
const description = 'Search 4,900+ named colors, convert HEX/RGB/HSL/CMYK, and explore color harmonies. Free tools, no signup.';

interface SearchEntry {
  name: string;
  hex: string;
  slug: string;
}

const searchIndexPath = join(process.cwd(), 'data', 'colors', 'search-index.json');
const allColors: SearchEntry[] = JSON.parse(readFileSync(searchIndexPath, 'utf-8'));

// Deterministic "featured" grid: first 24 entries in the curated bestof order.
const featured = allColors.slice(0, 24);
---
<Base title={title} description={description} canonicalPath="/">
  <main class="mx-auto max-w-4xl px-4 py-10">
    <h1 class="text-3xl font-semibold">Search any color</h1>
    <input
      id="search-input"
      type="text"
      placeholder="Try 'sienna' or '#b3460f'"
      class="mt-4 w-full rounded border border-neutral-300 px-4 py-3 text-lg"
      autocomplete="off"
    />
    <ul id="search-results" class="mt-2 divide-y divide-neutral-100"></ul>

    <section class="mt-12">
      <h2 class="mb-4 text-xl font-semibold">Featured colors</h2>
      <div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {featured.map((color) => (
          <a href={`/color/${color.slug}/`} class="text-center">
            <ColorSwatch hex={color.hex} name={color.name} />
            <span class="mt-1 block truncate text-xs">{color.name}</span>
          </a>
        ))}
      </div>
    </section>

    <section class="mt-12">
      <h2 class="mb-4 text-xl font-semibold">Tools</h2>
      <a href="/tools/" class="text-neutral-700 underline">Browse all color tools →</a>
    </section>

    <div class="mt-12">
      <AppCTA pageType="home" pageSlug="homepage" />
    </div>
  </main>

  <script>
    interface SearchEntry {
      name: string;
      hex: string;
      slug: string;
    }

    const input = document.getElementById('search-input') as HTMLInputElement;
    const results = document.getElementById('search-results') as HTMLUListElement;
    let index: SearchEntry[] = [];

    fetch('/search-index.json')
      .then((res) => res.json())
      .then((data: SearchEntry[]) => {
        index = data;
      });

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (query.length < 2) return;
      const matches = index
        .filter((entry) => entry.name.toLowerCase().includes(query) || entry.hex.includes(query.replace('#', '')))
        .slice(0, 10);
      for (const match of matches) {
        const li = document.createElement('li');
        li.className = 'py-2';
        const a = document.createElement('a');
        a.href = `/color/${match.slug}/`;
        a.className = 'flex items-center gap-3';
        a.innerHTML = `<span style="background-color:${match.hex}" class="h-6 w-6 rounded border border-neutral-200 inline-block"></span><span>${match.name}</span><span class="text-neutral-400 font-mono text-sm">${match.hex}</span>`;
        li.appendChild(a);
        results.appendChild(li);
      }
    });
  </script>
</Base>
```

- [ ] **Step 2: Make `search-index.json` available as a static asset**

Astro serves anything under `public/` verbatim at the site root, but our search index lives under `data/colors/` (gitignored, regenerated per build) — it needs to land in `public/` before `astro build` runs. Add a copy step to `scripts/prepare-data.mjs`: append this to the end of `main()`, right after the `writeFileSync(join(dataDir, 'search-index.json'), ...)` line:

```js
  const publicDir = join(rootDir, 'public');
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(join(dataDir, 'search-index.json'), join(publicDir, 'search-index.json'));
```

And add `copyFileSync` to the existing `node:fs` import at the top of `scripts/prepare-data.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
```

- [ ] **Step 3: Re-run the data pipeline and verify the copy**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run prepare-data && ls -la public/search-index.json"
```

Expected: file exists, non-zero size.

- [ ] **Step 4: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/index.astro scripts/prepare-data.mjs public/.gitignore 2>/dev/null; git add -A -- ':!data' ':!public/search-index.json'; git commit -m 'feat: homepage with client-side color search'"
```

Note: `public/search-index.json` is a generated file (same category as everything in `data/`) — add `search-index.json` to `.gitignore` alongside the existing entries so it isn't accidentally committed:

```gitignore
node_modules/
dist/
data/
.astro/
*.log
.DS_Store
public/search-index.json
```

---

### Task 16: `/colors/[letter].astro` — A–Z index pages

**Files:**
- Create: `src/pages/colors/[letter].astro`

- [ ] **Step 1: Write `src/pages/colors/[letter].astro`**

```astro
---
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Base from '../../layouts/Base.astro';
import ColorSwatch from '../../components/ColorSwatch.astro';

interface SearchEntry {
  name: string;
  hex: string;
  slug: string;
}

export async function getStaticPaths() {
  const searchIndexPath = join(process.cwd(), 'data', 'colors', 'search-index.json');
  const allColors: SearchEntry[] = JSON.parse(readFileSync(searchIndexPath, 'utf-8'));

  const byLetter = new Map<string, SearchEntry[]>();
  for (const color of allColors) {
    const letter = /^[a-z]/i.test(color.name) ? color.name[0].toUpperCase() : '#';
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter)!.push(color);
  }

  return [...byLetter.entries()].map(([letter, colors]) => ({
    params: { letter },
    props: { colors: colors.sort((a, b) => a.name.localeCompare(b.name)) },
  }));
}

const { letter } = Astro.params;
const { colors } = Astro.props as { colors: SearchEntry[] };
const title = `Colors Starting With "${letter}" | HuePort Color`;
const description = `Browse ${colors.length} named colors starting with "${letter}" — HEX, RGB, HSL values and more.`;
---
<Base title={title} description={description} canonicalPath={`/colors/${letter}/`}>
  <main class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="text-3xl font-semibold">Colors starting with "{letter}"</h1>
    <ul class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {colors.map((color) => (
        <li>
          <a href={`/color/${color.slug}/`} class="flex items-center gap-2">
            <ColorSwatch hex={color.hex} name={color.name} />
            <span class="text-sm">{color.name}</span>
          </a>
        </li>
      ))}
    </ul>
  </main>
</Base>
```

- [ ] **Step 2: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/colors && git commit -m 'feat: A-Z color index pages'"
```

---

### Task 17: Sitemap + robots.txt

**Files:**
- Create: `src/pages/sitemap-index.xml.ts`
- Create: `public/robots.txt`

Astro's official `@astrojs/sitemap` integration generates one sitemap for the whole site; per spec §6.3 each shard must stay ≤ 5,000 URLs. With ~4,945 color pages + ~10 static pages, Phase 1 fits in a **single** sitemap file comfortably under the 5,000-URL limit, so a hand-written single-file sitemap is simpler and just as correct as sharding logic we don't need yet — sharding becomes necessary in Phase 2 at 30k+ pages, not now.

- [ ] **Step 1: Write `src/pages/sitemap-index.xml.ts`**

```ts
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

  const staticPaths = ['/', '/app/', '/tools/', '/tools/hex-to-rgb/', '/tools/color-picker/'];
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
```

- [ ] **Step 2: Write `public/robots.txt`**

Same placeholder-domain caveat as `astro.config.mjs` (Task 1, Step 2) — update this URL together
with `site` once Jun has the real Cloudflare Pages subdomain.

```
User-agent: *
Allow: /

Sitemap: https://hueport-color-site.pages.dev/sitemap-index.xml
```

- [ ] **Step 3: Verify in dev server**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run dev &"
sleep 3
curl -s http://localhost:4321/sitemap-index.xml | head -5
curl -s http://localhost:4321/robots.txt
kill %1
```

Expected: valid-looking XML starting with `<?xml version="1.0"...` and the robots.txt content verbatim.

- [ ] **Step 4: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add src/pages/sitemap-index.xml.ts public/robots.txt && git commit -m 'feat: sitemap and robots.txt'"
```

---

### Task 18: Post-build validation script

**Files:**
- Create: `scripts/validate-build.mjs`

This is what makes `npm run build` a real acceptance gate, not just "it didn't crash." Runs automatically as the last step of `npm run build` (already wired into `package.json` in Task 1).

- [ ] **Step 1: Write `scripts/validate-build.mjs`**

```js
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
  }
  console.log(`Verified ${sampleSlugs.length} sample pages contain CTA + UTM links.`);

  const requiredFiles = [
    'index.html',
    'app/index.html',
    'tools/index.html',
    'tools/hex-to-rgb/index.html',
    'tools/color-picker/index.html',
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
```

- [ ] **Step 2: Run the full build and confirm validation passes**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm run build"
```

Expected: ends with `✅ Build validation passed.` and exit code 0. If any check fails, fix the underlying page/component (not the validator) before proceeding — the validator's thresholds match the Phase 1 acceptance criteria in the spec (§8: "5,000+ 頁", "CTA 連結 UTM 完整").

- [ ] **Step 3: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add scripts/validate-build.mjs && git commit -m 'feat: post-build validation (page count, sample content, UTM links, required files)'"
```

---

### Task 19: README + final deploy-readiness check

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
2. `astro build` — outputs the static site to **`dist/`**.
3. `scripts/validate-build.mjs` — fails the build (non-zero exit code) if the page count, sample
   page content, or required static files don't match Phase 1's acceptance criteria.

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
```

- [ ] **Step 2: Final full-repo check**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && npm test && npm run build && du -sh dist/ && ls dist/color/ | wc -l"
```

Expected: all Vitest tests pass, build succeeds, `dist/color/` contains 4,900+ directories.

- [ ] **Step 3: Commit**

```bash
wsl -e bash -lc "cd ~/projects/hueport-color-site && git add README.md && git commit -m 'docs: README with build/deploy instructions and Phase 1 checkpoints'"
```

- [ ] **Step 4: Report deploy-readiness to Jun**

Summarize for Jun (in the chat, not a file): total color pages generated, `npm test` result, `npm run build` result including the validator's output, confirmation that `dist/` is the output directory, and a reminder that pushing to GitHub + connecting Cloudflare Pages is his next manual step.

---

## Definition of Done (matches Jun's decision #3)

- [ ] `npm run build` succeeds from a clean `npm install`, every time, with no manual steps.
- [ ] `dist/` contains 4,900+ color page directories, `/app/`, `/tools/`, 2 tool pages, sitemap, robots.txt.
- [ ] `npm test` passes (color-math, slug, utm, text-variants — all four `src/lib/*.ts` modules covered).
- [ ] Every color page's CTA link contains the correct UTM parameters (enforced by `validate-build.mjs`, not just eyeballed).
- [ ] `README.md` states the exact build command (`npm run build`) and output directory (`dist`) so Jun can configure Cloudflare Pages without needing to ask.
- [ ] `DECISIONS.md` has all 6 implementation-level decisions logged.
- [ ] Repo is git-initialized, independent from `D:\dev\TrueHue`, living on WSL2's native filesystem.
- [ ] Nothing was pushed to GitHub, no Cloudflare API touched, no Search Console submission attempted — that's Jun's step.
