// src/pages/api/contact.ts
//
// The single on-demand route on an otherwise static site.
//
// Cloudflare's native send_email binding is deliberately NOT used: enabling
// Email Routing rewrites the zone's MX records, and ruckuscreative.com receives
// mail through Google Workspace. Sending via Resend from a dedicated subdomain
// leaves those records untouched.
//
// Required Worker secrets (npx wrangler secret put <NAME>):
//   RESEND_API_KEY        — Resend API key
//   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret (server side only)
// Optional:
//   CONTACT_FROM          — verified Resend sender, defaults to the subdomain below
//   CONTACT_TO            — recipient, defaults to site.email
import type { APIRoute } from 'astro';
import { site } from '../../data/site';
import { validate, buildEmail } from '../../lib/contact';
// Astro.locals.runtime.env was removed; secrets come from the Workers runtime
// module now. This import only resolves inside the Worker, which is fine —
// this route is the one on-demand endpoint and never prerendered.
import { env } from 'cloudflare:workers';

export const prerender = false;

const DEFAULT_FROM = 'Ruckus Creative <website@send.ruckuscreative.com>';
const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const clean = (v: FormDataEntryValue | null | undefined): string =>
  typeof v === 'string' ? v.trim() : '';

/** Verify the Turnstile token server-side. Never trust a client-side result. */
async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const wantsJson = (request: Request) =>
  (request.headers.get('accept') ?? '').includes('application/json') ||
  (request.headers.get('x-requested-with') ?? '') === 'fetch';

function respond(request: Request, status: number, message: string, errors: string[] = []) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok: status === 200, message, errors }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
  // No-JS path: bounce back to the form with a state in the query string.
  const target = status === 200 ? '/#contact-sent' : '/#contact-error';
  return new Response(null, { status: 303, headers: { location: target } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const secrets = env as unknown as Record<string, string | undefined>;

  const form = await request.formData().catch(() => null);
  if (!form) return respond(request, 400, 'That submission could not be read.');

  const { ok, fields, errors } = validate(Object.fromEntries(form));
  if (!ok) return respond(request, 400, 'Please check the form.', errors);

  // Spam gate. A missing secret must fail closed — an open endpoint would be
  // harvested within days.
  const turnstileSecret = secrets.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    console.error('[contact] TURNSTILE_SECRET_KEY is not set; refusing to accept submissions');
    return respond(request, 503, 'The form is not configured yet. Please call 714.514.1482.');
  }
  const passed = await verifyTurnstile(
    clean(form.get('cf-turnstile-response')), turnstileSecret, clientAddress,
  );
  if (!passed) return respond(request, 400, 'That verification did not pass. Please try again.');

  const apiKey = secrets.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not set');
    return respond(request, 503, 'The form is not configured yet. Please call 714.514.1482.');
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: secrets.CONTACT_FROM ?? DEFAULT_FROM,
        to: [secrets.CONTACT_TO ?? site.email],
        reply_to: fields.email,
        subject: `Website enquiry — ${fields.name}`,
        text: buildEmail(fields),
      }),
    });

    if (!res.ok) {
      // Log loudly. A silently swallowed send is a lost lead, which is worse
      // than showing the visitor an error and a phone number.
      console.error('[contact] resend rejected the send', res.status, await res.text());
      return respond(request, 502, `Sorry — that did not send. Please call ${site.phone}.`);
    }
  } catch (err) {
    console.error('[contact] resend request failed', err);
    return respond(request, 502, `Sorry — that did not send. Please call ${site.phone}.`);
  }

  return respond(request, 200, 'Message sent. We will get back with you immediately.');
};
