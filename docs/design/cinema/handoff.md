# Handoff: Ruckus Creative — "Cinema" homepage, case study & knowledge index

## Overview

An elevated redesign of the Ruckus Creative homepage plus two secondary page templates
(a work case study, and the knowledge/white-paper index), intended to land in the existing
Astro + Cloudflare Workers rebuild at `lcreative777/ruckus-creative`.

The mandate was a **faithful redesign, not a rewrite**: every word of copy, the section
order, and all 20 work links come verbatim from the repo's content collections. Nothing
was reworded, summarized, or invented. The craft work is in typography, gradient light,
layout, and motion.

Direction name: **Cinema** — cinematic full-bleed video hero, warm charcoal surfaces,
ambient red→blue gradient washes, thin/light Lato display type against heavy italic
accents, flush work grid, horizontally-scrubbed process rail.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show
intended look and behavior. They are **not production code to copy directly**.

`Ruckus Cinema.dc.html` is a single-file streaming prototype: markup with inline styles
plus one JavaScript class holding data and motion setup. It renders three "views" through
client state so the whole flow is reviewable in one file. **That is a prototyping
convenience, not the intended architecture.**

The task is to **recreate these designs inside the existing Astro codebase** using its
established patterns: `.astro` components, content collections (`src/content/{pages,work,knowledge}`),
`astro:assets` for images, the `@assets/media/` sentinel + `src/lib/images.ts` resolution
already in place, and real routed pages (`/`, `/work/<slug>/`, `/knowledge/`) rather than
client-side view switching. URLs in that repo are load-bearing — `trailingSlash: 'always'`
and `build.format: 'directory'` must keep every path exactly as it is today.

## Fidelity

**High-fidelity.** Colors, typography, spacing, gradients, motion timings, and easing are
final and should be reproduced closely. Exact values are in *Design Tokens* below. Copy is
final and must not be edited — it is the migrated WordPress content.

Two areas are deliberately provisional:
- Knowledge cards use **generated gradient covers** because no post in the collection has a
  featured image. If real imagery arrives, swap the cover element for a `<picture>`.
- Non-Heineken work tiles route to the case template with scaffold text in the brief column
  (`"Body content for this project lives in src/content/work/<slug>.md…"`). Each work entry's
  real body should be rendered there through the existing `RichText.astro`.

---

## Screens / Views

### 1. Homepage (`/`)

Fixed header on every view. Sections in this exact order, matching `src/content/pages/home.md`:

#### Header (fixed)
- Full-width bar, `padding: 18px clamp(20px,4vw,56px)`, `background: rgba(18,17,16,.72)`,
  `backdrop-filter: blur(14px)`, `border-bottom: 1px solid rgba(255,255,255,.08)`, `z-index: 50`.
- Left: `ruckus_logo_light.png`, **height 55px**, width auto.
- Right: nav links — Home, Intro, Work, About, Services, Knowledge — Lato 700, 11px,
  `letter-spacing: .2em`, uppercase, `color: rgba(255,255,255,.72)`, hover `#fff`.
  Home/Intro/Work/About/Services target homepage anchors (`#home`, `#intro`, `#work`,
  `#about`, `#services`) exactly as `src/data/site.ts` declares; Knowledge → `/knowledge/`.
- Far right: "Start a Ruckus" pill → `#contact`. `padding: 11px 20px`, `border-radius: 999px`,
  `background: linear-gradient(120deg,#b81e04,#2949e8)`, white text.
- Anchor scrolling offsets by 70px to clear the fixed bar.

#### Hero (`#home`)
- `min-height: 100vh`, content bottom-aligned, `overflow: hidden`.
- Background: `ruckus_vid-1.jpg` (the ink-splatter still — **not** `mux-hero-poster.jpg`,
  which is a near-flat grey frame), `inset: -6% 0`, `height: 112%`, `object-fit: cover`.
  This oversize is what the parallax translates within.
- Three stacked overlays, in order:
  1. `linear-gradient(180deg, rgba(18,17,16,.78) 0%, rgba(18,17,16,.22) 42%, rgba(18,17,16,.97) 100%)`
  2. `radial-gradient(90% 70% at 78% 18%, rgba(184,30,4,.34), transparent 62%),
      radial-gradient(70% 60% at 12% 82%, rgba(41,73,232,.26), transparent 64%)`
  3. SVG `feTurbulence` grain, `opacity: .14`, `mix-blend-mode: overlay`, 140×140 tile.
- Eyebrow: 34px rule + "Full-service creative agency since 1993", Lato 700, 11px,
  `letter-spacing: .26em`, uppercase, `#f6653c`. (1993 is `site.founded`.)
- H1, two block lines, `font-family: Lato`, `font-weight: 100`,
  `font-size: clamp(40px,6.4vw,104px)`, `line-height: .98`, `letter-spacing: -.035em`:
  - Line 1 "Business results through" — white.
  - Line 2 "strategic creative" — Lato 900 italic, gradient text fill
    `linear-gradient(100deg,#fff 6%,#ffd9cb 26%,#ff8f6d 44%,#ffffff 56%,#8fa4ff 78%,#7d8dff 96%)`
    with `background-size: 260% 100%`, `-webkit-background-clip: text`,
    `-webkit-text-fill-color: transparent`. **Requires `padding-bottom: .16em` and
    `line-height: 1.06`** — without them the italic descender on the "g" is clipped by the
    background-clip box.
  - The full H1 string is the page's own `<title>` / SEO title, so it is existing copy.
- Play control: circle, `clamp(88px,9vw,116px)` square, `border-radius: 50%`,
  `border: 1px solid rgba(255,255,255,.5)`, `background: rgba(255,255,255,.08)`,
  `backdrop-filter: blur(8px)`; hover → `background/border #b81e04`, `transform: scale(1.06)`.
  Inner CSS triangle (`border-left: 20px solid currentColor`). A second absolutely-positioned
  ring runs the `rk-pulse` keyframe, 2.8s ease-out infinite.
- Scroll cue: "↓ Scroll", Lato 700, 10px, `letter-spacing: .24em`, `rk-scrollcue` 2.2s infinite.

**Video behavior.** Poster-first facade. Click → full-bleed 16:9 iframe at
`https://www.youtube-nocookie.com/embed/NgliiMV4jzE?autoplay=1&rel=0` with a "Close" pill
top-right (88px from top so it clears the header). `NgliiMV4jzE` is the exact asset the
original hero's play button links to. **In the Astro build, keep the existing Mux player
behind the same facade** — autoplay with audio on click is the confirmed desired behavior;
the YouTube embed here is only a stand-in because the Mux asset isn't available in a
static prototype.

#### Intro (`#intro`)
- Two columns, `grid-template-columns: repeat(auto-fit,minmax(340px,1fr))`, `background: #161514`.
- Left, `padding: clamp(64px,9vw,132px) clamp(24px,5vw,72px)`:
  - Lead: Raleway 200, `clamp(24px,2.7vw,38px)`, `line-height: 1.3`, white; the
    "BUSINESS RESULTS THROUGH STRATEGIC CREATIVE:" prefix is Lato 900 at `clamp(21px,2.2vw,31px)`.
  - Body paragraph, `max-width: 52ch`, `line-height: 1.9`.
  - "Learn More" → `#about`: pill outline button, `padding: 16px 32px`,
    `border: 1px solid rgba(255,255,255,.35)`, hover fills `#f6653c`. Trailing CSS caret
    (rotated 45° border box) stands in for Salient's `icon-button-arrow`.
- Right: `imac.jpg`, `object-position: left center`, `inset: -8% 0`, `height: 116%`,
  `data-parallax="18"`, plus `linear-gradient(90deg, rgba(22,21,20,.92), rgba(22,21,20,.1) 46%, transparent)`.

#### Pillars (3-up)
- `grid-template-columns: repeat(auto-fit,minmax(280px,1fr))`, `gap: 1px` on a
  `rgba(255,255,255,.08)` background — the gap *is* the hairline rule.
- Each cell `background: #121110`, `padding: clamp(40px,4vw,64px) clamp(28px,3.4vw,52px)`,
  **`align-items: center; text-align: center`**, `gap: 16px`, body `max-width: 36ch`.
- Icon 38px, tinted with
  `filter: invert(58%) sepia(74%) saturate(2600%) hue-rotate(343deg) brightness(97%)` → reads `#f6653c`.
- Title Lato 900, 17px, `letter-spacing: .05em`, uppercase, white.
- Content: We Drive Growth / We're Creative Opportunist / We're Focused on Success, with the
  exact body copy from `home.md`.

#### "Our job" statement band
- `background: #0f0e0d` plus
  `radial-gradient(85% 130% at 8% 50%, rgba(184,30,4,.5), transparent 60%),
   radial-gradient(85% 130% at 95% 50%, rgba(41,73,232,.42), transparent 62%)`.
- Statement: Raleway 200, `clamp(23px,2.6vw,36px)`, `line-height: 1.35`, white, spanning 2 columns.
- "Learn More" → `#about`, dark pill `#121110`, hover inverts to white on dark.

#### Work grid (`#work`)
- Header row: "Selected *work*" — Lato 100 at `clamp(32px,4.6vw,66px)` with "work" in Lato 900
  italic; right-side meta "20 projects · every link live".
- Grid: `repeat(auto-fit, minmax(min(100%,340px), 1fr))`, **`gap: 0`** — tiles are flush,
  as the original Isotope grid read.
- Tile: `aspect-ratio: 1/1`, `background: #1b1a18`, whole tile is the anchor to `/work/<slug>/`.
  - Image: `object-fit: cover`, at rest `filter: saturate(.3) brightness(.72)`.
  - Hover: `transform: scale(1.07)` over `1s cubic-bezier(.2,.7,.2,1)`, filter → `none`
    (`.6s ease`).
  - Caption overlay: bottom-aligned, `padding: 22px`,
    `background: linear-gradient(180deg, rgba(18,17,16,0) 38%, rgba(18,17,16,.92) 100%)`,
    `opacity: 0 → 1` over `.45s`. Title Lato 900, 14px, `letter-spacing: .06em`, uppercase;
    below it "View case study →" Lato 700, 10px, `letter-spacing: .2em`, `#f6653c`.
- **All 20 projects, in this order** (slug → title → thumbnail):
  1. `us-pool-tile` — US POOL TILE — `thumbnails-portfolio-uspool.jpg`
  2. `touchpoint-marketing` — TOUCHPOINT MARKETING — `thumbnails-portfolio-TPM.jpg`
  3. `tecate-cervesa` — TECATE CERVESA — `thumbnails-portfolio-tecate.jpg`
  4. `surf-rx` — SURF RX — `thumbnails-portfolio-surfrx.jpg`
  5. `sophia-redpeg-marketing` — SOPHIA / REDPEG MARKETING — `thumbnails-portfolio-sophia.jpg`
  6. `qai-laboratories` — QAI Laboratories — `thumbnails-portfolio-qai.jpg`
  7. `national-planning-corp` — NATIONAL PLANNING CORP. — `thumbnails-portfolio-NPC.jpg`
  8. `metrex-research` — METREX RESEARCH — `thumbnails-portfolio-metrex.jpg`
  9. `kirin-brewery` — KIRIN BREWERY — `thumbnails-portfolio-kirin.jpg`
  10. `future-fins` — FUTURE FINS — `thumbnails-portfolio-futurefins.jpg`
  11. `fnic` — FNIC — `thumbnails-portfolio-fnic.jpg`
  12. `dual-graphics` — DUAL GRAPHICS — `thumbnails-portfolio-dual-graphics.jpg`
  13. `dos-equis` — DOS EQUIS — `thumbnails-portfolio-xx.jpg`
  14. `aqua-flo` — AQUA-FLO — `thumbnails-portfolio-aquaflo.jpg`
  15. `mayweather-the-best-ever-book` — MAYWEATHER "THE BEST EVER" BOOK — `thumbnails-portfolio-mayweather.jpg`
  16. `universal-pool-tile` — UNIVERSAL POOL TILE — `thumbnails-portfolio-uni-pool.jpg`
  17. `the-rms-group` — THE RMS GROUP — `thumbnails-portfolio-rms.jpg`
  18. `jwc-environmental` — JWC ENVIRONMENTAL — `thumbnails-portfolio-jwc.jpg`
  19. `colorgraphics` — COLORGRAPHICS — `portfolio-colorgraphics-900x604.jpg`
  20. `heineken` — Heineken — `thumbnails-portfolio-hkn.jpg`

  Titles are verbatim from `home.md`, including the trailing period on "NATIONAL PLANNING CORP."
  and the mixed casing of "QAI Laboratories" / "Heineken". In Astro, drive this from the
  `work` collection rather than a hardcoded array.

#### Brand Alignment Process™ (`#about`)
- `background: #161514` + `radial-gradient(60% 55% at 88% 12%, rgba(41,73,232,.3), transparent 65%),
  radial-gradient(55% 50% at 6% 90%, rgba(184,30,4,.26), transparent 62%)`.
- Heading: Lato 900 **italic**, `clamp(28px,4.2vw,60px)`, uppercase, `letter-spacing: -.025em`.
  The trademark symbol is part of the string. Right meta: "Five stages".
- Horizontal rail: `display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory`,
  scrollbar hidden, `padding-inline: clamp(24px,5vw,72px)`.
- Card: `flex: 0 0 clamp(280px,26vw,380px)`, `scroll-snap-align: start`,
  `background: rgba(27,26,24,.86)`, `border: 1px solid rgba(255,255,255,.09)`,
  `padding: clamp(26px,2.6vw,36px)`, `min-height: 330px`.
  Hover: border → `rgba(246,101,60,.65)`, `translateY(-6px)` over `.5s cubic-bezier(.2,.7,.2,1)`.
  Contents: 36px tinted icon, step number (Lato 700, 11px, `.24em`, `#f6653c`), title
  (Lato 900, 19px, uppercase), body (14px, `line-height: 1.85`).
- Progress rail beneath: 2px track `rgba(255,255,255,.12)` with a
  `linear-gradient(90deg,#b81e04,#2949e8)` fill that maps `scrollLeft / (scrollWidth - clientWidth)`
  to `width: 12% → 100%`.
- Five steps, headings and bodies verbatim (the "(+)" suffixes are in the source):
  FOUNDATION: (+) · VALIDATION: (+) · INNOVATION: (+) · IMPLEMENTATION: (+) · EVALUATION: (+).

#### Why Us
- Two columns, `gap: clamp(32px,5vw,64px)`.
- Left: "Why Us?" label (Lato 900, 11px, `.26em`, `#f6653c`) + the long H2, Raleway 200,
  `clamp(24px,2.7vw,38px)`. The second sentence is nested at `font-size: .6em` in `#a8a29a`
  — this reproduces the `<span class="smtext">` in the source.
- Right: `background: #020202`, `padding: clamp(30px,3.4vw,48px)`, with a 2px
  `linear-gradient(180deg,#b81e04,#2949e8)` left edge. Two paragraphs, then the
  "View The Goods" italic link → `#work` (source links to `/#work`).

#### Stats (3-up)
- `gap: 1px` over `rgba(255,255,255,.08)`.
- Cell 1: `linear-gradient(140deg,#2949e8,#1b2f9e)` — **2,460** / "Pixels Pushed".
- Cell 2: `linear-gradient(140deg,rgba(60,88,232,.93),#b81e04)` — **2,000** / "Projects Completed".
- Cell 3: `#1b1a18` — "Share" + Facebook / X / LinkedIn / Pinterest.
- Numbers: Lato 900, `clamp(40px,4.6vw,64px)`. Labels: Lato 700, 11px, `.22em`, uppercase.
- **Important:** render the final formatted numbers (`2,460`, `2,000`) as the authored text.
  The count-up animation zeroes and re-counts only when its scroll trigger fires, so a
  failed or stale trigger degrades to "number shown, no animation" rather than a visible `0`.
  Values come from `home.md`; the original used anime.js for the same effect.

#### Testimonials (`#services`)
- `background: #161514` + `radial-gradient(70% 60% at 20% 20%, rgba(184,30,4,.3), transparent 62%),
  radial-gradient(70% 60% at 85% 80%, rgba(41,73,232,.3), transparent 64%)`.
  (The current Astro build uses a hard `linear-gradient(45deg,#b81e04,#2949e8)` here; this
  softens it to ambient washes.)
- Rail: `overflow-x: auto`, `scroll-snap-type: x mandatory`, each `blockquote`
  `flex: 0 0 100%`, `scroll-snap-align: center`, `padding-inline: clamp(24px,7vw,110px)`.
- Quote: Raleway 200, `clamp(22px,2.7vw,38px)`, `line-height: 1.42`, white, `text-wrap: pretty`.
  Name: Lato 900, 12px, `.2em`, uppercase, `#f6653c`. Role: 13px, `#8d8983`.
- Dot nav below, injected in script: 9px circles, `rgba(255,255,255,.38)`, active `#fff` +
  `scale(1.3)`, `aria-current="true"` on the active dot, click scrolls its slide into view
  with `behavior: 'smooth'`. Mirrors `.testimonial-dots` already in `base.css`.
- All 8 quotes, verbatim, in source order (Lynn Ranzan, Craig Evans, Kim West, Vince Longo,
  Chris Bowness, Jeff "Doc" Lausch, Bob Hirschman, Edward Baker). Note the source's own
  inconsistencies are preserved: some names carry a leading en dash, some quotes lack a
  closing curly quote, "beginning to worth with them" is as-written.

#### Capabilities
- Heading "Capabilities", Lato 100, `clamp(32px,4.6vw,66px)`.
- **Six icon blocks**, `repeat(auto-fit,minmax(280px,1fr))`, `gap: 1px` hairlines,
  cell `#121110` → hover `#1a1917` over `.4s`.
- Each: 36px tinted icon, title Lato 900 18px uppercase, then items as "– item" lines at
  14px / `line-height: 1.7` in a `gap: 6px` flex column (the source used `<br>`-separated
  dashed lists).
- Exact groups and items: Online (Websites, Mobile sites, Mircrosites, MP3 download sites,
  Sweeps Entry sites) · Online Marketing (Social Media set up and implement, SEO,
  SEM & Advertising) · Print (Advertising campaigns, Corporate brochures, Service brochures,
  Sales Kits, Direct marketing / mail, Photography) · Presentations (Video, Custom PPT /
  Keynote presentations) · Brand Development (Brand strategy / positioning, Naming – product /
  service, Research – Voice of customer) · Event Marketing (Promotional products, Simplified
  registration, Engagement campaigns, Contests).
  "Mircrosites" is a typo in the source content — left as-is deliberately.

#### CTA
- `background: #1a1a1a` + `radial-gradient(70% 130% at 50% 0%, rgba(184,30,4,.48), transparent 62%),
  radial-gradient(60% 110% at 50% 110%, rgba(41,73,232,.34), transparent 60%)`, centered.
- H1 "Get ready to stand out", Lato 900, `clamp(34px,5.6vw,80px)`, uppercase, `letter-spacing: -.035em`.
- Sub: Raleway 300 italic, `clamp(15px,1.4vw,20px)` — "We are here for you and ready to rock
  at any time: 714-514-1482."

#### Contact (`#contact`)
- `seasm.jpg` background with `linear-gradient(90deg, rgba(18,17,16,.97), rgba(18,17,16,.82))`.
- Left column: "Ruckus Creative, llc" (Lato 900, 20px, uppercase — lowercase "llc" is
  from source), phone as `tel:+17145141482` link in `#f6653c` at `clamp(24px,2.4vw,32px)`,
  address `27525 Puerta Real, Suite 300-173 / Mission Viejo, CA 92691`, the "always
  available" paragraph with its bold lead sentence, and `info@ruckuscreative.com`.
  **All identity values must come from `src/data/site.ts`** — the live WordPress site renders
  three different suite numbers and only `300-173` is correct.
- Right column: contact form, `background: rgba(27,26,24,.82)`,
  `border: 1px solid rgba(255,255,255,.1)`, `backdrop-filter: blur(10px)`,
  `padding: clamp(26px,3vw,42px)`, `gap: 18px`.
  - Label style: Lato 700, 11px, `.16em`, uppercase, `rgba(255,255,255,.6)`.
  - Inputs: `background: rgba(255,255,255,.04)`, `border: 1px solid rgba(255,255,255,.16)`,
    `padding: 14px 16px`, Open Sans 15px, white text. Fields: Name (required),
    Email (required, `type="email"`), Phone (`type="tel"`), Message (`textarea`, 4 rows).
  - Submit: gradient pill `linear-gradient(120deg,#b81e04,#2949e8)`, "Send it" + caret,
    hover `filter: brightness(1.15)`.
  - Success state replaces the form: "Message sent" + "We will get back with you immediately."
    (that sentence is from the source contact copy) + "Send another" outline button.
  - Wire to the repo's existing on-demand contact route; the prototype only fakes success.

#### Footer (all views)
- `background: #0f0e0d`, `border-top: 1px solid rgba(255,255,255,.09)`.
- Left: `ruckus_logo_light.png` at **height 30px**, `opacity: .85`, + "© Ruckus Creative, LLC".
- Right: Results, Portfolio, Capabilities, Process, About (the `sidebarLinks` from
  `site.ts`) plus Privacy Policy and Terms and Conditions (`legalLinks`). Lato 700, 11px,
  `.18em`, uppercase, `#8d8983` → `#fff` on hover.

---

### 2. Work case study (`/work/<slug>/`) — built out for Heineken

- Page top padding 76px to clear the fixed header.
- "← Back to all projects" → `/#work`, Lato 700, 11px, `.22em`, `#8d8983` → `#fff`.
- H1 = project title, Lato 100, `clamp(34px,5.4vw,78px)`, `letter-spacing: -.035em`.
- Body: two columns, `repeat(auto-fit,minmax(300px,1fr))`, `gap: clamp(32px,4vw,64px)`,
  `align-items: start`.
  - **Left: sticky brief**, `position: sticky; top: 104px`, `max-width: 44ch`. One block per
    field: label (Lato 900, 10px, `.26em`, uppercase, `#f6653c`) over value (`line-height: 1.85`,
    `#e4e0da`), each separated by `border-bottom: 1px solid rgba(255,255,255,.1)` and 20px padding.
    Then a gradient "Start a project" pill → `#contact`.
  - **Right: image column**, `gap: clamp(18px,2.4vw,32px)`, each figure `background: #1b1a18`,
    image `width: 100%`, scroll-revealed.
- Bottom bar: `border-top`, "← Previous Project — <title>" on the left, "All projects" right.
- Heineken content, verbatim from `src/content/work/heineken.md`:
  - CLIENT: `Heineken USA – Premium Imported Beverages`
  - RESULTS: `50%+ reduction in costs and timelines compared to agency-of-record.`
  - Elements produced include: `Advertising campaigns, POS, sweeps entry sites, mobile MP3
    ringtone download sites, text2win campaigns, event photography, videography.`
  - Images: `portfolio-heineken.jpg` (1920×907), `thumbnails-portfolio-hkn.jpg`.
  - Previous Project → `/work/colorgraphics/` (as the source's `bottom_controls` declares).
- In Astro this is one dynamic route over the `work` collection; the brief column should be
  the entry's `span_3` meta rendered through `RichText.astro`, and the image column its
  `span_9` media.

### 3. Knowledge index (`/knowledge/`)

- Intro block with ambient washes
  (`radial-gradient(60% 90% at 88% 10%, rgba(41,73,232,.28), transparent 62%),
  radial-gradient(55% 80% at 4% 90%, rgba(184,30,4,.26), transparent 60%)`).
- H1: "KNOWLEDGE BASE: *Tips, Tricks, White Papers and Free Advice*" — Lato 100 with the
  second half Lato 900 italic, `clamp(30px,4.4vw,62px)`. Intro paragraph verbatim from
  `src/content/pages/knowledge.md`, `max-width: 70ch`.
- Cards: `repeat(auto-fit,minmax(310px,1fr))`, `gap: clamp(18px,2.2vw,28px)`,
  `background: #161514`, `border: 1px solid rgba(255,255,255,.09)`.
  Hover: border `rgba(246,101,60,.6)`, `translateY(-5px)` over `.5s cubic-bezier(.2,.7,.2,1)`.
  - Cover: 150px tall, gradient from a 6-value rotating palette, with a "White Paper" label
    (Lato 900, 10px, `.26em`, `rgba(255,255,255,.85)`) bottom-left.
  - Body: `padding: 26px`, `gap: 12px` — title (Lato 900, 19px, `line-height: 1.25`, white),
    excerpt (14px, `line-height: 1.8`, `#a8a29a`), "Read →" (Lato 700, 10px, `.22em`, `#8d8983`).
  - **No dates** — removed at the client's request. Titles and excerpts are the collection's
    `title` and `seo.description`; hrefs are each entry's `path` (root-level, e.g.
    `/advertising-is-for-profits/`, not nested under `/knowledge/`).
  - Cover gradients: `#b81e04→#2949e8`, `#2949e8→#0f0e0d`, `#f6653c→#b81e04`,
    `#1b2f9e→#b81e04`, `#b81e04→#1a1a1a`, `#2949e8→#f6653c` — all `135deg`, cycled by index.
- All 9 posts, ordered newest-first by `pubDate`.

---

## Interactions & Behavior

### Motion inventory

| Element | Effect | Timing |
|---|---|---|
| Hero eyebrow | fade + 16px rise | .8s `power3.out`, delay .15s |
| Hero headline lines | fade + 40% y-rise, staggered | 1.1s `power4.out`, stagger .12s, delay .25s |
| "strategic creative" | gradient wash sweeps L→R | `rk-wash` 7s `cubic-bezier(.36,.7,.25,1)`, **1.5s delay**, infinite (sweep occupies first 42%, then holds) |
| Hero image | parallax to `translateY(10%)` | scrubbed, hero top→bottom |
| iMac image | parallax ±18% | scrubbed across viewport |
| Section elements (`[data-reveal]`) | fade + 22px rise | .9s `power3.out`, trigger `top 88%`, once |
| Work tiles | fade + 34px rise, staggered | .8s `power3.out`, stagger .045s, once |
| Work tile hover | `scale(1.07)` + desaturate→full color | 1s / .6s `cubic-bezier(.2,.7,.2,1)` |
| Process cards | fade + 30px rise, staggered | .8s, stagger .08s, once |
| Process rail | progress bar tracks `scrollLeft` | continuous |
| Stat counters | count 0→target | 1.8s `power2.out`, once |
| Play button ring | pulse | 2.8s ease-out infinite |
| Scroll cue | 7px bob | 2.2s ease-in-out infinite |

### Two implementation traps found while building this

1. **Never bind a scrubbed tween to a DOM node captured once.** The hero and iMac parallax
   originally used `gsap.to(element, {scrollTrigger})`; when the framework replaced those
   nodes on a later render, the tweens kept animating detached elements and the visible
   image never moved. The fix is `ScrollTrigger.create({ onUpdate })` re-querying the live
   element each tick. In Astro with real routed pages and `client:visible` islands this is
   less likely, but view transitions reintroduce exactly this hazard.
2. **Call `ScrollTrigger.refresh()` after any DOM swap**, on the next frame *and* again a few
   hundred ms later once images have settled — otherwise triggers cache stale start/end
   offsets and silently never fire.

### Accessibility

- `prefers-reduced-motion: reduce` short-circuits all motion; every element renders in its
  final state immediately. `base.css` already clamps animation/transition durations globally.
- A safety timeout force-reveals all `[data-reveal]` elements after 2.6s and backfills any
  counter still reading `0` — no content can be permanently hidden by a motion failure.
- Fallback chain: GSAP → `IntersectionObserver` → immediate reveal. Content is never
  motion-dependent.
- Focus-visible outlines come from `base.css` (`2px solid var(--color-accent)`, 2px offset).
- Dot nav uses real `<button>` elements with `aria-label` and `aria-current`.
- Rails are native `overflow-x` scroll containers, so keyboard and touch work without script.

### Responsive

- Every multi-column section uses `repeat(auto-fit, minmax(<floor>, 1fr))` and collapses on
  its own; there are no width media queries. Floors: pillars/capabilities 280px, intro 340px,
  work tiles `min(100%,340px)`, case study 300px, knowledge 310px.
- All type is fluid via `clamp()`; header padding and section padding likewise.
- The work-tile floor uses `min(100%, 340px)` so a 340px minimum can't overflow a narrow
  viewport.

## State Management

The prototype holds four pieces of client state. In Astro, only the last two remain client-side:

| State | Purpose | In Astro |
|---|---|---|
| `view` (`home`/`case`/`knowledge`) | prototype view switching | **Drop** — use real routes |
| `slug` | which case study | **Drop** — dynamic route param |
| `videoPlaying` | poster facade vs. player | Keep — small island on the hero |
| `formSent` | form vs. success state | Keep — or server-render the response |

No data fetching. All content comes from the collections at build time.

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| Ink red | `#b81e04` | primary brand accent, gradient start |
| Flame | `#f6653c` | interactive accent, icon tint, labels |
| Signal blue | `#2949e8` | gradient end, stat band |
| Deep blue | `#1b2f9e` | gradient shade |
| Blue 93% | `rgba(60,88,232,.93)` | stat band 2 |
| Canvas | `#121110` | page background |
| Surface raised | `#161514` | alternating sections |
| Surface card | `#1b1a18` / `rgba(27,26,24,.86)` | cards, rails |
| Surface deep | `#020202` | Why Us panel |
| Footer | `#0f0e0d` | footer, statement band |
| CTA base | `#1a1a1a` | CTA section |
| Text body | `#a8a29a` | default copy |
| Text muted | `#8d8983` | meta, roles |
| Text dim | `#6e6a63` | section meta |
| Text bright | `#e4e0da` | brief values |
| White | `#ffffff` | headings |
| Hairline | `rgba(255,255,255,.08)` – `.12` | grid gaps, borders |

Original brand values retained from `tokens.css`: `#b81e04`, `#f6653c`, `#2949e8`,
plus `#333`/`#444`/`#020202` band colors from the source markup.

### Gradients
- Brand ramp (buttons, progress, edges): `linear-gradient(120deg,#b81e04,#2949e8)` /
  `linear-gradient(90deg,#b81e04,#2949e8)` / `linear-gradient(180deg,#b81e04,#2949e8)`.
- Ambient washes: paired radial gradients, red at `.26–.5` alpha and blue at `.26–.42`,
  placed at opposing corners. **Ambient only** — gradients never sit on type or surfaces
  except the brand-ramp pills and the one gradient headline word.
- Headline wash: `linear-gradient(100deg,#fff 6%,#ffd9cb 26%,#ff8f6d 44%,#ffffff 56%,#8fa4ff 78%,#7d8dff 96%)`
  at `background-size: 260% 100%`, animated by `background-position`.

### Typography
- **Lato** — display. Weights 100 (large light headings), 300, 700 (meta/labels),
  900 (italic accents, titles). Google Fonts.
- **Raleway** — editorial lead paragraphs and quotes. Weights 200, 300 (italic).
- **Open Sans** — body copy, form fields. 400/600/700.
- All three are the fonts already declared in `src/styles/tokens.css`
  (`--font-display`, `--font-alt`, `--font-body`) — no new families introduced.

| Role | Spec |
|---|---|
| Hero H1 | Lato 100, `clamp(40px,6.4vw,104px)`, `lh .98`, `ls -.035em` |
| Section H2 | Lato 100, `clamp(32px,4.6vw,66px)`, `lh 1`, `ls -.03em` |
| Process H2 | Lato 900 italic, `clamp(28px,4.2vw,60px)`, `ls -.025em`, uppercase |
| CTA H1 | Lato 900, `clamp(34px,5.6vw,80px)`, `ls -.035em`, uppercase |
| Editorial lead | Raleway 200, `clamp(24px,2.7vw,38px)`, `lh 1.3` |
| Quote | Raleway 200, `clamp(22px,2.7vw,38px)`, `lh 1.42` |
| Card title | Lato 900, 19px, `lh 1.25` |
| Block title | Lato 900, 17–18px, `ls .05em`, uppercase |
| Body | Open Sans 400, 15px, `lh 1.8–1.9` |
| Small body | Open Sans 400, 14px, `lh 1.85` |
| Label / meta | Lato 700, 10–11px, `ls .18–.26em`, uppercase |
| Step number | Lato 700, 11px, `ls .24em` |

Note: the current Astro build sets body copy at 14px/26px to match the WordPress original.
This redesign raises the default to 15px with a 1.8–1.9 line-height for readability; if strict
metric fidelity to the old site matters more, keep 14px and the rest of the system still holds.

### Spacing
Section padding `clamp(64px,8vw,110px)` to `clamp(84px,11vw,150px)` block,
`clamp(24px,5vw,72px)` inline. Card padding `clamp(26px,3vw,42px)`.
Stack gaps 6 / 12 / 16 / 18 / 20 / 22 / 28 / 30px. Grid gaps: `0` (work), `1px` (hairline
grids), `14–20px` (rails), `clamp(18px,2.2vw,28px)` (cards).

### Radius, borders, shadows
- Radius: `0` on nearly everything (square corners, per the original), `999px` on pills,
  `50%` on the play control, `2px` on knowledge cards.
- Borders: `1px solid rgba(255,255,255,.08–.5)`; 2–3px gradient accent edges.
- **No box-shadows anywhere.** Depth comes from gradient light and hairlines.

### Motion tokens
- Primary ease `cubic-bezier(.2,.7,.2,1)`; GSAP `power3.out` / `power4.out`; scrubs `ease: 'none'`.
- Durations: micro .25–.45s, reveals .8–1.1s, hover scale 1s, counters 1.8s.
- Reveal offset 22px; tile stagger .045s; card stagger .08s.

## Assets

All from the repo (`src/assets/`), already optimized through `astro:assets` there:

| File | Use |
|---|---|
| `chrome/ruckus_logo_light.png` | header (55px) + footer (30px) |
| `chrome/ruckus_logo_dark.png` | available for light contexts |
| `media/ruckus_vid-1.jpg` | hero background — the ink-splatter still |
| `media/mux-hero-poster.jpg` | **not used** — near-flat grey frame, reads as an empty box |
| `media/imac.jpg` | intro right half (pre-cropped to its right half) |
| `media/seasm.jpg` | contact background |
| `media/thumbnails-portfolio-*.jpg` (19) | work tiles |
| `media/portfolio-colorgraphics-900x604.jpg` | COLORGRAPHICS tile |
| `media/portfolio-heineken.jpg` | Heineken case study hero (1920×907) |

Icons — nine client-supplied SVGs (svgrepo) in `uploads/`, plus one drawn for this build:

| Icon | Used for |
|---|---|
| `chart-gear-svgrepo-com.svg` | We Drive Growth · EVALUATION · Online Marketing |
| `hvv-svgrepo-com.svg` | We're Creative Opportunist |
| `fast-svgrepo-com.svg` | We're Focused on Success · IMPLEMENTATION |
| `diamond-svgrepo-com.svg` | FOUNDATION |
| `mobile-device-svgrepo-com.svg` | VALIDATION · Online |
| `presentation-svgrepo-com.svg` | INNOVATION · Presentations |
| `atom-svgrepo-com.svg` | Brand Development |
| `event-svgrepo-com.svg` | Event Marketing |
| `print-svgrepo-com.svg` | superseded — was filled |
| `src/assets/icons/print-outline.svg` | **Print** — drawn for this build as a stroked outline (1.8 stroke, 32 viewBox) at the client's request |

All icons render as `<img>` tinted to flame with
`filter: invert(58%) sepia(74%) saturate(2600%) hue-rotate(343deg) brightness(97%)`.
Cleaner production approach: inline them as SVG sprites and set `fill`/`stroke: currentColor`.
`uploads/LCAD_board.svg` is unrelated — ignore it.

## Improvements over the current Astro build

Worth preserving in the port:
1. Hero uses the ink-splatter still, not the flat Mux poster frame, and gains parallax +
   a staggered headline reveal.
2. Work grid is flush 4-up with desaturate→color and scale on hover, and a scroll-staggered
   entrance; the current build has an opacity-only red overlay.
3. Process moves from a stacked list to a horizontal snap rail with a progress indicator.
4. Stat counters animate (the WordPress site did this with anime.js; here it's GSAP, no jQuery).
5. Testimonial dot nav is wired up and the quote type is much larger.
6. Icon-font substitutes replaced by real SVGs, tinted to the accent.
7. Contact gains the form beside the info block.
8. Ambient radial washes replace the hard 45° `linear-gradient` on the testimonial band.

## Recommended libraries

- **GSAP 3.12.5 + ScrollTrigger** (~40KB gz) for hero parallax and the process scrub only.
  Load per-island with `client:visible` so it never blocks first paint.
- Everything else — reveals, staggers, counters, hover states, rails, dots — is achievable
  with **`IntersectionObserver` + CSS transitions**, already implemented here as the fallback
  path. If Lighthouse budget is tight, ship only that path and drop GSAP; the design survives.
- No other dependencies. Grain and gradients are pure CSS; no jQuery, Isotope, Waypoints, or
  anime.js, consistent with the rebuild's goal of ~0 external scripts.

## Files

| File | What it is |
|---|---|
| `Ruckus Cinema.dc.html` | **The design of record** — homepage, Heineken case study, knowledge index |
| `Ruckus Homepage Directions.dc.html` | The three explored directions (1a Ink & Ledger, 1b Signal Red, 1c Cinema). Cinema was selected; kept for context on what was rejected |
| `support.js` | Runtime for the prototype format. Not part of the design; no need to port |
| `github.md` | Repo association and screen→source map |
| `src/assets/`, `uploads/` | Images and icons referenced above |

Open either `.dc.html` in a browser to interact with it. Read them for exact values rather
than eyeballing screenshots — every color, size, and timing above is in the markup.
