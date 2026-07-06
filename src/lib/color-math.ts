import { converter, formatHex, differenceEuclidean } from 'culori';

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

// Tailwind v4's default palette is defined natively in OKLCH (see node_modules/tailwindcss/theme.css).
// These are the *-500 (base tone) hex values for each of Tailwind's 22 default color families,
// converted from their real OKLCH definitions during planning — verified, not guessed. Only the
// -500 weight is used as a lightweight "closest hue family" hint, not a full 11-shade match.
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

export { formatHex };
