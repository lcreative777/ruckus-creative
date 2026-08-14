# Ruckus Astro Rebuild — Plan 1: Foundation & Content Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Astro project and extract all 39 pages of content plus media from the live WordPress site into validated, committed content collections, so that the build no longer depends on WordPress.

**Architecture:** A one-shot Node migration script split into four focused modules — URL inventory, WordPress client, HTML cleaner, media downloader — orchestrated by `scripts/migrate.mjs`. Each module is unit-tested against real fixture HTML captured from the live site. Output is Markdown files under `src/content/` with SEO metadata in frontmatter and cleaned semantic HTML in the body.

**Tech Stack:** Astro 7.2, `@astrojs/cloudflare` 14.2, `@astrojs/mdx`, `@astrojs/sitemap`, Vitest, Cheerio 1.x, Wrangler 4.x.

**Spec:** `docs/superpowers/specs/2026-08-13-ruckus-astro-rebuild-design.md`

**This is Plan 1 of 3:**
1. **Foundation & Content Migration** (this plan) — scaffold, prerequisites, extraction, content committed
2. **Site Build** — design tokens, layouts, the six vanilla components, all 39 routes, redirects, SEO
3. **Form, Deploy & Verification** — Turnstile + Email Worker, preview deploy, Lighthouse, cutover

**Working directory for all commands:** `/Users/ericslarson/Sites/p-r/RuckusCreative/ruckus-astro`

---

## File Structure

**Created by this plan:**

| File | Responsibility |
|---|---|
| `package.json` | Dependencies and scripts |
| `astro.config.mjs` | Astro + Cloudflare adapter + MDX + sitemap |
| `wrangler.jsonc` | Worker name, entrypoint, compatibility date |
| `tsconfig.json` | TypeScript config |
| `vitest.config.mjs` | Test runner config |
| `src/content.config.ts` | Zod schemas for the three collections |
| `scripts/lib/inventory.mjs` | Canonical URL list + redirect map. Single source of truth for scope. |
| `scripts/lib/wp-client.mjs` | Fetches a URL's content via REST, falling back to rendered DOM |
| `scripts/lib/html-to-content.mjs` | Strips WPBakery/Salient markup, returns semantic HTML + image list |
| `scripts/lib/media.mjs` | Downloads images, dedupes, returns URL→filename map |
| `scripts/migrate.mjs` | Orchestrator: inventory → fetch → clean → media → write MDX |
| `tests/fixtures/` | Real HTML captured from the live site |
| `tests/*.test.mjs` | Unit tests per module |
| `src/content/{pages,work,knowledge}/*.md` | Migration output (committed) |
| `src/assets/media/` | Downloaded images (committed) |

**Why this split:** `inventory` is pure data with no I/O, so it is trivially testable and is the one place scope changes. `wp-client` owns all network access. `html-to-content` is a pure function — HTML in, HTML out — which is what makes the messy WPBakery logic testable against fixtures. `media` owns the filesystem. The orchestrator holds no logic of its own.

---

## Task 1: Verify Cloudflare prerequisites

Per the spec, this is checked **before** any form code exists, because a failure here changes the approach. This task is investigation, not code.

**Files:** none (findings recorded in the task's commit message and reported to the user)

- [ ] **Step 1: Confirm which account wrangler can reach**

```bash
npx wrangler whoami
```

Expected: a table of accounts. The target account `c0780521925c950ef323a873c907c291` **will not be listed** — the current token is for account `5d0898afa5e5bb1d123f97bfb5fcde2d`.

- [ ] **Step 2: Report the blocker and stop this task**

This is a known, expected blocker documented in the spec. Do **not** attempt `wrangler login` — it opens an interactive browser flow that cannot complete in an agent session.

Report to the user, verbatim:

> Deployment to account `c0780521925c950ef323a873c907c291` needs credentials. Either run `wrangler login` while signed into that account, or create an API token with: Workers Scripts (Edit), Workers Routes (Edit), Email Routing (Edit), Zone (Read).
>
> Separately, confirm in the dashboard for that account: (a) the `ruckuscreative.com` zone is present, (b) Email Routing is enabled on it, and (c) there is a **verified** destination address. `send_email` only delivers to a verified destination.

- [ ] **Step 3: Proceed without blocking**

Tasks 2–12 require no Cloudflare access. Continue to Task 2. Deployment is Plan 3.

---

## Task 2: Scaffold the Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`, `vitest.config.mjs`

- [ ] **Step 1: Initialize package.json**

```bash
npm init -y
npm pkg set name="ruckus-astro" version="0.1.0" type="module" private=true
npm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.preview="wrangler dev"
npm pkg set scripts.check="astro check" scripts.test="vitest run"
npm pkg set scripts.migrate="node scripts/migrate.mjs" scripts.redirects="node scripts/emit-redirects.mjs"
```

`npm init -y` writes a default `scripts.test` that errors out; the `npm pkg set scripts.test` above overwrites it.

- [ ] **Step 2: Install dependencies**

```bash
npm install astro@^7.2.2 @astrojs/cloudflare@^14.2.1 @astrojs/mdx@^7.0.5 @astrojs/sitemap@^3.7.3
npm install --save-dev vitest@^3 cheerio@^1.0.0 typescript@^5
```

Expected: installs without peer-dependency errors. `@astrojs/cloudflare` requires `astro ^7.2.0` and `wrangler ^4.83.0`; wrangler 4.123.0 is already available via npx.

- [ ] **Step 3: Write astro.config.mjs**

```javascript
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
```

`trailingSlash: 'always'` and `format: 'directory'` together are what preserve URLs like `/about/` exactly. Getting this wrong silently breaks every inbound link, so it belongs in config from the first commit.

- [ ] **Step 4: Write wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ruckuscreative",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-08-13",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./dist", "binding": "ASSETS" }
}
```

- [ ] **Step 5: Write tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 6: Write vitest.config.mjs**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.mjs'], environment: 'node' },
});
```

- [ ] **Step 7: Verify the build runs**

```bash
npx astro build
```

Expected: succeeds with a warning about no pages, or builds zero routes. Any *error* here means the config is wrong — fix before continuing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 7 project with Cloudflare adapter"
```

---

## Task 3: URL inventory module

The single source of truth for scope. Pure data, no I/O.

**Files:**
- Create: `scripts/lib/inventory.mjs`
- Test: `tests/inventory.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/inventory.test.mjs
import { describe, it, expect } from 'vitest';
import { PAGES, WORK, KNOWLEDGE, REDIRECTS, allEntries } from '../scripts/lib/inventory.mjs';

describe('inventory', () => {
  it('has the exact counts from the spec', () => {
    expect(PAGES).toHaveLength(10);
    expect(WORK).toHaveLength(20);
    expect(KNOWLEDGE).toHaveLength(9);
    expect(allEntries()).toHaveLength(39);
  });

  it('gives every entry a trailing-slash path', () => {
    for (const e of allEntries()) {
      expect(e.path.startsWith('/')).toBe(true);
      expect(e.path.endsWith('/')).toBe(true);
    }
  });

  it('uses /work/ paths for portfolio entries', () => {
    for (const e of WORK) expect(e.path).toMatch(/^\/work\/[a-z0-9-]+\/$/);
  });

  it('excludes all 8 demo posts from KNOWLEDGE', () => {
    const demo = ['you-think-water-moves-fast', 'airspeed-velocity-of-a-swallow',
      'when-do-spiders-sleep', 'youre-the-expert-now', 'a-matter-of-deductive-logic',
      'mauris-imperdiet-eros', 'aliquam-at-dui-velit', 'ut-placerat-egestas'];
    const slugs = KNOWLEDGE.map(e => e.slug);
    for (const d of demo) expect(slugs).not.toContain(d);
  });

  it('redirects every demo post plus the duplicates', () => {
    expect(REDIRECTS).toHaveLength(11);
    for (const r of REDIRECTS) {
      expect(r.from.endsWith('/')).toBe(true);
      expect(r.to.endsWith('/')).toBe(true);
      expect(r.status).toBe(301);
    }
  });

  it('never redirects a URL that is also migrated', () => {
    const live = new Set(allEntries().map(e => e.path));
    for (const r of REDIRECTS) expect(live.has(r.from)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/inventory.test.mjs
```

Expected: FAIL — cannot resolve `../scripts/lib/inventory.mjs`.

- [ ] **Step 3: Write the module**

```javascript
// scripts/lib/inventory.mjs
export const ORIGIN = 'https://ruckuscreative.com';

const page = (slug, path) => ({ type: 'page', slug, path, url: ORIGIN + path });
const work = (slug) => ({ type: 'work', slug, path: `/work/${slug}/`, url: `${ORIGIN}/work/${slug}/` });
const post = (slug) => ({ type: 'knowledge', slug, path: `/${slug}/`, url: `${ORIGIN}/${slug}/` });

export const PAGES = [
  page('home', '/'),
  page('about', '/about/'),
  page('strategic-creative-capabilities', '/strategic-creative-capabilities/'),
  page('process-ruckus-creative', '/process-ruckus-creative/'),
  page('results-based-advertising-branding', '/results-based-advertising-branding/'),
  page('knowledge', '/knowledge/'),
  page('portfolio-ruckus', '/portfolio-ruckus/'),
  page('contact-ruckus-creative', '/contact-ruckus-creative/'),
  page('privacy-policy', '/privacy-policy/'),
  page('terms-and-conditions', '/terms-and-conditions/'),
];

export const WORK = [
  'colorgraphics', 'heineken', 'dual-graphics', 'fnic', 'future-fins',
  'kirin-brewery', 'metrex-research', 'national-planning-corp', 'qai-laboratories',
  'surf-rx', 'jwc-environmental', 'the-rms-group', 'tecate-cervesa',
  'touchpoint-marketing', 'us-pool-tile', 'sophia-redpeg-marketing',
  'universal-pool-tile', 'mayweather-the-best-ever-book', 'aqua-flo', 'dos-equis',
].map(work);

export const KNOWLEDGE = [
  'whats-your-point-let-your-prospects-say-no-as-long-as-they-know-what-you-offer',
  'print-is-expensive-dont-let-your-sales-team-waste-it-qualify-qualify-qualify',
  'advertising-is-for-profits',
  '3-2-1-using-pr-for-lift-off-and-lift',
  'ask-and-ye-shall-receive-get-a-response',
  'dont-just-say-it-prove-it',
  'three-strikes-youre-out-three-overused-taglines-to-avoid-at-all-costs',
  'clarity-create-an-unforgettable-brand',
  'differentiate-for-higher-profits-create-a-monopoly-and-raise-your-prices',
].map(post);

const to = (from, dest) => ({ from, to: dest, status: 301 });

export const REDIRECTS = [
  to('/contact/', '/contact-ruckus-creative/'),
  to('/category/news/', '/knowledge/'),
  to('/category/knowledge/', '/knowledge/'),
  // 8 Salient demo posts, all dated 2011
  to('/you-think-water-moves-fast/', '/knowledge/'),
  to('/airspeed-velocity-of-a-swallow/', '/knowledge/'),
  to('/when-do-spiders-sleep/', '/knowledge/'),
  to('/youre-the-expert-now/', '/knowledge/'),
  to('/a-matter-of-deductive-logic/', '/knowledge/'),
  to('/mauris-imperdiet-eros/', '/knowledge/'),
  to('/aliquam-at-dui-velit/', '/knowledge/'),
  to('/ut-placerat-egestas/', '/knowledge/'),
];

export function allEntries() {
  return [...PAGES, ...WORK, ...KNOWLEDGE];
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/inventory.test.mjs
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/inventory.mjs tests/inventory.test.mjs
git commit -m "feat: add URL inventory with 39 entries and 11 redirects"
```

---

## Task 4: Capture test fixtures from the live site

The HTML cleaner must be tested against *real* Salient output, not invented markup. Capture fixtures once so tests stay offline and deterministic.

**Files:**
- Create: `tests/fixtures/*.html`, `tests/fixtures/*.json`

- [ ] **Step 1: Capture a rendered WPBakery page and a REST response**

```bash
mkdir -p tests/fixtures
curl -sL --compressed "https://ruckuscreative.com/strategic-creative-capabilities/" -o tests/fixtures/capabilities.rendered.html
curl -sL --compressed "https://ruckuscreative.com/about/" -o tests/fixtures/about.rendered.html
curl -sL "https://ruckuscreative.com/wp-json/wp/v2/pages?slug=about" -o tests/fixtures/about.rest.json
curl -sL "https://ruckuscreative.com/wp-json/wp/v2/pages?slug=strategic-creative-capabilities" -o tests/fixtures/capabilities.rest.json
curl -sL "https://ruckuscreative.com/wp-json/wp/v2/posts?slug=advertising-is-for-profits" -o tests/fixtures/post.rest.json
```

- [ ] **Step 2: Confirm the fixtures show the two extraction paths**

```bash
node -e "const d=require('./tests/fixtures/capabilities.rest.json'); console.log('capabilities has vc_ shortcodes:', d[0].content.rendered.includes('[vc_'))"
node -e "const d=require('./tests/fixtures/about.rest.json'); console.log('about has vc_ shortcodes:', d[0].content.rendered.includes('[vc_'))"
```

Expected: `capabilities` prints `true`, `about` prints `false`. This is the exact condition the client branches on. If both print `false`, the REST path is usable everywhere and Task 5's DOM fallback still gets built but sees less use — note it and continue.

- [ ] **Step 3: Commit the fixtures**

```bash
git add tests/fixtures
git commit -m "test: capture live WordPress fixtures for migration tests"
```

---

## Task 5: WordPress client

Owns all network access. Chooses REST or rendered DOM per entry.

**Files:**
- Create: `scripts/lib/wp-client.mjs`
- Test: `tests/wp-client.test.mjs`

The module exports two things: `pickSource(restJson)`, a pure function that decides the extraction path, and `fetchEntry(entry)`, which does I/O. Only `pickSource` is unit-tested; `fetchEntry` is exercised by the real migration run in Task 9.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/wp-client.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickSource, REST_TYPE } from '../scripts/lib/wp-client.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));

describe('pickSource', () => {
  it('uses rest when content has no shortcodes', () => {
    expect(pickSource(read('about.rest.json'))).toBe('rest');
  });

  it('falls back to dom when content contains vc_ shortcodes', () => {
    expect(pickSource(read('capabilities.rest.json'))).toBe('dom');
  });

  it('falls back to dom when the rest response is empty', () => {
    expect(pickSource([])).toBe('dom');
    expect(pickSource(null)).toBe('dom');
  });
});

describe('REST_TYPE', () => {
  it('maps collection types to wp rest endpoints', () => {
    expect(REST_TYPE.page).toBe('pages');
    expect(REST_TYPE.knowledge).toBe('posts');
    expect(REST_TYPE.work).toBe('portfolio');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/wp-client.test.mjs
```

Expected: FAIL — cannot resolve `../scripts/lib/wp-client.mjs`.

- [ ] **Step 3: Write the module**

```javascript
// scripts/lib/wp-client.mjs
import { load } from 'cheerio';
import { ORIGIN } from './inventory.mjs';

export const REST_TYPE = { page: 'pages', knowledge: 'posts', work: 'portfolio' };

/** Decide whether REST content is usable, or whether we must scrape the rendered page. */
export function pickSource(restJson) {
  if (!Array.isArray(restJson) || restJson.length === 0) return 'dom';
  const html = restJson[0]?.content?.rendered ?? '';
  if (html.trim() === '') return 'dom';
  if (html.includes('[vc_')) return 'dom';   // WPBakery shortcodes are not rendered by REST
  return 'rest';
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ruckus-migration/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

/** Pull Rank Math / Open Graph metadata out of a rendered page's <head>. */
export function extractSeo(renderedHtml) {
  const $ = load(renderedHtml);
  const meta = (sel, attr = 'content') => $(sel).attr(attr) ?? null;
  return {
    title: $('head > title').text().trim() || null,
    description: meta('meta[name="description"]'),
    canonical: meta('link[rel="canonical"]', 'href'),
    ogImage: meta('meta[property="og:image"]'),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
  };
}

/**
 * Fetch one inventory entry.
 * Always fetches the rendered page (SEO metadata only lives there),
 * and additionally uses REST content when it is clean.
 * @returns {Promise<{entry: object, title: string, date: string|null, modified: string|null,
 *                    html: string, source: 'rest'|'dom', seo: object}>}
 */
export async function fetchEntry(entry) {
  const rendered = await getText(entry.url);
  const seo = extractSeo(rendered);

  let restJson = null;
  try {
    const type = REST_TYPE[entry.type];
    const slug = entry.slug === 'home' ? '' : entry.slug;
    if (slug) {
      const raw = await getText(`${ORIGIN}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}`);
      restJson = JSON.parse(raw);
    }
  } catch {
    restJson = null;   // REST unavailable for this type; DOM path handles it
  }

  const source = pickSource(restJson);
  const rec = Array.isArray(restJson) ? restJson[0] : null;

  const html = source === 'rest'
    ? rec.content.rendered
    : extractMainContent(rendered);

  return {
    entry,
    title: rec?.title?.rendered ?? seo.ogTitle ?? seo.title ?? entry.slug,
    date: rec?.date ?? null,
    modified: rec?.modified ?? null,
    html,
    source,
    seo,
  };
}

/** Pull the main content region out of a fully rendered Salient page. */
export function extractMainContent(renderedHtml) {
  const $ = load(renderedHtml);
  $('script, style, noscript, #header-outer, #footer-outer, #slide-out-widget-area').remove();
  const candidates = ['#ajax-content-wrap .container-wrap', '.main-content', '#content', 'main'];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.html()?.trim()) return el.html();
  }
  return $('body').html() ?? '';
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/wp-client.test.mjs
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/wp-client.mjs tests/wp-client.test.mjs
git commit -m "feat: add WordPress client with REST/DOM source selection"
```

---

## Task 6: HTML cleaner

A pure function: messy Salient/WPBakery HTML in, semantic HTML plus a list of image URLs out. This is the module that carries the most risk, so it gets the most tests.

**Files:**
- Create: `scripts/lib/html-to-content.mjs`
- Test: `tests/html-to-content.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/html-to-content.test.mjs
import { describe, it, expect } from 'vitest';
import { cleanHtml, stripShortcodes } from '../scripts/lib/html-to-content.mjs';

describe('stripShortcodes', () => {
  it('removes wpbakery shortcodes but keeps inner text', () => {
    const input = '[vc_row][vc_column][vc_column_text]Hello world[/vc_column_text][/vc_column][/vc_row]';
    expect(stripShortcodes(input).trim()).toBe('Hello world');
  });

  it('removes shortcodes carrying attributes', () => {
    const input = '[vc_row type="in_container" text_align="left"]Keep me[/vc_row]';
    expect(stripShortcodes(input).trim()).toBe('Keep me');
  });
});

describe('cleanHtml', () => {
  it('drops salient wrapper divs but keeps semantic content', () => {
    const input = `<div class="vc_row wpb_row"><div class="wpb_column vc_column_container">
      <div class="wpb_wrapper"><h2>Our Process</h2><p>Some copy.</p></div></div></div>`;
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('<h2>Our Process</h2>');
    expect(html).toContain('<p>Some copy.</p>');
    expect(html).not.toContain('wpb_row');
    expect(html).not.toContain('vc_column_container');
  });

  it('strips inline style and data attributes', () => {
    const input = '<p style="color:#d93" data-animation="fade" class="wpb_text">Copy</p>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).not.toContain('style=');
    expect(html).not.toContain('data-animation');
  });

  it('collects image urls and rewrites them to local asset paths', () => {
    const input = '<img src="https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg" alt="Boxer">';
    const { html, images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual(['https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg']);
    expect(html).toContain('src="@assets/media/boxer.jpg"');
    expect(html).toContain('alt="Boxer"');
  });

  it('prefers the largest srcset candidate as the image source', () => {
    const input = `<img src="https://ruckuscreative.com/wp-content/uploads/a-300x200.jpg"
      srcset="https://ruckuscreative.com/wp-content/uploads/a-300x200.jpg 300w,
              https://ruckuscreative.com/wp-content/uploads/a-1200x800.jpg 1200w" alt="A">`;
    const { images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual(['https://ruckuscreative.com/wp-content/uploads/a-1200x800.jpg']);
  });

  it('rewrites internal absolute links to root-relative paths', () => {
    const input = '<a href="https://ruckuscreative.com/about/">About</a><a href="https://example.com/x">Ext</a>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('href="/about/"');
    expect(html).toContain('href="https://example.com/x"');
  });

  it('removes empty leftover elements', () => {
    const input = '<div class="wpb_wrapper"><div></div><p>  </p><p>Real</p></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('<p>Real</p>');
    expect(html.match(/<p>\s*<\/p>/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/html-to-content.test.mjs
```

Expected: FAIL — cannot resolve `../scripts/lib/html-to-content.mjs`.

- [ ] **Step 3: Write the module**

```javascript
// scripts/lib/html-to-content.mjs
import { load } from 'cheerio';
import { basename } from 'node:path';

/** Remove WPBakery shortcodes, keeping any text between them. */
export function stripShortcodes(text) {
  return text.replace(/\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi, '');
}

// Wrapper classes that carry no meaning once the page builder is gone.
const JUNK_CLASS = /^(vc_|wpb_|nectar-|nectar_|span_|col |column_|full-width|inner-wrap|row-bg)/;

const KEEP_ATTR = new Set(['href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan']);

/** Pick the highest-resolution candidate from a srcset. */
function largestFromSrcset(srcset) {
  const best = srcset.split(',')
    .map(part => part.trim().split(/\s+/))
    .filter(p => p[0])
    .map(([url, dim]) => ({ url, w: parseInt(dim ?? '0', 10) || 0 }))
    .sort((a, b) => b.w - a.w)[0];
  return best?.url ?? null;
}

/**
 * @param {string} rawHtml
 * @param {{baseUrl: string}} opts
 * @returns {{html: string, images: string[]}}
 */
export function cleanHtml(rawHtml, { baseUrl }) {
  const $ = load(stripShortcodes(rawHtml), null, false);
  const images = [];

  $('script, style, noscript, iframe[src*="gravity"], .gform_wrapper').remove();

  // Resolve images to their largest source, record them, point at local assets.
  $('img').each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr('srcset');
    const chosen = (srcset && largestFromSrcset(srcset)) || $el.attr('src');
    if (!chosen) { $el.remove(); return; }
    const abs = new URL(chosen, baseUrl).href;
    if (!images.includes(abs)) images.push(abs);
    $el.attr('src', `@assets/media/${basename(new URL(abs).pathname)}`);
    $el.removeAttr('srcset').removeAttr('sizes').removeAttr('loading');
  });

  // Internal absolute links become root-relative; external links are left alone.
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    try {
      const u = new URL(href, baseUrl);
      if (u.origin === new URL(baseUrl).origin) $(el).attr('href', u.pathname + u.search + u.hash);
    } catch { /* mailto:, tel:, and fragments are left untouched */ }
  });

  // Drop presentational attributes everywhere.
  $('*').each((_, el) => {
    if (!el.attribs) return;
    for (const name of Object.keys(el.attribs)) {
      if (KEEP_ATTR.has(name)) continue;
      if (name === 'class') {
        const kept = (el.attribs.class || '').split(/\s+/).filter(c => c && !JUNK_CLASS.test(c));
        if (kept.length) el.attribs.class = kept.join(' ');
        else delete el.attribs.class;
        continue;
      }
      delete el.attribs[name];
    }
  });

  // Unwrap divs that now hold nothing but a single child.
  let changed = true;
  while (changed) {
    changed = false;
    $('div').each((_, el) => {
      const $el = $(el);
      if (!$el.attr('class') && $el.children().length === 1 && !$el.text().trim().startsWith('<')) {
        $el.replaceWith($el.children());
        changed = true;
      }
    });
  }

  // Remove elements left empty by the cleanup.
  $('div, p, span, section').each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && $el.find('img, br, hr').length === 0) $el.remove();
  });

  const html = $.html().replace(/\n{3,}/g, '\n\n').trim();
  return { html, images };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/html-to-content.test.mjs
```

Expected: PASS, 8 tests. If the unwrap loop or the empty-element pass breaks a specific case, fix the module rather than loosening the test — these assertions describe the output quality we need.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/html-to-content.mjs tests/html-to-content.test.mjs
git commit -m "feat: add HTML cleaner stripping WPBakery and Salient markup"
```

> **Note for Plan 2:** image `src` values are written as the sentinel path `@assets/media/<filename>`. This is deliberately *not* a working Astro import — it is a consistent, greppable marker. Plan 2 replaces these with real `<Picture>` components wired to the asset pipeline. Do not try to make `@assets` resolve as a tsconfig alias; MDX would then emit plain `<img>` tags and skip image optimization entirely, losing the AVIF/WebP and `srcset` work the spec requires.

---

## Task 7: Media downloader

**Files:**
- Create: `scripts/lib/media.mjs`
- Test: `tests/media.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/media.test.mjs
import { describe, it, expect } from 'vitest';
import { localNameFor, dedupe } from '../scripts/lib/media.mjs';

describe('localNameFor', () => {
  it('uses the wordpress filename', () => {
    expect(localNameFor('https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg'))
      .toBe('boxer.jpg');
  });

  it('disambiguates identical filenames from different upload months', () => {
    const a = localNameFor('https://x.com/wp-content/uploads/2019/08/logo.png');
    const b = localNameFor('https://x.com/wp-content/uploads/2020/03/logo.png');
    expect(a).not.toBe(b);
  });

  it('strips query strings', () => {
    expect(localNameFor('https://x.com/uploads/a.jpg?ver=123')).toBe('a.jpg');
  });
});

describe('dedupe', () => {
  it('removes duplicate urls preserving order', () => {
    expect(dedupe(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/media.test.mjs
```

Expected: FAIL — cannot resolve `../scripts/lib/media.mjs`.

- [ ] **Step 3: Write the module**

```javascript
// scripts/lib/media.mjs
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';

const seenNames = new Map();   // filename -> source url that claimed it

export function dedupe(urls) {
  return [...new Set(urls)];
}

/**
 * Local filename for a remote image. Collisions across upload months get a
 * month prefix so that 2019/08/logo.png and 2020/03/logo.png stay distinct.
 */
export function localNameFor(url) {
  const path = new URL(url).pathname;
  const name = basename(path);
  const claimed = seenNames.get(name);
  if (!claimed || claimed === url) { seenNames.set(name, url); return name; }
  const m = path.match(/\/(\d{4})\/(\d{2})\//);
  return m ? `${m[1]}${m[2]}-${name}` : `${Buffer.from(dirname(path)).toString('hex').slice(0, 6)}-${name}`;
}

/**
 * Download every url into destDir, skipping files already present.
 * @returns {Promise<Map<string,string>>} url -> local filename
 */
export async function downloadMedia(urls, destDir) {
  await mkdir(destDir, { recursive: true });
  const map = new Map();
  for (const url of dedupe(urls)) {
    const name = localNameFor(url);
    const dest = join(destDir, name);
    map.set(url, name);
    try { await access(dest); continue; } catch { /* not cached yet */ }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ruckus-migration/1.0' } });
      if (!res.ok) { console.warn(`  ! ${res.status} ${url}`); continue; }
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`  ↓ ${name}`);
    } catch (err) {
      console.warn(`  ! failed ${url}: ${err.message}`);
    }
  }
  return map;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/media.test.mjs
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/media.mjs tests/media.test.mjs
git commit -m "feat: add media downloader with filename collision handling"
```

---

## Task 8: Content collection schemas

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Write the config**

```typescript
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seo = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  canonical: z.string().nullable(),
  ogImage: z.string().nullable(),
});

const base = {
  title: z.string(),
  path: z.string().regex(/^\/.*\/$|^\/$/, 'path must start and end with a slash'),
  seo,
  source: z.enum(['rest', 'dom']),
};

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.mdx' }),
  schema: z.object({ ...base }),
});

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.mdx' }),
  schema: z.object({ ...base, client: z.string().nullable().default(null) }),
});

const knowledge = defineCollection({
  loader: glob({ base: './src/content/knowledge', pattern: '**/*.mdx' }),
  schema: z.object({ ...base, pubDate: z.coerce.date(), updatedDate: z.coerce.date().optional() }),
});

export const collections = { pages, work, knowledge };
```

- [ ] **Step 2: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: define content collection schemas"
```

---

## Task 9: Migration orchestrator

**Files:**
- Create: `scripts/migrate.mjs`

- [ ] **Step 1: Write the orchestrator**

```javascript
// scripts/migrate.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { allEntries, ORIGIN } from './lib/inventory.mjs';
import { fetchEntry } from './lib/wp-client.mjs';
import { cleanHtml } from './lib/html-to-content.mjs';
import { downloadMedia, localNameFor } from './lib/media.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, 'src/content');
const MEDIA_DIR = join(ROOT, 'src/assets/media');
const DIR_FOR = { page: 'pages', work: 'work', knowledge: 'knowledge' };

const yaml = (v) => (v === null || v === undefined ? 'null' : JSON.stringify(String(v)));

function frontmatter(rec) {
  const lines = [
    '---',
    `title: ${yaml(rec.title)}`,
    `path: ${yaml(rec.entry.path)}`,
    `source: ${yaml(rec.source)}`,
    'seo:',
    `  title: ${yaml(rec.seo.title)}`,
    `  description: ${yaml(rec.seo.description)}`,
    `  canonical: ${yaml(rec.seo.canonical)}`,
    `  ogImage: ${yaml(rec.seo.ogImage)}`,
  ];
  if (rec.entry.type === 'knowledge') {
    // The schema requires pubDate. If REST gave us no date (DOM fallback path),
    // fail here with a clear message rather than emitting `null` and letting
    // Zod report a confusing coercion error later.
    if (!rec.date) {
      throw new Error(`no publication date for knowledge post "${rec.entry.slug}" ` +
        `(source: ${rec.source}) — REST returned no record, so pubDate cannot be set`);
    }
    lines.push(`pubDate: ${yaml(rec.date)}`);
    if (rec.modified) lines.push(`updatedDate: ${yaml(rec.modified)}`);
  }
  if (rec.entry.type === 'work') lines.push('client: null');
  lines.push('---', '');
  return lines.join('\n');
}

const failures = [];
const allImages = [];

console.log(`Migrating ${allEntries().length} entries from ${ORIGIN}\n`);

for (const entry of allEntries()) {
  try {
    process.stdout.write(`${entry.path} ... `);
    const rec = await fetchEntry(entry);
    // nameFor MUST be localNameFor so the sentinel paths written into the MDX
    // match the filenames downloadMedia writes to disk. Without it, two images
    // sharing a basename produce a reference to a file that never gets written.
    const { html, images } = cleanHtml(rec.html, { baseUrl: ORIGIN, nameFor: localNameFor });
    allImages.push(...images);

    const dir = join(CONTENT_DIR, DIR_FOR[entry.type]);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${entry.slug}.mdx`), frontmatter(rec) + html + '\n', 'utf8');

    console.log(`ok (${rec.source}, ${images.length} images, ${html.length}b)`);
  } catch (err) {
    console.log(`FAILED — ${err.message}`);
    failures.push({ path: entry.path, error: err.message });
  }
}

console.log(`\nDownloading ${new Set(allImages).size} unique images...`);
await downloadMedia(allImages, MEDIA_DIR);

console.log(`\n${allEntries().length - failures.length}/${allEntries().length} entries migrated.`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.path}: ${f.error}`);
  process.exitCode = 1;
}
```

- [ ] **Step 2: Run the full test suite before running the migration**

```bash
npx vitest run
```

Expected: PASS, all 23 tests across 4 files.

- [ ] **Step 3: Run the migration**

```bash
node scripts/migrate.mjs
```

Expected: 39 lines of `ok`, then image downloads, then `39/39 entries migrated.`

If any entry fails, do not proceed — read the error and fix the responsible module. Portfolio items are the most likely failure, because the `portfolio` REST endpoint may not be publicly exposed; if it 404s, `pickSource` returns `dom` and the rendered path handles it. Confirm that fallback actually produced content rather than an empty body.

- [ ] **Step 4: Verify the output**

```bash
ls src/content/pages src/content/work src/content/knowledge | wc -l
find src/content -name '*.mdx' | wc -l          # expect 39
ls src/assets/media | wc -l                      # expect > 0
grep -rl 'vc_row\|wpb_' src/content || echo "no wpbakery markup remaining"
grep -rl 'https://ruckuscreative.com' src/content || echo "no absolute internal urls remaining"
```

Expected: 39 MDX files, a populated media directory, and both `grep` checks reporting nothing remaining.

**Also check image yield per type.** Verified during Task 6: the About and Capabilities pages legitimately contain **zero** content images — every uploads URL on those pages is chrome (favicons, header/footer logos). So a zero image count on a text page is correct, not a bug. The portfolio items are where imagery actually lives, so check those specifically:

```bash
grep -c '@assets/media/' src/content/work/*.mdx | sort -t: -k2 -n | head
```

Any `/work/` entry reporting **0** images is a genuine extraction failure and must be investigated — a portfolio case study with no imagery is wrong on its face.

> **Gap for Plan 2 — site chrome images.** The header logo (`ruckus_logo_dark.png`, `ruckus_logo_light.png`), footer logo (`footer-logo.jpg`), and favicon set (`cropped-FAVICON-*.png`) appear in no page's *content* and are therefore not captured by this migration. Plan 2 must download them explicitly when building the Header and Footer components. Source paths are under `https://ruckuscreative.com/wp-content/uploads/`.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate.mjs src/content src/assets
git commit -m "feat: migrate 39 pages and media from WordPress"
```

---

## Task 10: Validate the migrated content against the schemas

Content that parses is not content that is correct. This task proves the schemas accept the real output.

**Files:**
- Create: `tests/content.test.mjs`

- [ ] **Step 1: Write the test**

```javascript
// tests/content.test.mjs
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, WORK, KNOWLEDGE } from '../scripts/lib/inventory.mjs';

const root = new URL('../src/content/', import.meta.url).pathname;
const read = (d, f) => readFileSync(join(root, d, f), 'utf8');
const list = (d) => readdirSync(join(root, d)).filter(f => f.endsWith('.mdx'));

describe('migrated content', () => {
  it('produced one file per inventory entry', () => {
    expect(list('pages')).toHaveLength(PAGES.length);
    expect(list('work')).toHaveLength(WORK.length);
    expect(list('knowledge')).toHaveLength(KNOWLEDGE.length);
  });

  it('gives every file frontmatter with a title and path', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const src = read(dir, f);
        expect(src.startsWith('---\n'), `${dir}/${f} missing frontmatter`).toBe(true);
        expect(src).toMatch(/\ntitle: ".+"/);
        expect(src).toMatch(/\npath: "\/.*"/);
      }
    }
  });

  it('leaves no wordpress or page-builder residue', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = read(dir, f).split('\n---\n')[1] ?? '';
        expect(body, `${dir}/${f}`).not.toMatch(/\[vc_/);
        expect(body, `${dir}/${f}`).not.toMatch(/wpb_|vc_row|nectar-/);
        expect(body, `${dir}/${f}`).not.toMatch(/https:\/\/ruckuscreative\.com/);
      }
    }
  });

  it('produces non-trivial body content for every entry', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = (read(dir, f).split('\n---\n')[1] ?? '').trim();
        expect(body.length, `${dir}/${f} body too short`).toBeGreaterThan(100);
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run tests/content.test.mjs
```

Expected: PASS, 4 tests.

A failure here is **information, not an obstacle** — it means a page extracted badly. The "body too short" assertion in particular is the tripwire for WPBakery pages that produced an empty shell. Fix the extraction or hand-finish that file, then re-run.

- [ ] **Step 3: Verify Astro accepts the collections**

```bash
npx astro sync && npx astro check
```

Expected: `astro sync` generates types with no schema errors. `astro check` may report zero errors since no routes exist yet.

- [ ] **Step 4: Commit**

```bash
git add tests/content.test.mjs
git commit -m "test: validate migrated content structure and cleanliness"
```

---

## Task 11: Hand-finish the WPBakery pages

The spec anticipates this. The automated pass gets structure; a human pass gets fidelity.

**Files:**
- Modify: whichever files Task 10 flagged, most likely
  `src/content/pages/strategic-creative-capabilities.mdx`,
  `src/content/pages/process-ruckus-creative.mdx`,
  `src/content/pages/results-based-advertising-branding.mdx`

- [ ] **Step 1: Identify which pages need work**

```bash
grep -l 'source: "dom"' src/content/pages/*.mdx
for f in src/content/pages/*.mdx; do echo "$(wc -c < "$f") $f"; done | sort -n | head
```

The smallest files are the likeliest to have lost content in extraction.

- [ ] **Step 2: Compare each flagged page against the live original**

For each flagged file, open the live URL and read the migrated body side by side. Check that every heading, paragraph, list, and image present on the live page is present in the MDX. Add anything missing by hand.

Fidelity bar per the spec: **close, not pixel-perfect**. Content completeness is required; exact spacing is not.

- [ ] **Step 3: Re-run the content tests**

```bash
npx vitest run tests/content.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "content: hand-finish page-builder pages after automated extraction"
```

---

## Task 12: Record the redirect map for Plan 2

`REDIRECTS` already exists in `inventory.mjs`; this emits it in the form Plan 2 will consume.

**Files:**
- Create: `scripts/emit-redirects.mjs`, `src/redirects.json`
- Test: `tests/redirects.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/redirects.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { REDIRECTS } from '../scripts/lib/inventory.mjs';

const emitted = JSON.parse(
  readFileSync(new URL('../src/redirects.json', import.meta.url), 'utf8')
);

describe('emitted redirects', () => {
  it('matches the inventory exactly', () => {
    expect(emitted).toHaveLength(REDIRECTS.length);
    for (const r of REDIRECTS) {
      expect(emitted).toContainEqual({ from: r.from, to: r.to, status: 301 });
    }
  });

  it('never points a redirect at another redirect', () => {
    const sources = new Set(emitted.map(r => r.from));
    for (const r of emitted) expect(sources.has(r.to)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/redirects.test.mjs
```

Expected: FAIL — `src/redirects.json` does not exist.

- [ ] **Step 3: Write the emitter and run it**

```javascript
// scripts/emit-redirects.mjs
import { writeFile } from 'node:fs/promises';
import { REDIRECTS } from './lib/inventory.mjs';

const out = new URL('../src/redirects.json', import.meta.url);
await writeFile(out, JSON.stringify(REDIRECTS, null, 2) + '\n', 'utf8');
console.log(`Wrote ${REDIRECTS.length} redirects.`);
```

```bash
node scripts/emit-redirects.mjs
```

Expected: `Wrote 11 redirects.`

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/redirects.test.mjs
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
npx vitest run
git add scripts/emit-redirects.mjs src/redirects.json tests/redirects.test.mjs
git commit -m "feat: emit redirect map for route generation"
```

Expected: all tests pass across 6 files.

---

## Definition of done

- [ ] `npx vitest run` — all tests pass
- [ ] `npx astro sync && npx astro check` — no schema errors
- [ ] 39 MDX files exist across the three collections
- [ ] `src/assets/media/` is populated
- [ ] No `[vc_`, `wpb_`, `vc_row`, `nectar-`, or absolute `ruckuscreative.com` URLs remain in content bodies
- [ ] `src/redirects.json` contains 11 entries
- [ ] Cloudflare credential blocker reported to the user

**Then proceed to Plan 2: Site Build.**
