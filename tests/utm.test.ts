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
