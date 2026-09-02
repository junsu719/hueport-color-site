export type PageType = 'color' | 'tool' | 'app' | 'home';

const PLAY_STORE_BASE = 'https://play.google.com/store/apps/details';
const PLAY_STORE_PACKAGE = 'com.truehue.studio';
const APP_STORE_BASE = 'https://apps.apple.com/us/app/hueport/id6785950182';

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

export function buildAppStoreUrl(pageType: PageType, pageSlug: string): string {
  const params = new URLSearchParams({
    utm_source: 'colorsite',
    utm_medium: 'referral',
    utm_campaign: pageType,
    utm_content: pageSlug,
  });
  return `${APP_STORE_BASE}?${params.toString()}`;
}
