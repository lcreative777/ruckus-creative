// astro.config.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// src/middleware.ts's onRequest never runs for a static build on the Cloudflare
// adapter: the assets binding serves (or 404s) a request before the Worker's
// middleware gets a chance to intercept it, verified locally with `wrangler
// dev` (GET /contact/ returned 404 instead of a 301). Astro's own `redirects`
// config is compiled into static 301 HTML/headers at build time instead, so it
// isn't subject to that ordering problem. Read from the same JSON the tests use
// so the two never drift.
const redirectsJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('./src/redirects.json', import.meta.url)), 'utf-8'),
);
const redirects = Object.fromEntries(
  redirectsJson.map((r) => [r.from, { status: r.status, destination: r.to }]),
);

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
  redirects,
});
