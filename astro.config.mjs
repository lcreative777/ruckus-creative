// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ruckuscreative.com',
  // `output` defaults to 'static'. /api/contact opts out with `export const prerender = false`.
  adapter: cloudflare(),
  integrations: [mdx(), sitemap()],
  trailingSlash: 'always', // matches every existing WordPress URL
  build: { format: 'directory' },
});
