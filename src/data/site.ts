// src/data/site.ts
// Single source of truth for business identity. The live WordPress site renders
// three different suite numbers; 300-173 is the client-confirmed correct one
// (2026-08-14). Never copy this data from the live site.

export const site = {
  name: 'Ruckus Creative',
  legalName: 'Ruckus Creative, LLC',
  url: 'https://ruckuscreative.com',
  description: 'Business results through strategic creative. A full-service creative agency that creates results.',
  email: 'info@ruckuscreative.com',
  phone: '714.514.1482',
  phoneE164: '+17145141482',
  address: {
    street: '27525 Puerta Real, Suite 300-173',
    city: 'Mission Viejo',
    region: 'CA',
    postalCode: '92691',
    country: 'US',
  },
  founded: '1993',
  /**
   * Cloudflare Turnstile PUBLIC site key. Safe to commit — the matching secret
   * lives in a Worker secret (TURNSTILE_SECRET_KEY), never here.
   * Empty until the widget is created; the contact form renders without the
   * challenge and /api/contact fails closed with a 503 and the phone number,
   * rather than accepting unverified submissions.
   */
  turnstileSiteKey: '0x4AAAAAAER_mmbPuTjhndlO',
} as const;

/**
 * Main navigation. The first six items target homepage sections; Knowledge
 * is the one standalone-page link the Cinema header adds. Contact is not
 * rendered as its own nav link in the Cinema header — it's reached through
 * the "Start a Ruckus" pill (see `ctaLink` below) — but stays in this list
 * since the mobile slide-out's contact block links back to it too.
 */
export const nav = [
  { label: 'Home', href: '/#home' },
  { label: 'Intro', href: '/#intro' },
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Knowledge', href: '/knowledge/' },
] as const;

/** "Start a Ruckus" pill target, top-right of the fixed header. */
export const ctaLink = { label: 'Start a Ruckus', href: '/#contact' } as const;

/** Footer legal links. */
export const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Terms and Conditions', href: '/terms-and-conditions/' },
] as const;

/**
 * Secondary nav shown beside knowledge posts. The live site renders these in a
 * span_3 sidebar next to the span_9 article column.
 */
export const sidebarLinks = [
  { label: 'Results', href: '/results-based-advertising-branding/' },
  { label: 'Portfolio', href: '/portfolio-ruckus/' },
  { label: 'Capabilities', href: '/strategic-creative-capabilities/' },
  { label: 'Process', href: '/process-ruckus-creative/' },
  { label: 'About', href: '/about/' },
] as const;
