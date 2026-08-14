# Open Decisions — raised during Plan 1

Findings from the content migration that need a call from the client before
Plan 2 builds routes on top of them. Recorded 2026-08-13.

---

## 1. The business address is inconsistent across the live site

Three different suite numbers appear on ruckuscreative.com right now:

| Where | Address |
|---|---|
| Homepage | 27525 Puerta Real, **Suite 300-173** |
| Contact page | 27525 Puerta Real, **Suite 100-173** |
| Footer (every page) | 27525 Puerta Real, **Suite 300-1733** |

Two of these are wrong. This is not a migration artifact — it is how the source
site reads today.

**Why it matters:** Plan 2 adds `LocalBusiness` structured data, which the
current site has none of. Publishing an incorrect address in structured data is
worse than publishing none, because search engines treat NAP (name/address/phone)
consistency as a local ranking signal and will cross-check it against other
listings.

**Needed:** the correct suite number. Migration is unblocked either way — the page
copy was carried over verbatim — but the JSON-LD in Plan 2 should not be written
until this is settled.

The phone number is consistent everywhere (714-514-1482) and needs no decision.

---

## 2. `/portfolio-ruckus/` is a stale page that is already broken

The page links to 8 portfolio items. Verified against the live site:

- **4 resolve** — `dos-equis`, `aqua-flo`, `metrex-research`, `future-fins`. They
  use pre-rename `/portfolio/*` URLs that 301 to `/work/*`. The migration now
  rewrites these to `/work/*` directly.
- **4 are dead** — `benchmark-wealth-management`, `buddies-without-boundaries`,
  `coach-net`, `international-window-corp`. All 404 under both `/portfolio/` and
  `/work/`. The migration unwraps these links, so the cards remain but no longer
  point anywhere.
- **16 of the 20 real portfolio items do not appear on this page at all.**

The live portfolio experience is really the homepage `#work` grid, which carries
all 20 items. `/portfolio-ruckus/` looks like an abandoned earlier version.

**Options:**

1. **Rebuild it as a real index of all 20 `/work/` items.** Fixes 4 dead links,
   surfaces 16 items that are currently invisible on it, and gives the 20
   portfolio pages an internal-linking parent — a genuine SEO gain. Departs from
   the current page, but the current page is broken. *Recommended.*
2. **Redirect `/portfolio-ruckus/` → `/#work`** and drop the page. Simplest, and
   honest about the page being superseded. Loses the URL as a ranking target.
3. **Carry it over as-is**, with 4 unlinked dead cards and 16 missing items.
   Faithful to a page that does not work.

**Needed:** which of the three. Blocks nothing in Plan 1; Plan 2 needs it before
building the route.

---

## 3. Minor — duplicate `id="about"` on the homepage

`src/content/pages/home.mdx` carries `id="about"` three times, which is invalid
HTML and means `#about` in the one-page nav resolves to the first match only.
Inherited from the source page. Plan 2's homepage rebuild should reduce it to one;
no client decision needed, just noting it so it is not mistaken for a migration
defect.
