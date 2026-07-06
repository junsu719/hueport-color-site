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

export function getTemplateIndex(hex: string): number {
  return hashHex(hex) % TEMPLATES.length;
}

export function getIntroText(name: string, hex: string): string {
  const index = getTemplateIndex(hex);
  return TEMPLATES[index](name, hex);
}
