# Ruckus Creative

Static rebuild of [ruckuscreative.com](https://ruckuscreative.com) — previously
WordPress with the Salient theme and WPBakery — on Astro, deployed to Cloudflare
Workers.

**Preview:** https://ruckuscreative.ruckus-astro.workers.dev

## Why

The WordPress site shipped ~500 KB of JavaScript across ~30 files (jQuery,
Isotope, anime.js, Waypoints, Superfish, WPBakery, Gravity Forms, reCAPTCHA,
the YouTube iframe API) and 385 KB of HTML on the homepage. This rebuild keeps
the design and every URL, and removes essentially all of that.

| | WordPress | This |
|---|---|---|
| Homepage HTML (gzipped) | 63.5 KB | 9.2 KB |
| `/about/` (gzipped) | 27.9 KB | 2.4 KB |
| JavaScript on the page | ~500 KB | ~2.5 KB |
| External scripts | ~30 | 0 |
| Structured data | none | Organization, LocalBusiness, Article, CreativeWork, BreadcrumbList |

## Stack

- **Astro 7** — static output, one on-demand route for the contact form
- **Cloudflare Workers** with Static Assets, `imageService: 'compile'` so sharp
  emits AVIF/WebP at build rather than using metered image transforms
- **Content collections** — 39 pages migrated out of WordPress into Markdown,
  committed; the build has no runtime dependency on WordPress
- **Mux** for the hero video, behind a poster-first facade

## Getting started

```bash
npm install
npm run dev
```

| Script | Does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the build through `wrangler dev` |
| `npm test` | Vitest suite (69 tests) |
| `npm run check` | `astro check` |
| `npm run migrate` | Re-run the WordPress extraction (one-shot; already done) |
| `npm run redirects` | Regenerate `src/redirects.json` |
| `npm run fidelity` | Diff every migrated URL against the live WordPress site |

## Layout

```
scripts/
  lib/inventory.mjs        URL inventory + redirect map — the source of truth for scope
  lib/wp-client.mjs        WordPress fetch, REST with a rendered-DOM fallback
  lib/html-to-content.mjs  Strips WPBakery/Salient markup, keeps layout and media
  lib/media.mjs            Image download and filename collision handling
  migrate.mjs              One-shot migration orchestrator
  compare-fidelity.mjs     Structural diff of rebuilt vs live pages
src/
  content/{pages,work,knowledge}/   39 migrated Markdown files
  components/RichText.astro         Renders migrated bodies, resolves image sentinels
  lib/images.ts                     Maps @assets/media/ sentinels to real assets
docs/superpowers/                   Spec, plans, and decisions
```

## Notes for anyone working on this

- **URLs are load-bearing.** All 39 paths match WordPress exactly, trailing
  slashes included, with 11 redirects for retired ones. `trailingSlash: 'always'`
  and `build.format: 'directory'` in `astro.config.mjs` are what preserve them.
  `npm test` fails if a migrated URL stops building.
- **Content is `.md`, not `.mdx`.** MDX parses embedded HTML as JSX and rejects
  the unclosed `<br>` and `<img>` tags WordPress emits.
- **`@assets/media/<file>` in content is a deliberate sentinel**, not a working
  import. `RichText` resolves it to optimized `<picture>` markup at build time.
  Making it resolve as a path alias would emit plain `<img>` and skip
  optimization entirely.
- **The business address lives in `src/data/site.ts`.** The live WordPress site
  renders three different suite numbers; only the one here is correct.

See `docs/superpowers/` for the full spec, the three implementation plans, and
the record of decisions made along the way.
