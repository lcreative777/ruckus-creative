# Decisions — raised during Plan 1

Findings from the content migration and the Cloudflare prerequisite check.
Recorded 2026-08-13, resolved 2026-08-14 except where noted.

---

## 1. Business address — RESOLVED

Three different suite numbers appeared across the live site (homepage 300-173,
contact page 100-173, footer 300-1733). Client confirmed the correct address:

> **Ruckus Creative, LLC**
> 27525 Puerta Real, Suite 300-173
> Mission Viejo, CA 92691
> 714.514.1482

**This is the single source of truth** for the footer, contact page, homepage, and
the `LocalBusiness` structured data. The migrated page copy still carries the two
incorrect variants and must be corrected in Plan 2 wherever the address is
rendered — do not simply pass through the migrated text.

---

## 2. `/portfolio-ruckus/` — RESOLVED

**Rebuild as a proper index of all 20 portfolio pieces.** Keep the existing URL
`/portfolio-ruckus/` so the page's accumulated equity is retained.

Rationale (client): the page is already broken with 4 of 8 links 404ing, it omits
16 of 20 items, and the 20 detail pages currently have no listing parent for
internal linking. A real index fixes the dead links and strengthens site
architecture in one move.

Plan 2 builds this from `getCollection('work')` rather than the migrated body, so
it stays complete automatically. The migrated `portfolio-ruckus.mdx` body becomes
intro copy only; its 8 hardcoded cards are discarded.

---

## 3. Contact form backend — NEEDS A NEW DECISION

The original plan used Cloudflare's native `send_email` binding. **The
prerequisite check has ruled this out as originally designed.**

Verified 2026-08-14 against account `c0780521925c950ef323a873c907c291`:

| Check | Result |
|---|---|
| `ruckuscreative.com` zone on target account | ✅ yes, id `e5b7473f2766d25e0ab54a939e527786`, active |
| Email Routing enabled | ❌ no — `status: unconfigured` |
| Verified destination addresses | ❌ none |
| **Existing MX records** | **Google Workspace** (`aspmx.l.google.com`) |
| Existing SPF | `v=spf1 a mx include:_spf.google.com ~all` |

**Enabling Cloudflare Email Routing rewrites the zone's MX records and would break
all inbound Google Workspace mail for the domain.** That is not an acceptable
trade for a contact form. Do not enable it.

### Options

1. **Transactional email API from the Worker** — Resend, Postmark, or similar.
   The Worker validates the submission, verifies the Turnstile token, and POSTs to
   the provider. **No DNS changes to the existing mail setup**; sending happens on
   a subdomain (e.g. `send.ruckuscreative.com`) or the provider's own domain, so
   Google Workspace is untouched. Resend's free tier is 3,000 emails/month, far
   beyond what this form will see. *Recommended.*

2. **Account-level destination address without zone routing** — destination
   addresses are an account-scoped resource, so it *may* be possible to verify one
   without enabling Email Routing on the zone. Unconfirmed, and it would leave the
   form dependent on undocumented behavior. Would need testing before committing.

3. **Third-party form service** — Formspree or Web3Forms. Nothing to maintain, no
   DNS impact, but free tiers cap around 50–250 submissions/month and submissions
   live on someone else's server.

Turnstile is unaffected by this decision and remains the spam control in all three
options.

**Blocks:** Plan 3 only. Plans 1 and 2 proceed regardless.

---

## 4. Minor — duplicate `id="about"` on the homepage

`src/content/pages/home.mdx` carries `id="about"` three times, which is invalid
HTML and means the `#about` nav link resolves to the first match only. Inherited
from the source page. Plan 2's homepage rebuild should reduce it to one. No client
decision needed.
