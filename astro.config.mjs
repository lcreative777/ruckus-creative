// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ruckuscreative.com',
  // `output` defaults to 'static'. /api/contact opts out with `export const prerender = false`.
  // imageService 'compile' runs sharp at build time and emits static AVIF/WebP
  // files. The adapter's default routes images through Cloudflare Images, which
  // is metered — pointless here, since every image is known at build time and a
  // static file is cheaper, faster, and free.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  trailingSlash: 'always', // matches every existing WordPress URL
  build: { format: 'directory' },
});
