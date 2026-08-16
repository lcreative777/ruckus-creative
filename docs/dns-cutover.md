# Production cutover — ruckuscreative.com

Cut over 2026-08-16. The zone lives in **Elarson@ruckuscreative.com's Account**
(`c0780521925c950ef323a873c907c291`), the same account as the `ruckuscreative`
Worker. Nameservers: `gene`/`jake.ns.cloudflare.com`.

## How it is wired

Two **Worker routes**, declared in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "ruckuscreative.com/*",     "zone_name": "ruckuscreative.com" },
  { "pattern": "www.ruckuscreative.com/*", "zone_name": "ruckuscreative.com" }
]
```

**No DNS record was changed.** The apex A record and the `www` CNAME still point at
Flywheel exactly as before; the routes intercept requests in front of them. WordPress
is still sitting there as the origin, which is what makes the rollback instant.

### Why routes and not `custom_domain: true`

A custom domain insists on managing the hostname's DNS record itself and refuses to
attach while one already exists:

```
Hostname 'ruckuscreative.com' already has externally managed DNS records
(A, CNAME, etc). Delete them first or try a different hostname. [code: 100117]
```

Taking that path would have meant deleting the Flywheel records first — losing the
origin, and with it the ability to roll back by flipping a single switch.

## Rollback

Delete the two entries from `routes` in `wrangler.jsonc`, rebuild, and deploy:

```bash
npm run build && npx wrangler deploy
```

Traffic falls straight back to the Flywheel origin. Nothing needs to be recreated,
because nothing was deleted. The dashboard equivalent is Workers & Pages →
`ruckuscreative` → Settings → Domains & Routes → remove both routes.

For reference, the DNS records the routes sit in front of — these are still live:

| Name | Type | Value | Proxy |
|------|------|-------|-------|
| `ruckuscreative.com` | A | `151.101.66.159` | Proxied |
| `www.ruckuscreative.com` | CNAME | `ruckuscreative.mysites.io` | Proxied |

## Two traps worth remembering

**`workers_dev` is disabled the moment any route is declared.** That silently 404'd
the workers.dev staging URL mid-cutover. `"workers_dev": true` is now set explicitly
in `wrangler.jsonc` to keep staging alive alongside production; don't remove it.

**The adapter generates its own config at build time.** Wrangler deploys
`dist/server/wrangler.json`, not `wrangler.jsonc` directly — it logs
`Using redirected Wrangler configuration`. Editing `wrangler.jsonc` and deploying
without rebuilding first deploys the *previous* config and appears to do nothing.
Always `npm run build` after touching `wrangler.jsonc`.

## Do not touch

These carry live mail and verification for the business. The cutover does not go near
them, and neither should a rollback.

| Name | Type | Value |
|------|------|-------|
| `ruckuscreative.com` | MX | Google Workspace ×5 (`aspmx.l.google.com`, `alt1`–`alt4`) |
| `ruckuscreative.com` | TXT | `v=spf1 a mx include:_spf.google.com  ~all` |
| `ruckuscreative.com` | TXT | `google-site-verification=u_sWu2GOHMw7hBemRAhH32lVkFuq78X_j0JMalw1lQk` |
| `send.ruckuscreative.com` | MX | `feedback-smtp.us-east-1.amazonses.com` (Resend bounces) |
| `send.ruckuscreative.com` | TXT | `v=spf1 include:amazonses.com ~all` |
| `resend._domainkey.send` | TXT | Resend DKIM |
| `flywheel-domain-verification` | TXT | Flywheel — keep while WordPress is the rollback path |

`*.ruckuscreative.com A 151.101.66.159 (proxied)` stays in place, pointing every other
subdomain at Flywheel.

Note that resolver caching makes `dig +short MX send.ruckuscreative.com` look empty for
a while after a change. Query the authoritative server instead:

```bash
dig @gene.ns.cloudflare.com +noall +answer MX send.ruckuscreative.com
```

## Verified after cutover

- 39/39 sitemap URLs → 200 on `https://ruckuscreative.com`
- `www` serves the Astro site; `/contact/` → 301 → `/contact-ruckus-creative/`; unknown paths → 404
- Apex MX still 5 records; root SPF unchanged; Resend MX/SPF/DKIM intact
- workers.dev staging still 200
