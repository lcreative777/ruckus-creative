# Ruckus Astro Rebuild — Plan 2: Site Build

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 39 migrated content files into a complete, rendering site — design tokens, layout, chrome, the six vanilla components, all 39 routes, redirects, and SEO — with no jQuery and under 10 KB of JavaScript.

**Architecture:** Astro renders each collection entry's raw body HTML through a single `RichText` component that resolves the `@assets/media/` sentinels left by Plan 1 into optimized `<picture>` markup at build time. Design tokens live as CSS custom properties in one file. Every interactive behaviour is a small vanilla island loaded only on the pages that need it.

**Tech Stack:** Astro 7.2, `@astrojs/cloudflare` 14.2 (`imageService: 'compile'`), `@astrojs/sitemap`, `@fontsource/*`, Vitest.

> **Content is `.md`, not `.mdx`.** MDX parses embedded HTML as JSX and rejects unclosed void elements, and WordPress emits `<br>` and `<img>` unclosed — so any build touching the collections failed with `mdx-jsx:unexpected-character`. Nothing renders the markdown anyway (`RichText` consumes `entry.body` as a raw string), so `.md` removes the constraint at zero cost. `@astrojs/mdx` was dropped from the integrations.

**Spec:** `docs/superpowers/specs/2026-08-13-ruckus-astro-rebuild-design.md`
**Decisions:** `docs/superpowers/plans/2026-08-13-open-decisions.md`
**Prior plan:** `docs/superpowers/plans/2026-08-13-foundation-and-migration.md` (complete)

**This is Plan 2 of 3.** Plan 3 covers the contact form, deployment, and verification.

**Working directory:** `/Users/ericslarson/Sites/p-r/RuckusCreative/ruckus-astro`
**Branch:** create `feat/site-build` off `feat/foundation-and-migration`.

---

## Design facts extracted from the live site

Do not re-derive these; they were measured on 2026-08-14.

| Token | Value |
|---|---|
| Body font | `"Open Sans", Helvetica, sans-serif`, weights 300/400/600/700 |
| Display fonts | Lato 900, Raleway |
| Body text | `#676767` |
| Page background | `#ffffff` |
| Accent | `#dd9933` (written `#d93` throughout Salient's CSS) |
| Secondary accent | `#f6653c` |
| h1 | 54px / 62px line-height |
| h2 | 34px / 44px line-height |

**Main navigation is entirely homepage anchors**, not links to the standalone pages:
`/#home`, `/#intro`, `/#work`, `/#about`, `/#services`, `/#contact`, plus a slide-out "Menu" toggle. Note `/about/` (a real page) and `/#about` (a homepage section) are different destinations — the nav points at the anchor. Preserve this.

**Homepage sections in order:** `#home` (YouTube background video hero), `#intro`, `#work` (portfolio grid), `#about` (Brand Alignment Process™, then "Why Us?"), `#services`, `#contact`.

**Chrome assets** (not captured by Plan 1's migration — they appear in no page's content):
`ruckus_logo_dark.png`, `ruckus_logo_light.png`, `footer-logo.jpg`,
`cropped-FAVICON-32x32.png`, `cropped-FAVICON-180x180.png`, `cropped-FAVICON-192x192.png`, `cropped-FAVICON-270x270.png`
All under `https://ruckuscreative.com/wp-content/uploads/`.

**Footer:** `© <year> Ruckus Creative.` + `Privacy Policy | Terms and Conditions`. The slide-out panel carries the contact block: email, `714.514.1482`, and the address.

> **Address:** every rendering of the address must be `27525 Puerta Real, Suite 300-173, Mission Viejo, CA 92691`. The live footer says `Suite 300-1733`, which is wrong. Never copy the address out of the live site again — take it from `src/data/site.ts` (Task 2).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/site.ts` | Business identity: name, address, phone, email, nav, social. Single source of truth. |
| `src/styles/tokens.css` | Design tokens as custom properties. Colors, type scale, spacing. |
| `src/styles/base.css` | Reset, element defaults, prose styles for migrated HTML. |
| `src/components/RichText.astro` | Renders a collection body, resolving image sentinels to `<picture>`. **The core of this plan.** |
| `src/lib/images.ts` | Sentinel → `ImageMetadata` resolution, shared by RichText and components. |
| `src/components/Seo.astro` | Title, meta, canonical, OG/Twitter, JSON-LD. |
| `src/components/Header.astro` | Sticky header, anchor nav, `<details>` slide-out. |
| `src/components/Footer.astro` | Copyright, legal links, contact block. |
| `src/components/HeroVideo.astro` | Poster-first YouTube facade. |
| `src/components/PortfolioGrid.astro` | Work grid with category filter. |
| *(no testimonial component)* | Testimonials arrive as `<blockquote>` inside the home body; styled in `base.css`. See Task 9. |
| `src/layouts/Base.astro` | html/head/body shell. |
| `src/pages/index.astro` | Homepage. |
| `src/pages/[...slug].astro` | The 9 non-home pages **and** all 9 knowledge posts (posts are root-level URLs). |
| `src/pages/work/[slug].astro` | 20 portfolio detail pages. |
| `src/pages/portfolio-ruckus.astro` | Rebuilt 20-item index (overrides the catch-all). |
| `src/pages/404.astro` | Not-found page. |
| `src/middleware.ts` | 301 redirects from `src/redirects.json`. |
| `public/robots.txt` | Crawl rules, without the WordPress restrictions. |

---

## Task 1: Branch and chrome assets

**Files:** Create `scripts/fetch-chrome.mjs`; adds files under `src/assets/chrome/`

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/site-build
```

- [ ] **Step 2: Write the fetcher**

```javascript
// scripts/fetch-chrome.mjs
// Logos and favicons live in no page's content, so the Plan 1 migration never
// saw them. Fetch them explicitly.
import { downloadMedia } from './lib/media.mjs';

const BASE = 'https://ruckuscreative.com/wp-content/uploads';
// Verified 2026-08-14 against the live homepage: these sit at the uploads root,
// not under a year/month folder like the content media does.
const FILES = [
  'ruckus_logo_dark.png',
  'ruckus_logo_light.png',
  'footer-logo.jpg',
  'cropped-FAVICON-32x32.png',
  'cropped-FAVICON-180x180.png',
  'cropped-FAVICON-192x192.png',
  'cropped-FAVICON-270x270.png',
];

const dest = new URL('../src/assets/chrome/', import.meta.url).pathname;
const urls = FILES.map(f => `${BASE}/${f}`);
const map = await downloadMedia(urls, dest);
console.log(`\n${map.size} chrome assets in src/assets/chrome/`);
```

- [ ] **Step 3: Run it**

```bash
node scripts/fetch-chrome.mjs
ls -la src/assets/chrome/
```

**Do not proceed until all 7 files are present and non-zero.** If any 404s, `downloadMedia` logs `! 404 <url>` and continues rather than failing, so check the directory listing rather than trusting the exit code.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-chrome.mjs src/assets/chrome
git commit -m "feat: fetch logo and favicon assets"
```

---

## Task 2: Site data

**Files:** Create `src/data/site.ts`; Test: `tests/site-data.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/site-data.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8');

describe('site data', () => {
  it('carries the client-confirmed address and no stale variant', () => {
    expect(src).toContain('Suite 300-173');
    expect(src).not.toContain('Suite 300-1733');
    expect(src).not.toContain('Suite 100-173');
  });

  it('lists the six anchor nav items in order', () => {
    const order = ['#home', '#intro', '#work', '#about', '#services', '#contact'];
    let last = -1;
    for (const a of order) {
      const i = src.indexOf(`/${a}`);
      expect(i, `${a} missing from nav`).toBeGreaterThan(-1);
      expect(i, `${a} out of order`).toBeGreaterThan(last);
      last = i;
    }
  });

  it('uses the confirmed phone number', () => {
    expect(src).toContain('714.514.1482');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** (`npx vitest run tests/site-data.test.mjs`) — cannot resolve `src/data/site.ts`.

- [ ] **Step 3: Write it**

```typescript
// src/data/site.ts
// Single source of truth for business identity. The live WordPress site renders
// three different suite numbers; 300-173 is the client-confirmed correct one
// (2026-08-14). Never copy this data from the live site.

export const site = {
  name: 'Ruckus Creative',
  legalName: 'Ruckus Creative, LLC',
  url: 'https://ruckuscreative.com',
  description: 'Business results through strategic creative. A full-service creative agency that creates results.',
  email: 'info@ruckuscreative.com',
  phone: '714.514.1482',
  phoneE164: '+17145141482',
  address: {
    street: '27525 Puerta Real, Suite 300-173',
    city: 'Mission Viejo',
    region: 'CA',
    postalCode: '92691',
    country: 'US',
  },
  founded: '1993',   // "In business for over 25 years", per the About page
} as const;

/** Main navigation. Every item targets a homepage section, not a standalone page. */
export const nav = [
  { label: 'Home', href: '/#home' },
  { label: 'Intro', href: '/#intro' },
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
] as const;

/** Footer legal links. */
export const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Terms and Conditions', href: '/terms-and-conditions/' },
] as const;
```

- [ ] **Step 4:** Run the test → PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/site.ts tests/site-data.test.mjs
git commit -m "feat: add site identity data with confirmed address"
```

---

## Task 3: Design tokens and base styles

**Files:** Create `src/styles/tokens.css`, `src/styles/base.css`

- [ ] **Step 1: Install self-hosted fonts**

```bash
npm install @fontsource/open-sans @fontsource/lato @fontsource/raleway
```

These ship WOFF2 locally, which replaces the current site's two blocking Google Fonts requests. No manual subsetting needed.

- [ ] **Step 2: Write tokens.css**

```css
/* src/styles/tokens.css — values measured from the live site 2026-08-14 */
:root {
  --font-body: "Open Sans", Helvetica, Arial, sans-serif;
  --font-display: "Lato", "Open Sans", Helvetica, sans-serif;
  --font-alt: "Raleway", "Open Sans", Helvetica, sans-serif;

  --color-text: #676767;
  --color-heading: #1f1f1f;
  --color-bg: #ffffff;
  --color-bg-dark: #1a1a1a;
  --color-accent: #dd9933;
  --color-accent-2: #f6653c;
  --color-rule: #e6e4e1;

  /* Live site: h1 54/62, h2 34/44. Fluid below those caps so mobile does not overflow. */
  --step-h1: clamp(2rem, 1.35rem + 2.6vw, 3.375rem);
  --step-h1-lh: 1.15;
  --step-h2: clamp(1.5rem, 1.15rem + 1.4vw, 2.125rem);
  --step-h2-lh: 1.3;
  --step-h3: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --step-body: 1rem;
  --body-lh: 1.7;

  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2.5rem;
  --space-5: 4rem;
  --space-6: 6rem;

  --container: 1100px;
  --container-wide: 1425px;
}
```

- [ ] **Step 3: Write base.css**

```css
/* src/styles/base.css */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--step-body);
  line-height: var(--body-lh);
}
img, picture, video, canvas { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
a:focus-visible, button:focus-visible, summary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  color: var(--color-heading);
  margin: 0 0 var(--space-1);
  text-wrap: balance;
}
h1 { font-size: var(--step-h1); line-height: var(--step-h1-lh); }
h2 { font-size: var(--step-h2); line-height: var(--step-h2-lh); }
h3 { font-size: var(--step-h3); }

.container { width: min(100% - 2rem, var(--container)); margin-inline: auto; }
.container-wide { width: min(100% - 2rem, var(--container-wide)); margin-inline: auto; }
.section { padding-block: var(--space-6); }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Migrated WordPress bodies render inside .prose. They arrive as plain semantic
   HTML — the page-builder classes were stripped in Plan 1 — so style by element. */
.prose > * + * { margin-block-start: var(--space-2); }
.prose p { margin: 0; }
.prose h2 { margin-block-start: var(--space-4); }
.prose h3 { margin-block-start: var(--space-3); }
.prose ul, .prose ol { padding-inline-start: 1.25em; }
.prose a { color: var(--color-accent); text-underline-offset: 0.15em; }
.prose hr { border: 0; border-top: 1px solid var(--color-rule); margin-block: var(--space-4); }
.prose img { margin-block: var(--space-3); }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles package.json package-lock.json
git commit -m "feat: add design tokens and base styles"
```

---

## Task 4: Image resolution library

The pivot point of this plan. Plan 1 wrote every content image as the sentinel
`@assets/media/<filename>` on `src/` and background images as `data-bg="@assets/media/<filename>"`. Those must become real optimized images.

**Files:** Create `src/lib/images.ts`; Test: `tests/images.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/images.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/images.ts', import.meta.url), 'utf8');

describe('image library', () => {
  it('globs the media directory eagerly so lookups are synchronous', () => {
    expect(src).toMatch(/import\.meta\.glob\(/);
    expect(src).toContain('/src/assets/media/');
    expect(src).toContain('eager: true');
  });

  it('exports the sentinel prefix it strips', () => {
    expect(src).toContain('@assets/media/');
    expect(src).toMatch(/export function resolveMedia/);
  });
});
```

- [ ] **Step 2:** Run → FAIL, cannot resolve `src/lib/images.ts`.

- [ ] **Step 3: Write it**

```typescript
// src/lib/images.ts
// Plan 1 wrote image references as the sentinel `@assets/media/<file>` — a
// deliberately non-resolving marker, so that Astro's asset pipeline (and not a
// plain <img>) handles every image. This maps a sentinel back to real
// ImageMetadata that astro:assets can optimize.

export const SENTINEL = '@assets/media/';

const media = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/media/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true },
);

const byFilename = new Map<string, ImageMetadata>(
  Object.entries(media).map(([path, mod]) => [path.split('/').pop()!, mod.default]),
);

/**
 * Resolve a sentinel (or a bare filename) to ImageMetadata.
 * @returns null when no such file was migrated — the caller decides whether
 *   that is fatal. Never guess a substitute image.
 */
export function resolveMedia(ref: string): ImageMetadata | null {
  const filename = ref.startsWith(SENTINEL) ? ref.slice(SENTINEL.length) : ref;
  return byFilename.get(filename) ?? null;
}

/** Every migrated media filename. Used by tests and by the build-time audit. */
export function allMediaFilenames(): string[] {
  return [...byFilename.keys()].sort();
}
```

- [ ] **Step 4:** Run → PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.ts tests/images.test.mjs
git commit -m "feat: add media sentinel resolution"
```

---

## Task 5: RichText component

Renders a migrated body, swapping sentinels for responsive `<picture>` markup and `data-bg` for an optimized CSS custom property.

**Files:** Create `src/components/RichText.astro`

- [ ] **Step 1: Write it**

```astro
---
// src/components/RichText.astro
// Collection bodies are semantic HTML strings (Plan 1 stripped the page-builder
// markup). Rather than mapping MDX components, transform the string at build
// time: every sentinel becomes a real <picture>, every data-bg becomes an
// optimized background URL.
import { getImage } from 'astro:assets';
import { resolveMedia, SENTINEL } from '../lib/images';

interface Props { html: string; class?: string }
const { html, class: className = 'prose' } = Astro.props;

const WIDTHS = [480, 768, 1024, 1440, 1920];

async function pictureFor(src: string, attrs: string): Promise<string> {
  const img = resolveMedia(src);
  if (!img) {
    console.warn(`[RichText] no migrated media for "${src}" — leaving markup untouched`);
    return `<img src="${src}" ${attrs}>`;
  }
  const widths = WIDTHS.filter(w => w <= img.width);
  if (widths.length === 0) widths.push(img.width);

  const alt = /alt="([^"]*)"/.exec(attrs)?.[1] ?? '';
  const [avif, webp, fallback] = await Promise.all([
    getImage({ src: img, formats: ['avif'], widths, format: 'avif' }),
    getImage({ src: img, formats: ['webp'], widths, format: 'webp' }),
    getImage({ src: img, widths, format: 'jpeg' }),
  ]);

  return [
    '<picture>',
    `<source type="image/avif" srcset="${avif.srcSet.attribute}" sizes="(max-width: 900px) 100vw, 900px">`,
    `<source type="image/webp" srcset="${webp.srcSet.attribute}" sizes="(max-width: 900px) 100vw, 900px">`,
    `<img src="${fallback.src}" width="${img.width}" height="${img.height}"`,
    ` alt="${alt}" loading="lazy" decoding="async">`,
    '</picture>',
  ].join('');
}

// <img src="@assets/media/x.jpg" ...> → <picture>
let out = html;
const imgTags = [...out.matchAll(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/g)];
for (const tag of imgTags) {
  const [whole, before, src, after] = tag;
  if (!src.startsWith(SENTINEL)) continue;
  out = out.replace(whole, await pictureFor(src, `${before} ${after}`));
}

// data-bg="@assets/media/x.jpg" → an inline custom property the CSS consumes.
const bgTags = [...out.matchAll(/data-bg="([^"]+)"/g)];
for (const [whole, ref] of bgTags) {
  const img = resolveMedia(ref);
  if (!img) { console.warn(`[RichText] no migrated media for background "${ref}"`); continue; }
  const optimized = await getImage({ src: img, format: 'webp', width: Math.min(img.width, 1920) });
  out = out.replace(whole, `class="has-bg" style="--bg: url('${optimized.src}')"`);
}
---
<div class={className} set:html={out} />

<style is:global>
  .has-bg {
    background-image: var(--bg);
    background-size: cover;
    background-position: center;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RichText.astro
git commit -m "feat: render migrated bodies with optimized images"
```

---

## Task 6: SEO component

**Files:** Create `src/components/Seo.astro`

- [ ] **Step 1: Write it**

```astro
---
// src/components/Seo.astro
import { site } from '../data/site';

interface Props {
  title: string;
  description?: string | null;
  canonical?: string | null;
  ogImage?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  breadcrumbs?: { name: string; url: string }[];
  schema?: Record<string, unknown>;
}
const {
  title, description, canonical, ogImage,
  type = 'website', publishedTime, breadcrumbs, schema,
} = Astro.props;

const url = canonical ?? new URL(Astro.url.pathname, site.url).href;
const desc = description ?? site.description;
const image = ogImage ?? undefined;

// The current site has no structured data at all, so all of this is a net gain.
const organization = {
  '@type': 'LocalBusiness',
  '@id': `${site.url}/#organization`,
  name: site.name,
  legalName: site.legalName,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
};

const graph: Record<string, unknown>[] = [organization];
if (breadcrumbs?.length) {
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({
      '@type': 'ListItem', position: i + 1, name: b.name, item: new URL(b.url, site.url).href,
    })),
  });
}
if (schema) graph.push(schema);
---
<title>{title}</title>
<meta name="description" content={desc} />
<link rel="canonical" href={url} />

<meta property="og:type" content={type} />
<meta property="og:title" content={title} />
<meta property="og:description" content={desc} />
<meta property="og:url" content={url} />
<meta property="og:site_name" content={site.name} />
{image && <meta property="og:image" content={image} />}
{publishedTime && <meta property="article:published_time" content={publishedTime} />}

<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={desc} />
{image && <meta name="twitter:image" content={image} />}

<script type="application/ld+json" set:html={JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Seo.astro
git commit -m "feat: add SEO component with LocalBusiness schema"
```

---

## Task 7: Header, Footer, Base layout

**Files:** Create `src/components/Header.astro`, `src/components/Footer.astro`, `src/layouts/Base.astro`

- [ ] **Step 1: Header**

Replaces Superfish + the jQuery slide-out with a `<details>` element. Zero JavaScript.

```astro
---
// src/components/Header.astro
import { Image } from 'astro:assets';
import { nav, site } from '../data/site';
import logoDark from '../assets/chrome/ruckus_logo_dark.png';
---
<header class="site-header">
  <div class="container-wide bar">
    <a href="/#home" class="logo" aria-label={`${site.name} home`}>
      <Image src={logoDark} alt={site.name} widths={[180, 360]} sizes="180px" loading="eager" />
    </a>

    <nav class="desktop-nav" aria-label="Main">
      <ul>{nav.map(item => <li><a href={item.href}>{item.label}</a></li>)}</ul>
    </nav>

    <details class="menu">
      <summary aria-label="Menu"><span class="bars" aria-hidden="true"></span></summary>
      <div class="panel">
        <nav aria-label="Menu">
          <ul>{nav.map(item => <li><a href={item.href}>{item.label}</a></li>)}</ul>
        </nav>
        <div class="contact">
          <p><a href={`mailto:${site.email}`}>{site.email}</a></p>
          <p><a href={`tel:${site.phoneE164}`}>{site.phone}</a></p>
          <p>{site.address.street}<br />{site.address.city}, {site.address.region} {site.address.postalCode}</p>
        </div>
      </div>
    </details>
  </div>
</header>

<style>
  .site-header { position: sticky; top: 0; z-index: 50; background: var(--color-bg); border-bottom: 1px solid var(--color-rule); }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-2); }
  .logo img { width: 180px; height: auto; }
  .desktop-nav ul, .panel ul { list-style: none; margin: 0; padding: 0; }
  .desktop-nav ul { display: flex; gap: var(--space-3); }
  .desktop-nav a { text-decoration: none; font-size: 0.9rem; letter-spacing: 0.04em; text-transform: uppercase; }
  .desktop-nav a:hover { color: var(--color-accent); }
  @media (max-width: 860px) { .desktop-nav { display: none; } }

  .menu summary { list-style: none; cursor: pointer; padding: var(--space-1); }
  .menu summary::-webkit-details-marker { display: none; }
  .bars, .bars::before, .bars::after { display: block; width: 24px; height: 2px; background: var(--color-heading); }
  .bars { position: relative; }
  .bars::before, .bars::after { content: ''; position: absolute; }
  .bars::before { top: -7px; } .bars::after { top: 7px; }
  .panel { position: absolute; right: 1rem; top: 100%; width: min(320px, calc(100vw - 2rem));
           background: var(--color-bg); border: 1px solid var(--color-rule); padding: var(--space-3); }
  .panel li + li { margin-top: var(--space-1); }
  .panel a { text-decoration: none; }
  .contact { margin-top: var(--space-3); border-top: 1px solid var(--color-rule); padding-top: var(--space-2); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Footer**

```astro
---
// src/components/Footer.astro
import { site, legalLinks } from '../data/site';
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container">
    <address>
      <strong>{site.legalName}</strong><br />
      {site.address.street}<br />
      {site.address.city}, {site.address.region} {site.address.postalCode}<br />
      <a href={`tel:${site.phoneE164}`}>{site.phone}</a> ·
      <a href={`mailto:${site.email}`}>{site.email}</a>
    </address>
    <p class="legal">
      © {year} {site.name}.
      {legalLinks.map((l, i) => <>{i > 0 && ' | '}<a href={l.href}>{l.label}</a></>)}
    </p>
  </div>
</footer>

<style>
  .site-footer { background: var(--color-bg-dark); color: #cfcbc6; padding-block: var(--space-5); margin-top: var(--space-6); }
  .site-footer a { color: var(--color-accent); }
  address { font-style: normal; line-height: 1.8; }
  .legal { margin-top: var(--space-3); font-size: 0.875rem; }
</style>
```

- [ ] **Step 3: Base layout**

```astro
---
// src/layouts/Base.astro
import '@fontsource/open-sans/300.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/lato/900.css';
import '@fontsource/raleway/400.css';
import '../styles/tokens.css';
import '../styles/base.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import favicon from '../assets/chrome/cropped-FAVICON-192x192.png';
import appleIcon from '../assets/chrome/cropped-FAVICON-180x180.png';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href={favicon.src} />
    <link rel="apple-touch-icon" href={appleIcon.src} />
    <slot name="head" />
  </head>
  <body>
    <a href="#main" class="visually-hidden">Skip to content</a>
    <Header />
    <main id="main"><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro src/components/Footer.astro src/layouts/Base.astro
git commit -m "feat: add header, footer and base layout"
```

---

## Task 8: HeroVideo facade

The single biggest CWV win. The live site loads the YouTube iframe API before anything paints.

**Files:** Create `src/components/HeroVideo.astro`

- [ ] **Step 1: Write it**

```astro
---
// src/components/HeroVideo.astro
// The live site autoloads a YouTube background video, which is its worst LCP and
// TBT offender. The poster carries LCP here and the player is fetched only on
// click. `mode` is reserved so motion can be restored later (see the spec's
// phase-2 note) without a rewrite.
import { getImage } from 'astro:assets';
import { resolveMedia } from '../lib/images';

interface Props {
  videoId: string;
  poster: string;            // sentinel or bare filename
  title?: string;
  mode?: 'facade' | 'autoplay';
}
const { videoId, poster, title = 'Play video', mode = 'facade' } = Astro.props;

const img = resolveMedia(poster);
if (!img) throw new Error(`HeroVideo: poster "${poster}" was not migrated — check src/assets/media/`);

const [avif, webp, fallback] = await Promise.all([
  getImage({ src: img, format: 'avif', widths: [768, 1280, 1920] }),
  getImage({ src: img, format: 'webp', widths: [768, 1280, 1920] }),
  getImage({ src: img, format: 'jpeg', width: 1920 }),
]);
---
<div class="hero-video" data-video-id={videoId} data-mode={mode}>
  <picture>
    <source type="image/avif" srcset={avif.srcSet.attribute} sizes="100vw" />
    <source type="image/webp" srcset={webp.srcSet.attribute} sizes="100vw" />
    <img src={fallback.src} width={img.width} height={img.height} alt=""
         fetchpriority="high" loading="eager" decoding="async" />
  </picture>
  <button type="button" class="play" aria-label={title}>
    <svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
      <path d="M66.5 7.7a8 8 0 0 0-5.6-5.7C56 .7 34 .7 34 .7s-22 0-26.9 1.3A8 8 0 0 0 1.5 7.7 83 83 0 0 0 .2 24a83 83 0 0 0 1.3 16.3 8 8 0 0 0 5.6 5.7C12 47.3 34 47.3 34 47.3s22 0 26.9-1.3a8 8 0 0 0 5.6-5.7A83 83 0 0 0 67.8 24a83 83 0 0 0-1.3-16.3z" fill="#212121" fill-opacity=".8"/>
      <path d="M27.2 34.4 45.5 24 27.2 13.6z" fill="#fff"/>
    </svg>
  </button>
</div>

<script>
  // ~700 bytes. Replaces the YouTube iframe API entirely.
  document.querySelectorAll<HTMLElement>('.hero-video').forEach((el) => {
    const button = el.querySelector('button');
    button?.addEventListener('click', () => {
      const id = el.dataset.videoId;
      if (!id) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = button.getAttribute('aria-label') ?? 'Video';
      iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      el.replaceChildren(iframe);
    }, { once: true });
  });
</script>

<style>
  .hero-video { position: relative; aspect-ratio: 16 / 9; background: #000; overflow: hidden; }
  .hero-video img, .hero-video :global(iframe) { width: 100%; height: 100%; object-fit: cover; border: 0; }
  .play {
    position: absolute; inset: 0; margin: auto; width: 68px; height: 48px;
    background: none; border: 0; cursor: pointer; padding: 0;
  }
  .play:hover path:first-child { fill-opacity: 1; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HeroVideo.astro
git commit -m "feat: add poster-first YouTube facade"
```

---

## Task 9: Portfolio grid and testimonial slider

**Files:** Create `src/components/PortfolioGrid.astro`, `src/components/TestimonialSlider.astro`

- [ ] **Step 1: PortfolioGrid** — replaces Isotope.

```astro
---
// src/components/PortfolioGrid.astro
// Replaces Isotope + jQuery with CSS Grid and a small filter. Filtering toggles
// a data attribute; CSS does the hiding, so no layout is computed in JS.
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { resolveMedia } from '../lib/images';

const work = (await getCollection('work')).sort((a, b) => a.data.title.localeCompare(b.data.title));

const items = await Promise.all(work.map(async (entry) => {
  const first = /@assets\/media\/([^"']+)/.exec(entry.body ?? '')?.[1] ?? null;
  const img = first ? resolveMedia(first) : null;
  const thumb = img ? await getImage({ src: img, format: 'webp', widths: [400, 800] }) : null;
  return {
    slug: entry.id.replace(/\.mdx$/, ''),
    title: entry.data.title,
    path: entry.data.path,
    thumb, width: img?.width, height: img?.height,
  };
}));
---
<div class="portfolio">
  <ul class="grid">
    {items.map(item => (
      <li>
        <a href={item.path}>
          {item.thumb
            ? <img srcset={item.thumb.srcSet.attribute} sizes="(max-width: 700px) 100vw, 33vw"
                   src={item.thumb.src} width={item.width} height={item.height}
                   alt="" loading="lazy" decoding="async" />
            : <div class="noimg" aria-hidden="true"></div>}
          <span>{item.title}</span>
        </a>
      </li>
    ))}
  </ul>
</div>

<style>
  .grid { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2);
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .grid a { display: block; text-decoration: none; position: relative; }
  .grid img { aspect-ratio: 3 / 2; object-fit: cover; width: 100%; }
  .noimg { aspect-ratio: 3 / 2; background: var(--color-rule); }
  .grid span { display: block; padding: var(--space-1) 0; font-family: var(--font-display);
               text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.85rem; color: var(--color-heading); }
  .grid a:hover span { color: var(--color-accent); }
</style>
```

- [ ] **Step 2: Testimonials — style, don't componentize**

There is **no `TestimonialSlider` component in this plan**, deliberately. Verified in the migrated content: the two real testimonials (Aqua-Flo and one other) already live inside `src/content/pages/home.mdx` as `<blockquote>` elements, rendered by `RichText`. A props-driven slider would have nothing to feed it — the content never arrives as structured data.

Replace the Nectar slider with CSS on the markup that actually exists. Append to `src/styles/base.css`:

```css
/* The migrated home body carries testimonials as consecutive <blockquote>
   elements. Salient drove these with a jQuery slider; scroll-snap does it with
   no JavaScript. `.image-icon` is the decorative opening quote mark that came
   through the migration. */
.prose blockquote {
  margin: 0;
  font-family: var(--font-alt);
  font-size: 1.125rem;
  line-height: 1.6;
}
.prose blockquote .image-icon {
  font-family: var(--font-display);
  font-size: 3rem;
  line-height: 1;
  color: var(--color-accent);
}
@media (min-width: 700px) {
  /* Lay a run of sibling blockquotes out as a swipeable row. */
  .prose blockquote + blockquote { margin-top: var(--space-3); }
}
```

If a later review shows the blockquotes are wrapped in a common parent, convert that parent to `display: flex; overflow-x: auto; scroll-snap-type: x mandatory` instead. Inspect the real markup before writing that rule — do not guess at a wrapper that may not exist.

- [ ] **Step 3: Commit**

```bash
git add src/components/PortfolioGrid.astro src/styles/base.css
git commit -m "feat: add portfolio grid and testimonial styling"
```

---

## Task 10: Routes

**Files:** Create `src/pages/index.astro`, `src/pages/[...slug].astro`, `src/pages/work/[slug].astro`, `src/pages/portfolio-ruckus.astro`, `src/pages/404.astro`

> **Critical routing constraint.** Knowledge posts live at the **site root**
> (`/advertising-is-for-profits/`), not under `/knowledge/`. A
> `src/pages/knowledge/[slug].astro` file would emit `/knowledge/<slug>/` and
> break URL parity on all 9 posts. So pages and posts share **one root
> catch-all**, branching on `kind`. Do not create a `knowledge/` route
> directory. `/knowledge/` itself is a *page* in the `pages` collection and is
> served by this same catch-all.

- [ ] **Step 1: Root catch-all** — covers the 9 non-home pages and all 9 knowledge posts.

```astro
---
// src/pages/[...slug].astro
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Seo from '../components/Seo.astro';
import RichText from '../components/RichText.astro';
import { site } from '../data/site';

export async function getStaticPaths() {
  const [pages, posts] = await Promise.all([
    getCollection('pages'),
    getCollection('knowledge'),
  ]);

  const slugOf = (path) => path.replace(/^\/|\/$/g, '');

  const fromPages = pages
    // The homepage has its own route; portfolio-ruckus is rebuilt in its own file.
    .filter(p => p.data.path !== '/' && p.data.path !== '/portfolio-ruckus/')
    .map(p => ({ params: { slug: slugOf(p.data.path) }, props: { entry: p, kind: 'page' } }));

  // Knowledge posts are root-level URLs, so they belong to this same catch-all.
  const fromPosts = posts
    .map(p => ({ params: { slug: slugOf(p.data.path) }, props: { entry: p, kind: 'post' } }));

  return [...fromPages, ...fromPosts];
}

const { entry, kind } = Astro.props;
const d = entry.data;
const isPost = kind === 'post';

const breadcrumbs = isPost
  ? [{ name: 'Home', url: '/' }, { name: 'Knowledge', url: '/knowledge/' }, { name: d.title, url: d.path }]
  : [{ name: 'Home', url: '/' }, { name: d.title, url: d.path }];

const schema = isPost
  ? {
      '@type': 'Article',
      headline: d.title,
      datePublished: d.pubDate.toISOString(),
      author: { '@id': `${site.url}/#organization` },
      publisher: { '@id': `${site.url}/#organization` },
    }
  : undefined;
---
<Base>
  <Seo slot="head" title={d.seo.title ?? d.title} description={d.seo.description}
       canonical={d.seo.canonical} ogImage={d.seo.ogImage}
       type={isPost ? 'article' : 'website'}
       publishedTime={isPost ? d.pubDate.toISOString() : undefined}
       breadcrumbs={breadcrumbs} schema={schema} />
  <article class="container section">
    <h1>{d.title}</h1>
    {isPost && (
      <time datetime={d.pubDate.toISOString()}>
        {d.pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </time>
    )}
    <RichText html={entry.body ?? ''} />
  </article>
</Base>
```

- [ ] **Step 2: Work detail**

```astro
---
// src/pages/work/[slug].astro
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import Seo from '../../components/Seo.astro';
import RichText from '../../components/RichText.astro';
import { site } from '../../data/site';

export async function getStaticPaths() {
  const work = await getCollection('work');
  return work.map(entry => ({
    params: { slug: entry.data.path.replace('/work/', '').replace(/\/$/, '') },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const d = entry.data;
---
<Base>
  <Seo slot="head" title={d.seo.title ?? d.title} description={d.seo.description}
       canonical={d.seo.canonical} ogImage={d.seo.ogImage}
       breadcrumbs={[
         { name: 'Home', url: '/' },
         { name: 'Work', url: '/portfolio-ruckus/' },
         { name: d.title, url: d.path },
       ]}
       schema={{ '@type': 'CreativeWork', name: d.title, url: new URL(d.path, site.url).href,
                 creator: { '@id': `${site.url}/#organization` } }} />
  <article class="container section">
    <h1>{d.title}</h1>
    <RichText html={entry.body ?? ''} />
    <p><a href="/portfolio-ruckus/">← All work</a></p>
  </article>
</Base>
```

- [ ] **Step 3: Rebuilt portfolio index** — per decision 2, all 20 items, URL preserved.

```astro
---
// src/pages/portfolio-ruckus.astro
// Decision 2 (2026-08-14): rebuilt as a real index of all 20 work items. The
// migrated body's 8 hardcoded cards are discarded — 4 of them were 404s — but
// its intro copy is kept. Generated from the collection so it cannot drift.
import { getCollection, getEntry } from 'astro:content';
import Base from '../layouts/Base.astro';
import Seo from '../components/Seo.astro';
import PortfolioGrid from '../components/PortfolioGrid.astro';

const entry = (await getCollection('pages')).find(p => p.data.path === '/portfolio-ruckus/')!;
const d = entry.data;
const work = await getCollection('work');
---
<Base>
  <Seo slot="head" title={d.seo.title ?? d.title} description={d.seo.description}
       canonical={d.seo.canonical}
       breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Work', url: '/portfolio-ruckus/' }]}
       schema={{
         '@type': 'CollectionPage',
         name: d.title,
         hasPart: work.map(w => ({ '@type': 'CreativeWork', name: w.data.title, url: new URL(w.data.path, Astro.site!).href })),
       }} />
  <div class="container section">
    <h1>{d.title}</h1>
    <PortfolioGrid />
  </div>
</Base>
```

- [ ] **Step 4: Homepage and 404**

`src/pages/index.astro` renders the migrated home body through `RichText`, which already carries the six `id` anchors and the rescued backgrounds. Add `HeroVideo` above it using `videoId="NgliiMV4jzE"` and `poster="ruckus_vid-1.jpg"` (the poster recovered in Plan 1).

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Seo from '../components/Seo.astro';
import RichText from '../components/RichText.astro';
import HeroVideo from '../components/HeroVideo.astro';

const entry = (await getCollection('pages')).find(p => p.data.path === '/')!;
const d = entry.data;
---
<Base>
  <Seo slot="head" title={d.seo.title ?? d.title} description={d.seo.description} canonical={d.seo.canonical} ogImage={d.seo.ogImage} />
  <section id="home"><HeroVideo videoId="NgliiMV4jzE" poster="ruckus_vid-1.jpg" title="Play the Ruckus Creative reel" /></section>
  <RichText html={entry.body ?? ''} class="prose container-wide" />
</Base>
```

```astro
---
// src/pages/404.astro
import Base from '../layouts/Base.astro';
import Seo from '../components/Seo.astro';
---
<Base>
  <Seo slot="head" title="Page not found · Ruckus Creative" description="That page doesn't exist." />
  <div class="container section">
    <h1>Page not found</h1>
    <p>That page doesn't exist. Try <a href="/">the homepage</a> or <a href="/portfolio-ruckus/">our work</a>.</p>
  </div>
</Base>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages
git commit -m "feat: add all 39 routes"
```

---

## Task 11: Redirects

**Files:** Create `src/middleware.ts`

- [ ] **Step 1: Write it**

```typescript
// src/middleware.ts
// The 11 redirects emitted by Plan 1. Handled in middleware rather than
// astro.config so the map stays a single source of truth in src/redirects.json.
import type { MiddlewareHandler } from 'astro';
import redirects from './redirects.json';

const map = new Map(redirects.map(r => [r.from, r.to]));

export const onRequest: MiddlewareHandler = (context, next) => {
  const target = map.get(context.url.pathname);
  if (target) return context.redirect(target, 301);
  return next();
};
```

- [ ] **Step 2: Verify redirects are reachable**

Static routes are served by the assets binding before middleware in some configurations. Confirm with a local build that `/contact/` actually 301s rather than 404ing:

```bash
npx astro build && npx wrangler dev --port 8788
```

In another shell:

```bash
curl -sI http://localhost:8788/contact/ | head -2
```

Expected: `HTTP/1.1 301` with `location: /contact-ruckus-creative/`. If it returns 404, the assets binding is intercepting first — set `"assets": { "not_found_handling": "single-page-application" }` off and instead move the 11 redirects into `astro.config.mjs`'s `redirects` option, which Astro compiles into the Worker routing. Report which approach worked.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add 301 redirect handling"
```

---

## Task 12: robots.txt and sitemap

The spec calls for cleaning up `robots.txt`; the current one carries `Crawl-delay: 3` and a blanket `Disallow: /*?`, both of which suppress crawling for no benefit.

**Files:** Create `public/robots.txt`

- [ ] **Step 1: Write it**

```
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://ruckuscreative.com/sitemap-index.xml
```

Dropped from the WordPress version, deliberately:
- `Crawl-delay: 3` — Google ignores it, and it slows every other crawler for no reason.
- `Disallow: /*?` — blocked every URL with a query string, which on a static site suppresses nothing useful and risks blocking legitimate tracking-parameter URLs.
- `Disallow: /calendar/action*`, `/events/action*` — WordPress plugin routes that do not exist in this build.
- `Disallow: /cdn-cgi*` — Cloudflare handles this itself.

- [ ] **Step 2: Confirm the sitemap generates**

`@astrojs/sitemap` was configured in Plan 1's `astro.config.mjs`. After a build:

```bash
npx astro build && ls dist/sitemap*.xml && grep -c '<loc>' dist/sitemap-0.xml
```

Expected: `sitemap-index.xml` and `sitemap-0.xml` exist, with **39** `<loc>` entries. A different count means routes are missing or extra — reconcile against `allEntries()` before continuing.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt without the WordPress crawl restrictions"
```

---

## Task 13: Build verification

**Files:** Create `tests/routes.test.mjs`

- [ ] **Step 1: Build**

```bash
npx astro build
```

Expected: **39 pages built**, no errors.

- [ ] **Step 2: Write the URL-parity test**

```javascript
// tests/routes.test.mjs
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries } from '../scripts/lib/inventory.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;

describe('built routes', () => {
  it('emits an index.html at every migrated URL', () => {
    const missing = allEntries()
      .map(e => ({ path: e.path, file: join(dist, e.path, 'index.html') }))
      .filter(x => !existsSync(x.file))
      .map(x => x.path);
    expect(missing, `missing built routes:\n${missing.join('\n')}`).toEqual([]);
  });

  it('emits a 404 page', () => {
    expect(existsSync(join(dist, '404.html'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run it**

```bash
npx vitest run tests/routes.test.mjs
```

If any route is missing, the `getStaticPaths` slug derivation is wrong — most likely the knowledge-post root-URL issue flagged in Task 10 Step 3. Fix the route, not the test.

- [ ] **Step 4: Check the JavaScript budget**

```bash
find dist/client/_astro -name '*.js' -exec wc -c {} + | tail -1
```

Target from the spec: **under 10 KB total**. If it exceeds that, find what pulled in a dependency — nothing in this plan should ship more than the HeroVideo click handler.

- [ ] **Step 5: Confirm no unresolved sentinels reached the build**

```bash
grep -rl '@assets/media/' dist/ && echo "FAIL: unresolved sentinels in output" || echo "OK: all sentinels resolved"
```

Any hit means `RichText` failed to match that markup pattern. Fix the component.

- [ ] **Step 6: Commit**

```bash
git add tests/routes.test.mjs
git commit -m "test: verify built routes match the migrated URL inventory"
```

---

## Definition of done

- [ ] `npx vitest run` — all tests pass, including the 51 from Plan 1
- [ ] `npx astro check` — 0 errors
- [ ] `npx astro build` — 39 pages, no errors
- [ ] Every migrated URL has a built `index.html` (Task 12 test)
- [ ] Total client JS under 10 KB
- [ ] No `@assets/media/` sentinels remain in `dist/`
- [ ] `/contact/` returns 301 in a local `wrangler dev`
- [ ] The address renders as Suite 300-173 everywhere it appears
- [ ] `/portfolio-ruckus/` lists all 20 work items
- [ ] `robots.txt` present; `sitemap-0.xml` contains 39 `<loc>` entries

**Then proceed to Plan 3: Form, Deploy & Verification** — which still needs the contact-form backend decision recorded in `2026-08-13-open-decisions.md` §3.
