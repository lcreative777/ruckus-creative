// astro.config.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// <lastmod> for the knowledge posts, read from each post's own `updatedDate`
// frontmatter rather than stamped at build time. That distinction matters:
// a build-time date would change all nine entries on every deploy, Google
// would learn the signal is meaningless, and it would start discounting
// lastmod for the whole site. A stored date only moves when the post does.
//
// Deliberately not emitted for pages without a real modification date, and
// `changefreq`/`priority` are omitted entirely — Google ignores both.
const knowledgeDir = fileURLToPath(new URL('./src/content/knowledge', import.meta.url));
const lastmodByPath = new Map(
  readdirSync(knowledgeDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(`${knowledgeDir}/${f}`, 'utf-8'))
    .map((raw) => [
      raw.match(/^path:\s*"([^"]+)"/m)?.[1],
      raw.match(/^updatedDate:\s*"([^"]+)"/m)?.[1],
    ])
    .filter(([p, d]) => p && d),
);

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
  integrations: [
    sitemap({
      serialize(entry) {
        const path = new URL(entry.url).pathname;
        const lastmod = lastmodByPath.get(path);
        return lastmod ? { ...entry, lastmod } : entry;
      },
    }),
  ],
  trailingSlash: 'always', // matches every existing WordPress URL
  build: { format: 'directory' },
  redirects,
});
