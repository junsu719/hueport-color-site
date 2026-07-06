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
