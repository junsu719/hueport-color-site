import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hueport-color-site.pages.dev', // placeholder — update once Cloudflare Pages assigns the real subdomain
  vite: {
    plugins: [tailwindcss()],
  },
});
