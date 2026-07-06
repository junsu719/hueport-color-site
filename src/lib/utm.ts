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
