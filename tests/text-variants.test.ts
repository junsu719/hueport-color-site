import { describe, it, expect } from 'vitest';
import { getIntroText, getTemplateIndex } from '../src/lib/text-variants';

describe('getIntroText', () => {
  it('is deterministic for the same hex', () => {
    const a = getIntroText('Sienna', '#b3460f');
    const b = getIntroText('Sienna', '#b3460f');
    expect(a).toBe(b);
  });

  it('picks one of exactly 4 template indices, and different hexes can land on different indices', () => {
    const seen = new Set<number>();
    // Verified during implementation: these real hex values naturally hash into different buckets
    // (unlike '#000000'..'#777777', whose near-identical bit patterns collide into a single bucket).
    const samples = ['#b3460f', '#ff0000', '#123456', '#c0ffee'];
    for (const hex of samples) {
      const index = getTemplateIndex(hex);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(3);
      seen.add(index);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('includes the color name and hex in the rendered text', () => {
    const text = getIntroText('Sienna', '#b3460f');
    expect(text).toContain('Sienna');
    expect(text).toContain('#b3460f');
  });
});
