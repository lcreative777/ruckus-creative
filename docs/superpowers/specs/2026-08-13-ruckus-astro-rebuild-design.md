# Ruckus Creative — Astro Rebuild

**Date:** 2026-08-13
**Status:** Approved
**Source site:** https://ruckuscreative.com (WordPress + Salient 16.2.2 + WPBakery + Gravity Forms)
**Target:** Astro 7 static site on Cloudflare Workers, account `c0780521925c950ef323a873c907c291`

---

## Goal

Rebuild ruckuscreative.com as a static Astro site that is **visually faithful to the current design** but rebuilt with clean, modern code. No jQuery, no page-builder markup. The measurable objectives are improved Core Web Vitals and improved technical SEO, sitewide.

A visitor should not notice a design change. They should notice the site is fast.

**Fidelity bar: close, not pixel-perfect.** Confirmed with the client on 2026-08-13. The target is that the rebuilt page reads as the same design — same layout, type, color, imagery, and hierarchy — not that it diffs to zero against the original. Minor differences in spacing, easing, and shadow rendering are acceptable and are not defects. This matters most for the WPBakery-built pages, where chasing exact reproduction of page-builder output would cost far more than it returns.

### Non-goals

- No visual redesign. Layout, type, color, spacing, and imagery match the current site.
- No CMS. Content is migrated once and committed to the repo as files.
- No new content, new pages, or new copy.
- No WooCommerce, comments, search, or category archives (see Scope).

---

## Baseline

Measured against the live site on 2026-08-13:

| Metric | Current |
|---|---|
| Homepage HTML | 385 KB raw / 63 KB gzipped |
| JavaScript files | ~30 |
| Notable JS | jQuery 3.7.1, Isotope, anime.js, Waypoints, Superfish, transit, touchswipe, hoverintent, WPBakery runtime, Gravity Forms, reCAPTCHA, YouTube iframe API |
| CSS | Fully inlined across 8 `<style>` blocks; entire Salient stylesheet regardless of page usage |
| Fonts | 2 blocking Google Fonts requests, 5 families |
| Images | 21 JPG + 4 PNG on homepage; no WebP/AVIF, no modern `srcset` |
| Hero | YouTube background video (`NgliiMV4jzE`) via `iframe_api` |

The YouTube background video is the primary LCP and TBT liability. The inlined full stylesheet is the primary render-blocking liability.

### Targets

- Under **10 KB** of JavaScript sitewide (from roughly 500 KB).
- LCP under 2.0s on mobile 4G.
- CLS under 0.05 — every image carries explicit dimensions.
- Lighthouse Performance, Accessibility, Best Practices, and SEO all 95+.

These are targets that guide implementation decisions, not acceptance gates; actual numbers get reported after the Lighthouse run in Phase 6.

---

## Scope

Derived from the Rank Math sitemap. **39 URLs migrate.**

### Pages (10)

`/`, `/about/`, `/strategic-creative-capabilities/`, `/process-ruckus-creative/`,
`/results-based-advertising-branding/`, `/knowledge/`, `/portfolio-ruckus/`,
`/contact-ruckus-creative/`, `/privacy-policy/`, `/terms-and-conditions/`

### Portfolio — `/work/*` (20)

colorgraphics, heineken, dual-graphics, fnic, future-fins, kirin-brewery,
metrex-research, national-planning-corp, qai-laboratories, surf-rx,
jwc-environmental, the-rms-group, tecate-cervesa, touchpoint-marketing,
us-pool-tile, sophia-redpeg-marketing, universal-pool-tile,
mayweather-the-best-ever-book, aqua-flo, dos-equis

### Knowledge posts (9)

Verified by content inspection, not by title. The split falls cleanly on publication year: **every 2012 post is genuine Ruckus writing** (4–8 KB articles on positioning, differentiation, PR, and proof), and **every 2011 post is Salient demo content** (movie quotes and Latin lorem ipsum). Slugs preserved verbatim.

`whats-your-point-let-your-prospects-say-no-as-long-as-they-know-what-you-offer`,
`print-is-expensive-dont-let-your-sales-team-waste-it-qualify-qualify-qualify`,
`advertising-is-for-profits`, `3-2-1-using-pr-for-lift-off-and-lift`,
`ask-and-ye-shall-receive-get-a-response`, `dont-just-say-it-prove-it`,
`three-strikes-youre-out-three-overused-taglines-to-avoid-at-all-costs`,
`clarity-create-an-unforgettable-brand`,
`differentiate-for-higher-profits-create-a-monopoly-and-raise-your-prices`

### Excluded, with redirects

| URL | Disposition |
|---|---|
| `/contact/` | 301 → `/contact-ruckus-creative/` (duplicate) |
| `/error-page-template/` | Dropped; served by the 404 route |
| 8 Salient demo posts | 301 → `/knowledge/` |
| `/category/news/`, `/category/knowledge/` | 301 → `/knowledge/` |

The 8 demo posts, all dated 2011: `you-think-water-moves-fast`, `airspeed-velocity-of-a-swallow`, `when-do-spiders-sleep`, `youre-the-expert-now`, `a-matter-of-deductive-logic`, `mauris-imperdiet-eros`, `aliquam-at-dui-velit`, `ut-placerat-egestas`.

**Every migrated URL keeps its exact path, trailing slash included.** This is non-negotiable — it is what protects existing rankings and backlinks.

---

## Architecture

Astro 7.2 with the `@astrojs/cloudflare` adapter 14.2 (`output` defaults to `'static'`), deployed as a **Worker with Static Assets**.

All routes are pre-rendered at build time except one: `/api/contact` sets `export const prerender = false`, which Astro 7 supports on an otherwise-static build. That yields a single Worker script that serves static assets and handles exactly one dynamic route.

```
ruckus-astro/
├── src/
│   ├── components/       # Header, Footer, HeroVideo, PortfolioGrid,
│   │                     # TestimonialSlider, ContactForm, Seo
│   ├── content/          # pages/, work/, knowledge/  (migrated content)
│   ├── assets/           # source images, processed at build time
│   ├── layouts/
│   ├── pages/
│   │   ├── api/contact.ts
│   │   ├── work/[slug].astro
│   │   └── knowledge/[slug].astro
│   └── styles/
├── scripts/migrate.mjs
├── public/fonts/         # self-hosted subset WOFF2
├── astro.config.mjs
└── wrangler.jsonc
```

### Why Workers over Pages

Cloudflare Workers with Static Assets is the current recommended target and the successor to Pages. It keeps static hosting and the form endpoint in one deployable unit, and it stays on the free tier.

---

## Content migration

`scripts/migrate.mjs` runs **once**, writing files that are committed to the repo. After it runs, WordPress is no longer a dependency of the build.

### Two extraction paths

The WordPress REST API is publicly readable at `/wp-json/wp/v2/`, which handles most content cleanly. But **WPBakery pages return raw `[vc_row]` shortcodes through REST rather than rendered HTML** — confirmed on `/strategic-creative-capabilities/`. Those pages must be read from the rendered DOM instead.

So the script decides per URL:

1. Fetch via REST. If `content.rendered` contains `[vc_`, discard it.
2. In that case, fetch the rendered page and extract the main content region.
3. Convert either result to semantic markup — real `<section>`, `<h2>`, `<ul>` — discarding WPBakery wrapper divs and Salient utility classes.

Shortcode-heavy pages are expected to need hand-finishing after the automated pass. This is anticipated work, not a failure of the script.

### Media

Full-resolution originals download to `src/assets/`, preserving their WordPress filenames so the mapping stays auditable. Astro re-encodes at build time. Original WordPress-generated thumbnail sizes are ignored; Astro generates its own responsive set.

### Collections

`pages`, `work`, `knowledge` — each with a Zod schema covering title, slug, description, canonical, OG image, dates, and per-type fields (portfolio client/category, post author/date).

---

## Components

Every jQuery-dependent behavior gets a vanilla replacement, loaded as an island only on pages that use it.

| Current | Replacement | Est. |
|---|---|---|
| Isotope portfolio filter | CSS Grid + vanilla filter, ~40 lines | ~1 KB |
| Nectar testimonial slider | CSS scroll-snap carousel | ~0.5 KB |
| Superfish menu | `<details>` + CSS | 0 KB |
| Waypoints + anime.js reveals | IntersectionObserver + CSS transitions | ~0.5 KB |
| YouTube background video | Poster-first facade | ~1 KB |
| Gravity Forms + reCAPTCHA | Native form + Turnstile | ~2 KB |

All animation respects `prefers-reduced-motion`.

### HeroVideo

Renders a poster image as the LCP element. The YouTube player loads only on click.

The component takes a `mode` prop — `'facade'` (built now) or `'autoplay'` (reserved) — so restoring motion later is a prop change rather than a rewrite.

**Documented phase 2, not built now:** because LCP measures the poster, a muted self-hosted MP4 loop can swap in *after* the page is interactive without affecting the score. Gate on `prefers-reduced-motion`, `navigator.connection.saveData`, and a desktop-width media query. This restores the motion of the current design at effectively zero CWV cost. Deferred so the baseline ships clean and the improvement can be measured against it.

---

## Contact form

Fields preserved exactly as the current Gravity Form: Name, Company, Title, **Email (required)**, Phone, Address, Questions or Comments, How did you hear about us?

`POST /api/contact` in the Worker:

1. Validate and normalize fields; reject on missing/malformed email.
2. Verify the Turnstile token server-side against `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Never trust the client result.
3. Send via the native Cloudflare `send_email` binding.
4. Return JSON. The form degrades to a standard POST and a server-rendered confirmation if JS is unavailable.

Turnstile replaces reCAPTCHA — free, lighter, and no third-party data sharing.

### Prerequisite check result — the approach changed

Checked 2026-08-14 against the target account, before any form code was written.
The zone is present and active on account `c0780521925c950ef323a873c907c291`, but:

- Email Routing is **not** enabled (`status: unconfigured`), and there are **no** verified destination addresses.
- The zone's MX records point at **Google Workspace** (`aspmx.l.google.com`), with SPF `include:_spf.google.com`.

Enabling Cloudflare Email Routing rewrites the zone's MX records, which would break
all inbound mail for the domain. That is not an acceptable trade for a contact form,
so **the native `send_email` binding is ruled out**.

Replacement: the Worker POSTs to a transactional email API (Resend or Postmark) after
validating the submission and verifying the Turnstile token. Sending is done from a
dedicated subdomain, leaving the existing Google Workspace records untouched. Turnstile
is unaffected and remains the spam control.

Full analysis and alternatives in `docs/superpowers/plans/2026-08-13-open-decisions.md`.

---

## SEO

- **URL parity.** Exact paths, trailing slashes preserved. 301s as tabled above.
- **Metadata carried over.** Existing Rank Math titles, descriptions, and canonicals are extracted during migration and reused verbatim, so no ranking signal changes with the rebuild.
- **Structured data**, newly added — the current site has none: `Organization` and `LocalBusiness` (27525 Puerta Real Suite 300-173, Mission Viejo CA 92691; phone 714.514.1482 — client-confirmed 2026-08-14 as the single source of truth, superseding the two conflicting variants on the live site), `BreadcrumbList`, `Article` on knowledge posts, `CreativeWork` on portfolio items.
- **Open Graph and Twitter cards** on every page, with per-page images.
- **`sitemap.xml`** generated by `@astrojs/sitemap`.
- **`robots.txt` cleaned.** The current file carries `Crawl-delay: 3` and a blanket `Disallow: /*?`; both are dropped.
- Semantic heading hierarchy — exactly one `<h1>` per page, no skipped levels.

---

## Core Web Vitals

- **Fonts self-hosted** as subset WOFF2, preloaded, `font-display: swap`. Replaces 2 blocking Google Fonts requests across 5 families (Open Sans, Lato 900, Raleway, Open Sans Condensed, Libre Baskerville).
- **Images** through Astro `<Picture>`: AVIF + WebP + fallback, responsive `srcset`, explicit width/height on every instance, `loading="lazy"` below the fold, `fetchpriority="high"` on the LCP image.
- **CSS** scoped per component; Astro inlines only what each page needs.
- **Hero** poster-first, per above.

---

## Verification

Nothing goes live until all of the following pass, and results are reported with actual numbers rather than claims:

1. `astro check` and the production build complete without errors.
2. **URL parity** — an automated check that all 39 migrated URLs return 200 on the preview deployment, and every redirect resolves to its intended target.
3. **Visual comparison** — side-by-side screenshots of each page, new versus current, at 1440px and 390px. Reviewed by a human before cutover. Judged against the "close, not pixel-perfect" bar: the gate is missing or misplaced *content* and broken layout, not sub-pixel spacing differences.
4. **Lighthouse** against the preview deployment, mobile and desktop, on a representative sample: homepage, a portfolio item, a knowledge post, contact.
5. **Form test** — an end-to-end submission that lands in the destination inbox, plus confirmation that a submission with an invalid Turnstile token is rejected.
6. **Link check** — no internal 404s, no lingering absolute `https://ruckuscreative.com` URLs pointing at WordPress paths.

---

## Deployment

Deploys to a `workers.dev` preview URL first. The domain is **not** cut over until visual regression and Lighthouse have been reviewed and approved.

### Known blocker

`wrangler` is currently authenticated as `info@layercakemarketing.com`, account `5d0898afa5e5bb1d123f97bfb5fcde2d`. The target is a **different account**, `c0780521925c950ef323a873c907c291`.

Credentials for the target account are required before any deploy. Either an interactive `wrangler login` performed by the user while signed into the target account, or a scoped API token (Workers Scripts: Edit; Workers Routes: Edit; Email Routing: Edit; Zone: Read).

This blocks deployment only. All build, migration, and verification work up to the preview deploy proceeds without it.

### Cutover

DNS cutover is a separate, explicitly approved step. The WordPress origin stays untouched and reachable until then, so rollback is a DNS change.

---

## Risks

| Risk | Mitigation |
|---|---|
| WPBakery pages don't extract cleanly | Expected. Rendered-DOM path plus hand-finishing; visual regression catches misses. |
| Visual fidelity drift from rebuilt CSS | Screenshot comparison at two widths, human-reviewed. Bar is "close, not pixel-perfect", so minor spacing/easing differences are accepted rather than chased. |
| `send_email` destination not verified | Checked in Phase 1, before form code is written. |
| Ranking loss after cutover | Exact URL parity, verbatim metadata, complete 301 map. |
| Full-res media unavailable via REST | Fall back to scraping `srcset` for the largest available candidate. |

---

## Phases

1. **Prerequisites** — verify Cloudflare zone, Email Routing, and verified destination. Scaffold Astro project.
2. **Migration** — build and run `migrate.mjs`; hand-finish WPBakery pages.
3. **Design system** — extract the existing type scale, color, and spacing into tokens; build layout and Header/Footer.
4. **Pages and components** — all routes, all vanilla components.
5. **Form** — Turnstile + Email Worker, including the rejection path.
6. **Verification** — the six checks above.
7. **Deploy** — preview, review, then cutover on approval.
