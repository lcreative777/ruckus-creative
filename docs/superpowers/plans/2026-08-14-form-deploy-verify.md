# Ruckus Astro Rebuild — Plan 3: Homepage Fidelity, Form, Deploy & Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the homepage to the fidelity bar the client set, restore the contact form on a backend that does not break their email, then verify and cut over.

**Architecture:** The homepage is measured against the live site section by section and corrected. The form posts to a single on-demand Worker route that verifies a Turnstile token server-side and hands off to a transactional email API — the only backend option that leaves the existing Google Workspace MX records untouched.

**Tech Stack:** Astro 7.2, `@astrojs/cloudflare` 14.2, Cloudflare Turnstile, a transactional email API (see Task 4), Vitest, Lighthouse.

**Spec:** `docs/superpowers/specs/2026-08-13-ruckus-astro-rebuild-design.md`
**Decisions:** `docs/superpowers/plans/2026-08-13-open-decisions.md`
**Prior plans:** Plan 1 (migration) and Plan 2 (site build), both complete.

**Working directory:** `/Users/ericslarson/Sites/p-r/RuckusCreative/ruckus-astro`
**Branch:** create `feat/form-and-cutover` off `feat/site-build`.
**Preview:** https://ruckuscreative.ruckus-astro.workers.dev

---

## Where things stand

69 tests passing, 40 pages building, 39/39 URLs live on the preview, 11/11 redirects working, 0 bytes of external JavaScript. The fidelity sweep (`npm run fidelity`) reports 36/39 pages structurally clean; the 3 flagged are the two form pages (this plan) and the deliberately-rebuilt portfolio index.

**The client's stated priority is the homepage.** Four defects were found and fixed on it during Plan 2 review — the Isotope work grid stacking one item per row, 41 spurious flex wrappers, a duplicate `id="home"`, and raw video URLs rendering as text. It went from 19,717px to 8,074px tall. That history is the reason Task 1 exists: the homepage is the page most likely to still hold problems, and the structural sweep cannot see visual drift.

---

## Task 1: Homepage fidelity pass

The priority. Everything else in this plan is blocked behind it being right.

**Files:** likely `src/styles/base.css`, `src/pages/index.astro`, possibly `scripts/lib/html-to-content.mjs`

- [ ] **Step 1: Capture both homepages at matched viewports**

The browser pane in this environment reports `viewportWidth: 0` when collapsed and has repeatedly stalled on scroll. **Set an explicit viewport before measuring, and treat any measurement taken at width 0 as invalid.**

```bash
npx playwright install chromium   # if not already present
```

```javascript
// scripts/shoot.mjs — throwaway, do not commit
import { chromium } from 'playwright';
const [,, url, out, width] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +width, height: 1000 } });
await p.goto(url, { waitUntil: 'networkidle' });
await p.screenshot({ path: out, fullPage: true });
await b.close();
```

```bash
node scripts/shoot.mjs https://ruckuscreative.com/ /tmp/old-home-1440.png 1440
node scripts/shoot.mjs https://ruckuscreative.ruckus-astro.workers.dev/ /tmp/new-home-1440.png 1440
node scripts/shoot.mjs https://ruckuscreative.com/ /tmp/old-home-390.png 390
node scripts/shoot.mjs https://ruckuscreative.ruckus-astro.workers.dev/ /tmp/new-home-390.png 390
```

If Playwright cannot be installed, fall back to the MCP browser — but resize to an explicit width first and re-read `window.innerWidth` to confirm it took.

- [ ] **Step 2: Compare section by section and write down every difference**

The homepage sections, in order: `#home` (video hero), `#intro`, `#work` (the 20-item grid), `#about` (Brand Alignment Process™, then "Why Us?"), `#services`, `#contact`.

For each, compare: vertical rhythm, background colour, type size and weight, image cropping, and column counts. **Record findings as a list before changing anything** — this is a measuring task, not a fixing task.

Known-good measurements to check against, taken 2026-08-14:

| | Expected |
|---|---|
| Work grid | full-bleed, 4 columns ≥900px, 2 below |
| Page height @1440 | ~8,000px (was 19,717 when the grid was broken) |
| `.row` wrappers | 1 |
| `id="home"` | exactly 1 |
| Body type | 14px / 26px |

- [ ] **Step 3: Fix each difference, re-measuring after each**

Work one difference at a time and re-shoot after each. Batching changes makes it impossible to tell which one helped.

For anything driven by Salient JavaScript that has no CSS equivalent — parallax, scroll reveals, Isotope masonry sizing — **do not reimplement the JavaScript.** The spec's budget is under 10 KB of client JS and the site currently ships 537 bytes. Approximate with CSS or accept the difference, and record which you chose and why.

- [ ] **Step 4: Re-run the sweep and the suite**

```bash
npm run fidelity
npx vitest run
```

`/` is expected to stay flagged for `COPY -14%` until Task 5 restores the form. Any *new* flag is a regression.

- [ ] **Step 5: Report before committing**

Present the before/after screenshots and the list of differences found, fixed, and consciously accepted. **The client reviews this before the plan continues** — they have rejected the fidelity twice, so a self-assessment is not the gate.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: homepage fidelity pass against the live site"
```

---

## Task 2: Contact form backend — decision and setup

**This task is blocked on a client decision and cannot be guessed at.**

- [ ] **Step 1: Confirm the backend**

Cloudflare's native `send_email` binding is **ruled out**, verified 2026-08-14: Email Routing is unconfigured on the zone, and enabling it rewrites the MX records, which currently point at **Google Workspace** (`aspmx.l.google.com`). That would break all inbound mail for the domain. Do not enable it.

Recommended: **Resend**, called from the Worker. Free tier is 3,000 emails/month, sending happens on a subdomain (`send.ruckuscreative.com`), and the existing MX records are untouched. Postmark is an equivalent substitute.

Present the options and **wait for an explicit choice.** Alternatives are in `2026-08-13-open-decisions.md` §3.

- [ ] **Step 2: Once chosen, set up the account and domain**

The client creates the account and adds the sending subdomain. **They add the DNS records themselves** — the provider will ask for DKIM and SPF entries on `send.ruckuscreative.com`.

> These records must be added on the **subdomain only**. A change to the root domain's MX or SPF risks their Google Workspace mail. Do not add, edit, or delete DNS records on the client's behalf.

- [ ] **Step 3: Store the API key as a Worker secret**

```bash
npx wrangler secret put RESEND_API_KEY
```

Never commit the key. `.dev.vars` is gitignored for local development.

- [ ] **Step 4: Create the Turnstile widget**

In the Cloudflare dashboard for account `c0780521925c950ef323a873c907c291`, create a Turnstile widget for `ruckuscreative.com` and `ruckuscreative.ruckus-astro.workers.dev`. The site key is public and goes in `src/data/site.ts`; the secret key goes in a Worker secret:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

---

## Task 3: ContactForm component

**Files:** Create `src/components/ContactForm.astro`

- [ ] **Step 1: Build the form with the original's fields**

Preserve the Gravity Form's fields exactly: Name (first, last), Company, Title, **Email (required)**, Phone, Address, Questions or Comments, How did you hear about us?

Requirements:
- Native `<form method="post" action="/api/contact">`, so it works without JavaScript.
- Every input has a real `<label>`; no placeholder-as-label.
- `type="email"` on email, `type="tel"` on phone, `required` on email only — matching the original.
- The Turnstile widget renders via its own script tag, which is the one external script the site will carry. Load it `defer`.
- On submit with JS available, POST via `fetch` and render the response inline; without JS, the form posts normally and the route returns a server-rendered confirmation.

- [ ] **Step 2: Mount it on both pages**

The form appears on the homepage `#contact` section and on `/contact-ruckus-creative/`. The migrated bodies for both had the form stripped during Plan 1, so mount the component where it was: at the end of `#contact` on the homepage, and after the address block on the contact page.

- [ ] **Step 3: Commit**

```bash
git add src/components/ContactForm.astro src/pages
git commit -m "feat: add contact form with the original field set"
```

---

## Task 4: The `/api/contact` route

**Files:** Create `src/pages/api/contact.ts`; Test: `tests/contact-api.test.mjs`

- [ ] **Step 1: Write the failing test for validation and token verification**

Test the pure helpers rather than the whole handler — `validate(formData)` and `buildEmail(fields)` — so the suite stays offline.

```javascript
// tests/contact-api.test.mjs
import { describe, it, expect } from 'vitest';
import { validate, buildEmail } from '../src/pages/api/contact.ts';

describe('validate', () => {
  it('rejects a missing email', () => {
    expect(validate({ email: '' }).ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(validate({ email: 'not-an-email' }).ok).toBe(false);
  });

  it('accepts a submission with only the required field', () => {
    expect(validate({ email: 'a@b.com' }).ok).toBe(true);
  });

  it('trims and preserves the optional fields', () => {
    const r = validate({ email: 'a@b.com', company: '  Ruckus  ', phone: '714' });
    expect(r.fields.company).toBe('Ruckus');
    expect(r.fields.phone).toBe('714');
  });
});

describe('buildEmail', () => {
  it('puts every supplied field in the body', () => {
    const body = buildEmail({ email: 'a@b.com', company: 'Ruckus', comments: 'Hello' });
    expect(body).toContain('a@b.com');
    expect(body).toContain('Ruckus');
    expect(body).toContain('Hello');
  });

  it('omits empty fields rather than printing blank labels', () => {
    const body = buildEmail({ email: 'a@b.com', company: '' });
    expect(body).not.toMatch(/Company:\s*$/m);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/contact-api.test.mjs
```

- [ ] **Step 3: Write the route**

`export const prerender = false;` — this is the one on-demand route on an otherwise static site.

The handler must, in order:
1. Parse the form data.
2. `validate()` — return 400 on failure.
3. **Verify the Turnstile token server-side** by POSTing `secret` and `response` to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Never trust a client-side result. Return 400 if `success` is false.
4. Send via the chosen provider, using the API key from `env`.
5. Return JSON for the `fetch` path, or a redirect to a thank-you state for the no-JS path.

Handle a provider failure explicitly: log it and return 502 with a message telling the visitor to phone instead. **A silently swallowed send means a lost lead**, which is worse than a visible error.

- [ ] **Step 4: Run the tests, then commit**

```bash
npx vitest run
git add src/pages/api/contact.ts tests/contact-api.test.mjs
git commit -m "feat: add contact endpoint with server-side Turnstile verification"
```

---

## Task 5: Form verification end to end

Claims about a working form are worthless without a real delivered message.

- [ ] **Step 1: Deploy and submit a real message**

```bash
npx astro build && npx wrangler deploy
```

Submit the form on the preview URL with a real address. **Confirm the message arrives in the destination inbox.** Paste the received subject and body into the report.

- [ ] **Step 2: Confirm the spam gate actually gates**

```bash
curl -s -X POST https://ruckuscreative.ruckus-astro.workers.dev/api/contact \
  -d "email=test@example.com&comments=bypass+attempt" -w "\n%{http_code}\n"
```

Expected: **400**, no email delivered. A 200 here means the Turnstile check is not wired and the form is an open relay for spam.

- [ ] **Step 3: Confirm it degrades without JavaScript**

Disable JS and submit. Expected: a server-rendered confirmation, not a raw JSON dump.

- [ ] **Step 4: Commit any fixes**

---

## Task 6: Lighthouse and Core Web Vitals

- [ ] **Step 1: Run against the deployed preview**

```bash
npx lighthouse https://ruckuscreative.ruckus-astro.workers.dev/ \
  --preset=desktop --output=json --output-path=/tmp/lh-home-desktop.json --quiet --chrome-flags="--headless"
npx lighthouse https://ruckuscreative.ruckus-astro.workers.dev/ \
  --output=json --output-path=/tmp/lh-home-mobile.json --quiet --chrome-flags="--headless"
```

Repeat for `/about/`, `/work/heineken/`, `/advertising-is-for-profits/`, and `/contact-ruckus-creative/`.

- [ ] **Step 2: Extract and report the real numbers**

```bash
node -e "for (const f of process.argv.slice(1)) { const r=require(f); console.log(f.split('/').pop(), Object.entries(r.categories).map(([k,v])=>k+'='+Math.round(v.score*100)).join(' '), 'LCP='+r.audits['largest-contentful-paint'].displayValue, 'CLS='+r.audits['cumulative-layout-shift'].displayValue); }" /tmp/lh-*.json
```

Spec targets: LCP under 2.0s mobile, CLS under 0.05, all four categories 95+. **Report the actual numbers whether or not they hit the targets** — these were always stated as guiding targets, not acceptance gates, and an honest miss is more useful than a massaged pass.

- [ ] **Step 3: Compare against the current WordPress site**

Run the same audits against `https://ruckuscreative.com/` so the improvement is stated as a measured delta, not an assertion.

- [ ] **Step 4: Commit the results**

```bash
mkdir -p docs/superpowers/reports
# write the table to docs/superpowers/reports/2026-08-14-lighthouse.md
git add docs/superpowers/reports
git commit -m "docs: record Lighthouse results for the preview deployment"
```

---

## Task 7: Cutover

**Do not begin this task without explicit client approval.** It is the only step that touches live DNS and the only one that is publicly visible.

- [ ] **Step 1: Confirm the pre-cutover checklist**

- [ ] Client has reviewed the homepage and approved the fidelity
- [ ] `npm run fidelity` shows no unexplained flags
- [ ] Form verified end to end, with a real delivered message
- [ ] Lighthouse results reviewed
- [ ] All 39 URLs return 200 and all 11 redirects return 301 on the preview

- [ ] **Step 2: Attach the custom domain**

Add the route to `wrangler.jsonc` and deploy:

```jsonc
"routes": [
  { "pattern": "ruckuscreative.com/*", "zone_name": "ruckuscreative.com" },
  { "pattern": "www.ruckuscreative.com/*", "zone_name": "ruckuscreative.com" }
]
```

> **The MX records must not change.** Attaching a Worker route affects HTTP traffic only. If any tool offers to modify MX, SPF, or DKIM on the root domain, decline — that is their Google Workspace mail.

- [ ] **Step 3: Verify immediately after cutover**

```bash
npm run fidelity -- --preview https://ruckuscreative.com
```

Plus a spot check that mail still flows: send a message to an address on the domain and confirm delivery.

- [ ] **Step 4: Keep rollback available**

The WordPress origin stays untouched and reachable throughout. Rollback is removing the Worker route — a single change, no rebuild. **Do not decommission WordPress in this plan.** Leave it running until the client has lived with the new site for a while.

---

## Definition of done

- [ ] Client has approved the homepage fidelity
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run fidelity` — no unexplained flags
- [ ] A real form submission arrived in the destination inbox
- [ ] A submission without a valid Turnstile token was rejected with 400
- [ ] Lighthouse numbers recorded for 5 pages, mobile and desktop, with the WordPress baseline alongside
- [ ] Cutover done only after explicit approval, with MX untouched and mail confirmed flowing
- [ ] WordPress still running as a rollback path

---

## Deliberately not in this plan

- **Restoring the video autoplay hero.** Documented in the spec as a phase-2 option: because LCP measures the poster, a muted self-hosted MP4 can swap in after the page is interactive at effectively no CWV cost. Worth doing, but after the baseline is measured, not before.
- **Portfolio category grouping.** The original grouped work under 8 categories with one representative item each. There is no usable category data — `data-project-cat` is empty on 13 of 20 items — so grouping would mean inventing which piece belongs where. Needs a mapping from the client.
- **Decommissioning WordPress.** Explicitly out of scope; it is the rollback path.
