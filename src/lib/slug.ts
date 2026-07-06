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
