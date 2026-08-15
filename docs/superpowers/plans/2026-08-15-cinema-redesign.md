# Plan 4: "Cinema" Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Land the Cinema redesign across all 39 pages, keeping every URL, every word of copy, and the Mux autoplay hero.

**The design of record is `docs/design/cinema/handoff.md`.** It carries exact colors, type scales, spacing, motion timings and easings, plus the full verbatim copy and the 20-item work order. `docs/design/cinema/prototype-cinema.html` is the built prototype — **read it for exact values rather than eyeballing**. Neither is production code; the task is to rebuild those designs with this repo's patterns.

**Tech Stack:** Astro 7.2, `@astrojs/cloudflare` 14.2, GSAP 3.12 + ScrollTrigger (island only), Vitest.

**Branch:** create `feat/cinema-redesign` off `main`.

---

## Decisions already made — do not re-litigate

| Decision | Answer |
|---|---|
| Hero video | **Keep the existing Mux autoplay**: silent looping background with the sound button already built. Cinema styling (three overlays, grain, eyebrow, gradient headline, scroll cue) goes on top. `ruckus_vid-1.jpg` is the poster shown before playback starts — **not** `mux-hero-poster.jpg`, which is a flat grey frame. The handoff's poster-first click-to-play facade is superseded. |
| Scope | **All 39 pages.** The handoff specifies three templates; the remaining 7 pages get the Cinema system applied using its tokens and section patterns. |
| Motion | **GSAP + ScrollTrigger**, loaded on a `client:visible` island so it never blocks first paint. |
| Deploy | **Cloudflare Workers Builds** watching GitHub `main`. |
| Testimonials | **Auto-advance every 6s**, pausing on hover, focus-within, and under `prefers-reduced-motion`. Dot nav as designed. |
| Body type | 15px / 1.8–1.9 line-height per the handoff, replacing the current 14px/26px WordPress metric. |
| Nav | Adds **Knowledge** → `/knowledge/` and the **Start a Ruckus** pill → `#contact`, per the handoff. |

## Non-negotiables carried from earlier plans

- **Every URL stays exactly as it is.** 39 paths, trailing slashes, 11 redirects. `trailingSlash: 'always'` and `build.format: 'directory'` stay. `tests/routes.test.mjs` fails if any migrated URL stops building.
- **Copy is never edited.** It is migrated WordPress content, including its own typos ("Mircrosites", "beginning to worth with them") — the handoff calls these out as deliberate.
- **Identity comes from `src/data/site.ts`**, never from the live site. Suite 300-173 is the only correct address.
- **`@assets/media/<file>` is a sentinel**, resolved by `src/lib/images.ts` + `RichText.astro`. Do not make it a path alias.
- Content is `.md`, not `.mdx`.

---

## Task 1: Icon component

**Files:** Create `src/components/Icon.astro`; Test: `tests/icons.test.mjs`

The 10 SVGs in `src/assets/icons/` carry hardcoded fills (`#231F20`, `#000000`, `#121923`) and some use `fill="none"` with strokes. The handoff renders them as `<img>` tinted with a long `filter:` chain; do the cleaner thing it recommends instead — inline them and drive colour with `currentColor`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/icons.test.mjs
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../src/assets/icons/', import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith('.svg'));

describe('icons', () => {
  it('ships the icons the design references', () => {
    for (const name of ['chart-gear-svgrepo-com', 'hvv-svgrepo-com', 'fast-svgrepo-com',
      'diamond-svgrepo-com', 'mobile-device-svgrepo-com', 'presentation-svgrepo-com',
      'atom-svgrepo-com', 'event-svgrepo-com', 'print-outline']) {
      expect(files, `${name}.svg missing`).toContain(`${name}.svg`);
    }
  });

  it('carries no hardcoded dark fills, so currentColor works', () => {
    for (const f of files) {
      const svg = readFileSync(join(dir, f), 'utf8');
      expect(svg, `${f} still hardcodes a colour`).not.toMatch(/(fill|stroke)="#(000000|000|231F20|121923)"/i);
    }
  });

  it('keeps a viewBox on every icon so it scales', () => {
    for (const f of files) {
      expect(readFileSync(join(dir, f), 'utf8'), `${f} has no viewBox`).toMatch(/viewBox="/);
    }
  });
});
```

- [ ] **Step 2:** Run it. The second assertion fails — the icons still hardcode colours.

- [ ] **Step 3: Normalise the icons in place**

Rewrite `fill="#231F20"`, `fill="#000000"`, `fill="#000"`, `fill="#121923"` and the equivalent `stroke=` values to `currentColor`. Leave `fill="none"` alone — it is load-bearing on the stroked icons. Strip fixed `width`/`height` attributes so the component sizes them, keeping `viewBox`.

- [ ] **Step 4: Write `src/components/Icon.astro`**

Accept `name` and `size` (default 36). Inline the SVG with `import.meta.glob('/src/assets/icons/*.svg', { query: '?raw', import: 'default', eager: true })`, set `width`/`height` from `size`, `aria-hidden="true"`, `focusable="false"`, and let `color` cascade. Throw a clear error naming the missing file if `name` does not resolve — a silently missing icon is worse than a build failure.

- [ ] **Step 5:** Tests pass. Commit.

---

## Task 2: Cinema design tokens and base styles

**Files:** Rewrite `src/styles/tokens.css`, `src/styles/base.css`

This is a **dark theme** replacing the current light one. Take every value from the handoff's *Design Tokens* section.

- [ ] **Step 1: Tokens**

Colors: `#b81e04` ink red, `#f6653c` flame, `#2949e8` signal blue, `#1b2f9e` deep blue, `rgba(60,88,232,.93)`, `#121110` canvas, `#161514` raised, `#1b1a18` / `rgba(27,26,24,.86)` card, `#020202` deep, `#0f0e0d` footer, `#1a1a1a` CTA, `#a8a29a` body text, `#8d8983` muted, `#6e6a63` dim, `#e4e0da` bright, hairlines `rgba(255,255,255,.08–.12)`.

Type: Lato display (100/300/700/900 + italics), Raleway alt (200/300 + italic), Open Sans body (400/600/700). All three are already installed via `@fontsource`. **Add the weights the redesign needs** — Lato 100/300/900 and italics, Raleway 200/300 — and import them in `Base.astro`.

Motion tokens: primary ease `cubic-bezier(.2,.7,.2,1)`, reveal offset 22px, tile stagger .045s, card stagger .08s.

- [ ] **Step 2: Base styles**

Dark canvas, the type scale from the handoff's typography table, `.prose` restyled for dark. **Keep the existing grid rules** (`.row`/`.col`/`span_N`, `:has(> .col ~ .col)`, the `.portfolio-items` grid, `.has-bg` / `.has-bg-color` bands) — migrated content still depends on them, and several were hard-won fixes. Retune their colours for dark rather than deleting them.

**No box-shadows anywhere** — the handoff is explicit that depth comes from gradient light and hairlines.

- [ ] **Step 3:** `npx astro build`, confirm 40 pages, commit.

---

## Task 3: Header, Footer, Base layout

**Files:** Rewrite `src/components/Header.astro`, `src/components/Footer.astro`, `src/layouts/Base.astro`

- [ ] **Step 1: Header** — fixed, `rgba(18,17,16,.72)` + `backdrop-filter: blur(14px)`, hairline bottom border, `z-index: 50`. `ruckus_logo_light.png` at 55px. Nav: Home, Intro, Work, About, Services (homepage anchors from `site.ts`) + Knowledge → `/knowledge/`. "Start a Ruckus" gradient pill → `#contact`. Anchor scrolling offsets 70px for the fixed bar (`scroll-margin-top` on the targets, not JS).

Add `Knowledge` to `nav` in `src/data/site.ts` and a `ctaLink`. Keep the existing `<details>` slide-out for narrow viewports.

- [ ] **Step 2: Footer** — `#0f0e0d`, logo at 30px `opacity: .85`, `© Ruckus Creative, LLC`, then `sidebarLinks` + `legalLinks` from `site.ts`.

- [ ] **Step 3: Base layout** — import the added font weights, dark `color-scheme`, skip link.

- [ ] **Step 4:** Build, commit.

---

## Task 4: Hero with Mux autoplay + Cinema treatment

**Files:** Rewrite `src/components/HeroVideo.astro`

Keep the current behaviour exactly — silent autoplay, loop, `playsinline`, no controls, sound toggle, deferred until after `load`, `prefers-reduced-motion` and `saveData` short-circuits, native-HLS-then-hls.js fallback with the 2.5s metadata timeout. **Do not regress any of that**; it was hard-won (Chromium answers `"maybe"` to `canPlayType` for HLS but cannot play it).

Add on top, per the handoff:
- `min-height: 100vh`, content bottom-aligned, `overflow: hidden`.
- Poster becomes `ruckus_vid-1.jpg`, `inset: -6% 0`, `height: 112%` for parallax headroom.
- Three stacked overlays in order: the 180° charcoal gradient, the paired red/blue radial washes, then the `feTurbulence` grain at `opacity: .14`, `mix-blend-mode: overlay`.
- Eyebrow: 34px rule + "Full-service creative agency since 1993" (1993 is `site.founded`).
- H1 two lines: "Business results through" in Lato 100 white; "strategic creative" in Lato 900 italic with the gradient text fill. **`padding-bottom: .16em` and `line-height: 1.06` are required** or the italic "g" descender is clipped by the background-clip box.
- Scroll cue with the `rk-scrollcue` bob.
- Sound button restyled to match the play-control language (circle, hairline border, blur), keeping its `aria-pressed` and label swap.

The pulsing play control from the handoff does **not** apply — the video autoplays.

- [ ] Build, deploy, verify with Playwright that autoplay, loop, muted, `controls: false` and the sound toggle all still hold. Commit.

---

## Task 5: Homepage sections

**Files:** Create `src/components/home/*.astro`; rewrite `src/pages/index.astro`

One component per section, in the handoff's exact order: Intro, Pillars, Statement band, Work grid, Process rail, Why Us, Stats, Testimonials, Capabilities, CTA, Contact.

Drive everything from the collections and `site.ts` — **never hardcode copy**. The work grid comes from the `work` collection in the handoff's stated order. The 20 titles are verbatim including "NATIONAL PLANNING CORP." with its trailing period and the mixed casing of "QAI Laboratories" / "Heineken".

Specific traps the handoff flags:
- Stats: render the **final formatted numbers** (`2,460`, `2,000`) as authored text. The count-up zeroes and re-counts only when its trigger fires, so a stale trigger degrades to "no animation" rather than a visible `0`.
- Process rail: progress bar maps `scrollLeft / (scrollWidth - clientWidth)` to `width: 12% → 100%`.
- Testimonials: all 8 quotes verbatim in source order, preserving the source's own inconsistencies. **Auto-advance 6s**, pause on hover / `focus-within` / reduced motion.
- Contact form: build the markup and states per the handoff. The backend is still undecided (see Plan 3 §2) — wire it to `/api/contact` and leave that route to Plan 3.

- [ ] Build, commit per section group.

---

## Task 6: Work case study and Knowledge index

**Files:** Rewrite `src/pages/work/[slug].astro`, `src/pages/knowledge.astro`

- [ ] **Work case study** — one dynamic route over the `work` collection. Sticky brief column left (`position: sticky; top: 104px`, `max-width: 44ch`), image column right. Brief fields come from the entry's `span_3` meta, images from its `span_9` media, both through `RichText.astro`. Bottom bar with previous project and "All projects".

- [ ] **Knowledge index** — cards with generated gradient covers cycling the 6-value palette by index, **no dates** (removed at the client's request). Titles and excerpts from `title` and `seo.description`; hrefs are each entry's `path`, which is **root-level** (`/advertising-is-for-profits/`), not nested under `/knowledge/`. All 9 posts, newest first by `pubDate`.

- [ ] Build, commit.

---

## Task 7: Remaining 7 pages

**Files:** `src/pages/[...slug].astro`

About, Capabilities, Process, Results, Contact, Privacy, Terms plus the 9 knowledge posts share the root catch-all. The handoff does not design these, so apply its system: dark canvas, the section-heading scale, `.prose` on the dark theme, ambient washes used sparingly, hairline rules. Keep the knowledge-post sidebar (`span_9` + `span_3`).

Legal pages (Privacy, Terms) are long-form text — give them a comfortable measure and no ambient washes.

- [ ] Build, commit.

---

## Task 8: GSAP motion island

**Files:** Create `src/components/Motion.astro`

```bash
npm install gsap
```

One island, `client:visible`, implementing the handoff's motion inventory: hero and iMac parallax (scrubbed), `[data-reveal]` fades, work-tile stagger, process-card stagger, process-rail progress, stat counters.

Both traps the handoff records, which it hit while building:
1. **Never bind a scrubbed tween to a DOM node captured once** — use `ScrollTrigger.create({ onUpdate })` re-querying the live element each tick. View transitions reintroduce this hazard.
2. **Call `ScrollTrigger.refresh()` after any DOM swap**, on the next frame *and* again a few hundred ms later once images settle.

Plus the safety net it specifies: a 2.6s timeout force-reveals every `[data-reveal]` and backfills any counter still reading `0`. Fallback chain GSAP → `IntersectionObserver` → immediate. **Content must never be motion-dependent.**

- [ ] Verify the GSAP chunk is a separate lazy chunk, not in the initial payload. Commit.

---

## Task 9: Verification

- [ ] `npx vitest run` — all pass, including `tests/routes.test.mjs` URL parity
- [ ] `npx astro build` — 40 pages
- [ ] `npm run fidelity` — expect **copy deltas to be reported and ignored**; this sweep compares against the old WordPress site and the design has intentionally changed. What still matters: no page loses content, and no internal link breaks.
- [ ] No `@assets/media/` sentinels in `dist/`
- [ ] No stale address in `dist/`
- [ ] Playwright at **1440px and 390px** — the mobile pass owed since Plan 3
- [ ] Initial JS payload measured, with the GSAP chunk confirmed lazy

---

## Task 10: Cloudflare Workers Builds

- [ ] **Step 1: Make sure the repo builds from a clean checkout**

`npm ci && npm run build` in a temp clone. Anything only present locally breaks CI.

- [ ] **Step 2: Report the dashboard steps to the client**

Connecting the GitHub repo is an OAuth authorization that cannot be done from here. Give them: Workers & Pages → the `ruckuscreative` Worker → Settings → Builds → Connect → pick `lcreative777/ruckus-creative`, branch `main`, build command `npm run build`, deploy command `npx wrangler deploy`.

- [ ] **Step 3:** Once connected, confirm a push to `main` triggers a build and the deployment lands.

---

## Definition of done

- [ ] All 39 URLs build and return 200; 11 redirects intact
- [ ] Copy verbatim — no rewording anywhere, source typos preserved
- [ ] Hero: Mux autoplay, silent, looping, no controls, working sound button
- [ ] Testimonials auto-advance and pause correctly
- [ ] GSAP lazy-loaded; content visible with motion disabled
- [ ] Checked at 1440px and 390px
- [ ] Workers Builds deploying from `main`
