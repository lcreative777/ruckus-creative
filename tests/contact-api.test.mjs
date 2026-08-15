import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The pure helpers live in src/lib/contact.ts precisely so they can be imported
// directly here, without the Astro or Worker runtime.
import { validate, buildEmail } from '../src/lib/contact.ts';

// The route itself is asserted against its source, since importing it would
// pull in the Astro runtime.
const src = readFileSync(new URL('../src/pages/api/contact.ts', import.meta.url), 'utf8');

describe('validate', () => {
  it('rejects a missing email', () => {
    expect(validate({ name: 'Eric', email: '' }).ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(validate({ name: 'Eric', email: 'not-an-email' }).ok).toBe(false);
  });

  it('rejects a missing name', () => {
    expect(validate({ name: '', email: 'a@b.com' }).ok).toBe(false);
  });

  it('accepts a submission with the required fields', () => {
    expect(validate({ name: 'Eric', email: 'a@b.com' }).ok).toBe(true);
  });

  it('trims and preserves the optional fields', () => {
    const r = validate({ name: '  Eric  ', email: 'a@b.com', phone: ' 714 ', message: ' Hi ' });
    expect(r.fields.name).toBe('Eric');
    expect(r.fields.phone).toBe('714');
    expect(r.fields.message).toBe('Hi');
  });

  // reply_to is built from the submitted address, so a newline there could
  // otherwise smuggle extra headers into the outgoing message.
  it('rejects header injection attempts', () => {
    expect(validate({ name: 'Eric', email: 'a@b.com\nbcc: x@y.com' }).ok).toBe(false);
    expect(validate({ name: 'Eric\r\nX: 1', email: 'a@b.com' }).ok).toBe(false);
  });
});

describe('buildEmail', () => {
  it('puts every supplied field in the body', () => {
    const body = buildEmail({ name: 'Eric', email: 'a@b.com', phone: '714', message: 'Hello' });
    expect(body).toContain('Eric');
    expect(body).toContain('a@b.com');
    expect(body).toContain('714');
    expect(body).toContain('Hello');
  });

  it('omits empty fields rather than printing blank labels', () => {
    const body = buildEmail({ name: 'Eric', email: 'a@b.com', phone: '' });
    expect(body).not.toMatch(/Phone:\s*$/m);
    expect(body).not.toContain('Message:');
  });
});

describe('route configuration', () => {
  it('is on-demand rendered', () => {
    expect(src).toMatch(/export const prerender\s*=\s*false/);
  });

  it('verifies the turnstile token server-side', () => {
    expect(src).toContain('challenges.cloudflare.com/turnstile/v0/siteverify');
  });

  // An unconfigured endpoint that still accepts posts is an open spam relay.
  it('fails closed when the turnstile secret is missing', () => {
    expect(src).toMatch(/if \(!turnstileSecret\)/);
    expect(src).toMatch(/503/);
  });

  // Assert against code, not prose — the header comment legitimately explains
  // why the send_email binding is avoided.
  it('never falls back to the send_email binding', () => {
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toContain('cloudflare:email');
    expect(code).not.toMatch(/env\.\s*send_email|EMAIL\.send\(/);
  });

  it('sends through Resend', () => {
    expect(src).toContain('https://api.resend.com/emails');
    expect(src).toMatch(/RESEND_API_KEY/);
  });
});
