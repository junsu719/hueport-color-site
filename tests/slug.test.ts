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
